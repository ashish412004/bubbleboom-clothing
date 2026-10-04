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
      if (data && data.length > 0) {
        ordersList = data
      }
    } catch {
      // Fallback to MOCK_ORDERS
    }
  }

  // Filter in-memory if using mock
  let orders = ordersList
  if (status && status !== 'all') {
    orders = orders.filter((o) => o.status === status)
  }
  if (payment && payment !== 'all') {
    orders = orders.filter((o) => o.payment_method?.toLowerCase() === payment.toLowerCase())
  }
  if (search) {
    const s = search.toLowerCase()
    orders = orders.filter((o) =>
      o.order_number?.toLowerCase().includes(s) ||
      o.guest_email?.toLowerCase().includes(s)
    )
  }

  const STATUS_TABS = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Order Management</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">Review shipments, assign tracking AWBs, and update fulfillment states.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-300 pb-3">
        {STATUS_TABS.map((tab) => {
          const isActive = (status || 'all') === tab.key
          return (
            <Link
              key={tab.key}
              href={`/admin/orders?status=${tab.key}${payment ? `&payment=${payment}` : ''}`}
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

      {/* Orders Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Order Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Placed Date</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Fulfillment</th>
                <th className="p-3">Total</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders && orders.length > 0 ? (
                orders.map((ord) => {
                  const addr = ord.shipping_address as any

                  return (
                    <tr key={ord.id} className="hover:bg-neutral-50">
                      <td className="p-3 font-bold text-black">{ord.order_number}</td>
                      <td className="p-3">
                        <span className="font-bold block text-neutral-900">{addr?.full_name || 'Guest'}</span>
                        <span className="text-[10px] text-neutral-500">{ord.guest_phone || addr?.phone}</span>
                      </td>
                      <td className="p-3 text-neutral-500">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <span className="font-bold uppercase block">{ord.payment_method}</span>
                        <span className={`text-[10px] uppercase font-bold ${
                          ord.payment_status === 'paid' ? 'text-black' : 'text-neutral-500'
                        }`}>
                          {ord.payment_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-black text-white text-[10px] uppercase px-2 py-0.5 font-bold">
                          {ord.status}
                        </span>
                        {ord.tracking_number && (
                          <span className="block text-[10px] text-neutral-500 mt-0.5">
                            AWB: {ord.tracking_number}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-black text-black">
                        ₹{ord.total_amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right">
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
