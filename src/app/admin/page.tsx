import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { MOCK_ORDERS } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  let allOrders: any[] = []
  let lowStockVariants: any[] = []
  let pendingReturnsCount = 0

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()

      // 1. Fetch Orders metrics
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, payment_status, created_at, guest_email, shipping_address')
        .order('created_at', { ascending: false })

      if (orders) {
        allOrders = orders
      }

      // 2. Fetch Low Stock Variants (stock <= 5) for active products only
      const { data: variants } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          color,
          size,
          stock,
          is_active,
          product:products (id, name, slug, is_active)
        `)
        .eq('is_active', true)
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(8)

      if (variants) {
        lowStockVariants = variants.filter((v: any) => v.product?.is_active)
      }

      // 3. Pending returns count
      const { count } = await supabase
        .from('returns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'requested')

      if (count !== null) {
        pendingReturnsCount = count
      }
    } catch {
      // Clean zero fallback
    }
  }

  const paidOrders = allOrders.filter((o) => o.payment_status === 'paid')
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const totalOrdersCount = allOrders.length
  const aov = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight break-words">Operations Dashboard</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">Real-time revenue, order queue, and inventory alerts.</p>
      </div>

      {/* KPI Stats Cards: 1 column on narrow mobile, 2 on sm, 4 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border-2 border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-0">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-mono uppercase font-bold truncate">Total Paid Revenue</span>
            <DollarSign className="w-4 h-4 text-black shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono break-all">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">Authoritative captured payments</span>
        </div>

        <div className="border-2 border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-0">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-mono uppercase font-bold truncate">Total Orders</span>
            <Package className="w-4 h-4 text-black shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono">{totalOrdersCount}</div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
            {allOrders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length} awaiting fulfillment
          </span>
        </div>

        <div className="border-2 border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-0">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-mono uppercase font-bold truncate">Average Order Value</span>
            <TrendingUp className="w-4 h-4 text-black shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono break-all">₹{aov.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">Net revenue / completed orders</span>
        </div>

        <div className="border-2 border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-0">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-mono uppercase font-bold truncate">Pending Return Audits</span>
            <AlertTriangle className="w-4 h-4 text-black shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono">{pendingReturnsCount || 0}</div>
          <Link
            href="/admin/returns"
            className="text-[10px] font-mono uppercase underline text-black font-bold mt-1 inline-block hover:text-neutral-600 min-h-[32px] sm:min-h-0 flex items-center"
          >
            Review return claims →
          </Link>
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Orders (2 Columns) */}
        <div className="lg:col-span-2 border border-black bg-white p-4 sm:p-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-neutral-200 gap-2">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">Recent Order Pipeline</h2>
              <p className="text-xs text-neutral-500 font-mono">Latest checkouts requiring packing &amp; shipment</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600 self-start sm:self-auto min-h-[36px] flex items-center"
            >
              All Orders ({allOrders.length})
            </Link>
          </div>

          {allOrders.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs font-mono min-w-[550px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase">
                    <th className="py-2.5">Order</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Payment</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {allOrders.slice(0, 6).map((ord) => (
                    <tr key={ord.id} className="hover:bg-neutral-50">
                      <td className="py-3 font-bold text-black">{ord.order_number}</td>
                      <td className="py-3 text-neutral-500">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3">
                        <span className="bg-black text-white text-[10px] px-2 py-0.5 uppercase font-bold">
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 uppercase text-neutral-600 font-bold">{ord.payment_status}</td>
                      <td className="py-3 font-black text-black">₹{ord.total_amount?.toLocaleString('en-IN')}</td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="inline-flex items-center gap-1 font-bold uppercase underline hover:text-neutral-600"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-neutral-500 font-mono">
              No orders recorded yet. Place a test order from the storefront.
            </div>
          )}
        </div>

        {/* Low Stock Watchlist (1 Column) */}
        <div className="border border-black bg-white p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">Low Stock Alert</h2>
              <p className="text-xs text-neutral-500 font-mono">Variants at or below 5 units</p>
            </div>
            <Link
              href="/admin/inventory"
              className="text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600"
            >
              Inventory
            </Link>
          </div>

          {lowStockVariants && lowStockVariants.length > 0 ? (
            <div className="space-y-3">
              {lowStockVariants.map((v: any) => (
                <div key={v.id} className="p-3 bg-[#F8F8F6] border border-neutral-300 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold uppercase block line-clamp-1">{v.product?.name}</span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {v.color} / {v.size} • SKU: {v.sku}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-black text-white text-xs font-mono font-bold px-2 py-0.5">
                      {v.stock} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-neutral-500 font-mono">
              All active product variants are adequately stocked.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
