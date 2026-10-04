import { createServiceClient } from '@/lib/supabase/server'
import { getOrderById } from '@/lib/orders'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminOrderManager } from './admin-order-manager'

export const dynamic = 'force-dynamic'

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params
  const order = await getOrderById(id)

  if (!order) {
    notFound()
  }

  const shippingAddr = order.shipping_address as any
  const items = ((order as any).order_items as any[]) || []
  const payments = ((order as any).payments as any[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>
        <span className="text-xs font-mono text-neutral-500">Internal Order ID: {order.id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Summary & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-black bg-white p-6">
            <div className="flex justify-between items-start pb-4 border-b border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">
                  Order Reference
                </span>
                <h2 className="text-xl font-black font-mono">{order.order_number}</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Placed on {new Date(order.created_at).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="text-right">
                <span className="bg-black text-white text-xs uppercase font-mono px-3 py-1 font-bold">
                  {order.status}
                </span>
                <p className="text-xs font-mono text-neutral-500 mt-1">
                  {order.payment_method.toUpperCase()} ({order.payment_status.toUpperCase()})
                </p>
              </div>
            </div>

            {/* Line items */}
            <div className="py-4">
              <h3 className="text-xs uppercase font-mono font-bold tracking-widest mb-3">Items Snapshot</h3>
              <div className="divide-y divide-neutral-200">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold uppercase text-black">{item.product_name}</span>
                      <span className="text-neutral-500 font-mono ml-2">
                        ({item.variant_info?.color} / {item.variant_info?.size})
                      </span>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        SKU: {item.variant_info?.sku} • Quantity: {item.quantity} × ₹{item.selling_price?.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="font-mono font-bold">
                      ₹{item.total_amount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="pt-4 border-t border-neutral-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Discount</span>
                  <span>-₹{order.discount_amount?.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Shipping Fee</span>
                <span>₹{order.shipping_amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-black flex justify-between text-base font-black">
                <span>Total Amount</span>
                <span>₹{order.total_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Customer & Shipping info */}
          <div className="border border-black bg-white p-6 text-xs">
            <h3 className="text-xs uppercase font-mono font-bold tracking-widest mb-3">Shipping Destination</h3>
            <p className="font-bold text-sm">{shippingAddr?.full_name}</p>
            <p>{shippingAddr?.address_line1}</p>
            {shippingAddr?.address_line2 && <p>{shippingAddr?.address_line2}</p>}
            <p>{shippingAddr?.city}, {shippingAddr?.state} — {shippingAddr?.pin_code}</p>
            <p className="font-mono text-neutral-500 mt-2">Phone: {shippingAddr?.phone || order.guest_phone}</p>
            <p className="font-mono text-neutral-500">Email: {order.guest_email || 'Not provided'}</p>
          </div>
        </div>

        {/* Right 1 Col: Operations Controls */}
        <div className="lg:col-span-1">
          <AdminOrderManager order={order} />
        </div>
      </div>
    </div>
  )
}
