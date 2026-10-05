import { createServiceClient } from '@/lib/supabase/server'
import { getOrderById } from '@/lib/orders'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, CreditCard } from 'lucide-react'
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase font-bold hover:underline min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/orders/${order.order_number}/invoice`}
            download
            className="inline-flex items-center gap-1.5 bg-black text-white hover:bg-neutral-800 px-3 py-2 text-xs font-mono uppercase font-bold transition-colors cursor-pointer min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Invoice PDF</span>
          </a>
          <span className="text-xs font-mono text-neutral-500 break-all">Internal ID: {order.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left 2 Cols: Order Summary & Line Items */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="border border-black bg-white p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-4 border-b border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">
                  Order Reference
                </span>
                <h2 className="text-xl font-black font-mono break-all">{order.order_number}</h2>
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
                    <div className="flex items-center gap-3">
                      {item.variant_info?.image_url && (
                        <div className="relative w-10 h-12 bg-neutral-100 border shrink-0 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.variant_info.image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <span className="font-bold uppercase text-black">{item.product_name}</span>
                        <span className="text-neutral-500 font-mono ml-2">
                          ({item.variant_info?.color} / {item.variant_info?.size})
                        </span>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          SKU: {item.variant_info?.sku} • Quantity: {item.quantity} × ₹{item.selling_price?.toLocaleString('en-IN')}
                        </p>
                      </div>
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
          <div className="border border-black bg-white p-4 sm:p-6 text-xs">
            <h3 className="text-xs uppercase font-mono font-bold tracking-widest mb-3">Shipping Destination</h3>
            <p className="font-bold text-sm">{shippingAddr?.full_name}</p>
            <p>{shippingAddr?.address_line1}</p>
            {shippingAddr?.address_line2 && <p>{shippingAddr?.address_line2}</p>}
            <p>{shippingAddr?.city}, {shippingAddr?.state} — {shippingAddr?.pin_code}</p>
            <p className="font-mono text-neutral-500 mt-2">Phone: {shippingAddr?.phone || order.guest_phone}</p>
            <p className="font-mono text-neutral-500">Email: {order.guest_email || 'Not provided'}</p>
          </div>

          {/* Payment & Gateway References */}
          <div className="border border-black bg-white p-4 sm:p-6 text-xs">
            <h3 className="text-xs uppercase font-mono font-bold tracking-widest mb-3 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment Gateway Records &amp; Attempts</span>
            </h3>
            {payments.length === 0 ? (
              <p className="text-neutral-500 font-mono">
                No external payment attempts recorded yet. Method: {order.payment_method.toUpperCase()}
              </p>
            ) : (
              <div className="divide-y divide-neutral-200">
                {payments.map((p) => (
                  <div key={p.id} className="py-2.5 space-y-1 font-mono">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="font-bold break-all">
                        Cashfree Order: {p.cashfree_order_id || order.order_number}
                      </span>
                      <span
                        className={`self-start sm:self-auto px-2 py-0.5 text-[10px] uppercase font-bold ${
                          p.status === 'paid'
                            ? 'bg-black text-white'
                            : p.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    {p.cf_payment_id && (
                      <p className="text-neutral-600 break-all">
                        Cashfree Payment ID: <span className="text-black font-bold">{p.cf_payment_id}</span>
                      </p>
                    )}
                    <p className="text-neutral-500 text-[11px]">
                      Amount: ₹{p.amount} {p.currency || 'INR'} • Updated: {new Date(p.updated_at || p.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
