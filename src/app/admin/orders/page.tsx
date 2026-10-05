import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Search, Filter } from 'lucide-react'
import { getDevOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'

interface AdminOrdersPageProps {
  searchParams: Promise<{
    status?: string
    payment?: string
    search?: string
  }>
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { status, payment, search } = await searchParams
  let ordersList: any[] = getDevOrders()

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()

      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (status && status !== 'all') {
        // @ts-ignore
        query = query.eq('status', status)
      }

      if (payment && payment !== 'all') {
        // @ts-ignore
        query = query.eq('payment_method', payment)
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%,guest_email.ilike.%${search}%,guest_phone.ilike.%${search}%`)
      }

      const { data } = await query
      if (data) {
        ordersList = data
      }
    } catch {
      // Fallback to MOCK_ORDERS
    }
  }

  // Filter in-memory if using mock
  let orders = ordersList
  if (status && status !== 'all') {
    if (status === 'unfulfilled') {
      orders = orders.filter((o) => ['pending', 'confirmed', 'unfulfilled'].includes(o.status))
    } else if (status === 'exception_returns') {
      orders = orders.filter((o) => ['delivery_exception', 'return_to_origin', 'return_requested', 'returned'].includes(o.status))
    } else {
      orders = orders.filter((o) => o.status === status)
    }
  }

  if (payment && payment !== 'all') {
    if (payment === 'paid') {
      orders = orders.filter((o) => o.payment_status === 'paid')
    } else if (payment === 'pending') {
      orders = orders.filter((o) => o.payment_status === 'pending')
    } else if (payment === 'cod') {
      orders = orders.filter((o) => o.payment_method === 'cod')
    } else if (payment === 'refunded') {
      orders = orders.filter((o) => o.payment_status === 'refunded')
    } else {
      orders = orders.filter((o) => o.payment_method?.toLowerCase() === payment.toLowerCase() || o.payment_status?.toLowerCase() === payment.toLowerCase())
    }
  }

  if (search) {
    const s = search.toLowerCase()
    orders = orders.filter((o) => {
      const addr = o.shipping_address as any
      return (
        o.order_number?.toLowerCase().includes(s) ||
        o.guest_email?.toLowerCase().includes(s) ||
        o.guest_phone?.includes(s) ||
        addr?.phone?.includes(s) ||
        addr?.full_name?.toLowerCase().includes(s) ||
        o.tracking_number?.toLowerCase().includes(s)
      )
    })
  }

  const FULFILLMENT_TABS = [
    { key: 'all', label: 'All Orders' },
    { key: 'unfulfilled', label: 'Unfulfilled / New' },
    { key: 'packed', label: 'Packed' },
    { key: 'pickup_scheduled', label: 'Pickup Scheduled' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'exception_returns', label: 'Exceptions & Returns' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const PAYMENT_FILTERS = [
    { key: 'all', label: 'All Payment States' },
    { key: 'paid', label: 'Paid Online' },
    { key: 'cod', label: 'Cash on Delivery (COD)' },
    { key: 'pending', label: 'Pending Payment' },
    { key: 'refunded', label: 'Refunded' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Order Fulfilment &amp; Logistics</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Manual courier tracking, AWB waybill assignment, and delivery lifecycle management.
          </p>
        </div>
      </div>

      {/* Search and Payment Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#F8F8F6] p-4 border border-black">
        <form method="GET" action="/admin/orders" className="flex-1 flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {payment && <input type="hidden" name="payment" value={payment} />}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search by order number, customer name, phone, or AWB..."
              className="w-full bg-white border border-neutral-300 pl-9 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-black"
            />
          </div>
          <button
            type="submit"
            className="bg-black text-white px-4 py-1.5 text-xs font-mono uppercase font-bold hover:bg-neutral-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-neutral-600 uppercase font-bold flex items-center gap-1">
            <Filter className="w-3 h-3" /> Payment:
          </span>
          <div className="flex flex-wrap gap-1">
            {PAYMENT_FILTERS.map((pf) => {
              const isSelected = (payment || 'all') === pf.key
              return (
                <Link
                  key={pf.key}
                  href={`/admin/orders?payment=${pf.key}${status ? `&status=${status}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                    isSelected
                      ? 'bg-black text-white font-bold'
                      : 'bg-white border border-neutral-300 text-neutral-700 hover:border-black'
                  }`}
                >
                  {pf.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fulfillment State Machine Tabs */}
      <div>
        <div className="text-[11px] uppercase font-mono font-bold text-neutral-500 mb-2">
          Fulfilment Stage:
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-neutral-300 pb-3">
          {FULFILLMENT_TABS.map((tab) => {
            const isActive = (status || 'all') === tab.key
            return (
              <Link
                key={tab.key}
                href={`/admin/orders?status=${tab.key}${payment ? `&payment=${payment}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-black text-white font-bold'
                    : 'bg-white border border-neutral-300 text-neutral-600 hover:border-black hover:text-black'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Order Number</th>
                <th className="p-3">Recipient &amp; Delivery Address</th>
                <th className="p-3">Payment Status</th>
                <th className="p-3">Fulfilment Status</th>
                <th className="p-3">Carrier / Waybill</th>
                <th className="p-3">Amount</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders && orders.length > 0 ? (
                orders.map((ord) => {
                  const addr = ord.shipping_address as any
                  const items = ord.order_items || []
                  const isPaid = ord.payment_status === 'paid'
                  const isCod = ord.payment_method === 'cod'

                  return (
                    <tr key={ord.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-3 align-top font-bold text-black">
                        <div>{ord.order_number}</div>
                        <div className="text-[10px] text-neutral-500 font-normal mt-0.5">
                          {new Date(ord.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="p-3 align-top max-w-[220px]">
                        <span className="font-bold block text-neutral-900">{addr?.full_name || 'Guest'}</span>
                        <span className="text-[11px] text-neutral-600 block">{ord.guest_phone || addr?.phone}</span>
                        <span className="text-[10px] text-neutral-500 block truncate">
                          {addr?.city ? `${addr.city}, ${addr.state || ''} — ${addr.pin_code || ''}` : 'Address Pending'}
                        </span>
                      </td>

                      <td className="p-3 align-top">
                        <span className="font-bold uppercase block">{ord.payment_method}</span>
                        <span className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 mt-0.5 ${
                          isPaid
                            ? 'bg-neutral-100 text-black border border-black'
                            : isCod
                            ? 'bg-neutral-200 text-neutral-800'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {ord.payment_status}
                        </span>
                      </td>

                      <td className="p-3 align-top">
                        <span className="bg-black text-white text-[10px] uppercase px-2 py-0.5 font-bold tracking-wider inline-block">
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-3 align-top">
                        {ord.tracking_number ? (
                          <div>
                            <span className="font-bold block uppercase text-neutral-900">{ord.carrier || 'Courier'}</span>
                            <span className="text-[10px] font-mono text-neutral-600 block">AWB: {ord.tracking_number}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-mono italic">AWB Unassigned</span>
                        )}
                      </td>

                      <td className="p-3 align-top font-black text-black">
                        ₹{ord.total_amount?.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 align-top text-right">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="inline-flex items-center gap-1 bg-black text-white px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                    No orders match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
