import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrderById } from '@/lib/orders'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { OrderActions } from './order-actions'
import { CheckCircle2, Package, Truck, Clock, ShieldCheck, ArrowLeft } from 'lucide-react'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

const TIMELINE_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'packed', label: 'Packed & Dispatched', icon: Package },
  { key: 'shipped', label: 'In Transit', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Clock },
  { key: 'delivered', label: 'Delivered', icon: ShieldCheck },
]

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/login?next=/account/orders/${id}`)
  }

  const order = await getOrderById(id)

  if (!order) {
    notFound()
  }

  // Verify ownership or admin
  const userIsAdmin = await isAdmin(user.id)
  if (order.user_id && order.user_id !== user.id && !userIsAdmin) {
    redirect('/account/orders')
  }

  const shippingAddr = order.shipping_address as any
  const items = ((order as any).order_items as any[]) || []

  const statusProgression = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']
  const currentStatusIdx = statusProgression.indexOf(order.status)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Back Link */}
          <div className="mb-6 flex items-center justify-between print:hidden">
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Orders</span>
            </Link>

            <span className="text-xs font-mono text-neutral-500">
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Printable Invoice Header (Visible in Print & Screen) */}
          <div className="border-2 border-black p-6 sm:p-8 bg-white mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-black gap-4">
              <div>
                <div className="text-2xl font-black uppercase tracking-tighter">BUBBLE BOOM</div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 mt-1">Official Tax Invoice &amp; Receipt</div>
                <div className="text-xs text-neutral-600 mt-2 font-mono">
                  Order Reference: <span className="font-bold text-black">{order.order_number}</span>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-block bg-black text-white text-xs font-mono uppercase px-3 py-1 font-bold">
                  Status: {order.status.replace(/_/g, ' ')}
                </span>
                <div className="text-xs text-neutral-600 mt-2 font-mono">
                  Payment: {order.payment_method.toUpperCase()} ({order.payment_status.toUpperCase()})
                </div>
              </div>
            </div>

            {/* Tracking Progress Bar (Screen only) */}
            <div className="py-8 border-b border-neutral-200 print:hidden">
              <h3 className="text-xs uppercase font-mono tracking-widest font-bold mb-6">Delivery Progress</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {TIMELINE_STEPS.map((step) => {
                  const stepIdx = statusProgression.indexOf(step.key)
                  const isDone = currentStatusIdx >= stepIdx && order.status !== 'cancelled'
                  const Icon = step.icon

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center mb-2 ${
                          isDone ? 'bg-black text-white' : 'bg-white text-neutral-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-tight ${isDone ? 'text-black' : 'text-neutral-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {order.tracking_number && (
                <div className="mt-6 p-3 bg-[#F8F8F6] border border-black flex flex-col sm:flex-row justify-between text-xs font-mono">
                  <span>Logistics Carrier: <strong>{order.carrier || 'Standard Express'}</strong></span>
                  <span>AWB Tracking: <strong>{order.tracking_number}</strong></span>
                </div>
              )}
            </div>

            {/* Items Grid */}
            <div className="py-6 border-b border-neutral-200">
              <h3 className="text-xs uppercase font-mono tracking-widest font-bold mb-4">Ordered Items</h3>
              <div className="divide-y divide-neutral-200">
                {items.map((item) => {
                  const variantInfo = (item.variant_info as any) || {}
                  const img = item.variant?.product?.images?.[0]?.image_url

                  return (
                    <div key={item.id} className="py-4 flex gap-4 items-center">
                      {img && (
                        <div className="relative w-16 h-20 bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden print:hidden">
                          <Image src={img} alt={item.product_name} fill className="object-cover" />
                        </div>
                      )}

                      <div className="flex-1">
                        <h4 className="text-sm font-bold uppercase">{item.product_name}</h4>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">
                          Size: {variantInfo.size || 'Standard'} | Color: {variantInfo.color || 'Standard'} {variantInfo.sku ? `| SKU: ${variantInfo.sku}` : ''}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          ₹{item.selling_price?.toLocaleString('en-IN')} × {item.quantity}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-sm">
                          ₹{item.total_amount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Addresses and Summary Two-Column */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Shipping Address */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block mb-1">
                    Delivery Address
                  </span>
                  <p className="font-bold text-sm text-black">{shippingAddr?.full_name}</p>
                  <p className="text-neutral-700 mt-0.5">{shippingAddr?.address_line1}</p>
                  {shippingAddr?.address_line2 && <p className="text-neutral-700">{shippingAddr?.address_line2}</p>}
                  <p className="text-neutral-700">
                    {shippingAddr?.city}, {shippingAddr?.state} — {shippingAddr?.pin_code}
                  </p>
                  <p className="text-neutral-700 mt-1 font-mono">Contact: {shippingAddr?.phone}</p>
                </div>

                <div className="pt-4 border-t border-neutral-200 print:hidden">
                  <OrderActions
                    orderId={order.id}
                    orderNumber={order.order_number}
                    status={order.status}
                    items={items.map((i) => ({ id: i.id, product_name: i.product_name, quantity: i.quantity }))}
                  />
                </div>
              </div>

              {/* Price Calculations */}
              <div className="bg-[#F8F8F6] p-5 border border-black space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Coupon Discount</span>
                    <span>-₹{order.discount_amount?.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-600">Shipping</span>
                  <span>{order.shipping_amount === 0 ? 'FREE' : `₹${order.shipping_amount?.toLocaleString('en-IN')}`}</span>
                </div>
                <div className="pt-3 border-t-2 border-black flex justify-between text-base font-black font-mono">
                  <span className="uppercase">Total Paid</span>
                  <span>₹{order.total_amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
