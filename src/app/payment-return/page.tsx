import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getOrderById } from '@/lib/orders'
import { getPaymentStatus } from '@/lib/payments/cashfree'
import { confirmStockReservation } from '@/lib/inventory'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Clock, ArrowRight, Package, MapPin } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface PaymentReturnProps {
  searchParams: Promise<{
    order_id?: string
    session_id?: string
    method?: string
  }>
}

export default async function PaymentReturnPage({ searchParams }: PaymentReturnProps) {
  const params = await searchParams
  const orderNumber = params.order_id

  if (!orderNumber) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-black">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center">
          <AlertCircle size={40} className="mx-auto text-black mb-4" />
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">Order Reference Missing</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6">No order identifier was received from the payment gateway.</p>
          <Link href="/shop" className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold">
            Return to Store
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  // 1. Fetch internal order
  const order = await getOrderById(orderNumber)
  if (!order) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-black">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center">
          <AlertCircle size={40} className="mx-auto text-black mb-4" />
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">Order Not Found</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            We could not locate order &quot;{orderNumber}&quot;. If money was deducted, our webhook reconciliation will update it within 10 minutes.
          </p>
          <Link href="/track-order" className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold">
            Track Order
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  let isVerifiedPaid = order.payment_status === 'paid'
  let isCod = order.payment_method === 'cod'
  let isPending = order.payment_status === 'pending' && !isCod
  let isFailed = order.payment_status === 'failed'

  // 2. If online and not yet marked paid, verify directly with Cashfree
  if (!isCod && !isVerifiedPaid) {
    try {
      const cfStatus = await getPaymentStatus(order.order_number)
      if (cfStatus && !('error' in cfStatus)) {
        if (cfStatus.order_status === 'PAID') {
          // Authoritative Cashfree API reports PAID
          const supabase = await createServiceClient()
          await supabase
            .from('orders')
            .update({
              status: 'confirmed',
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id)

          await confirmStockReservation(order.id)
          isVerifiedPaid = true
          isPending = false
        } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(cfStatus.order_status)) {
          isFailed = true
          isPending = false
        }
      }
    } catch (err) {
      console.error('Error verifying payment status on return page:', err)
    }
  }

  const shippingAddr = order.shipping_address as any

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full">
        {/* Status Header */}
        <div className="text-center pb-8 border-b border-neutral-200">
          {isVerifiedPaid ? (
            <>
              <CheckCircle2 size={48} className="mx-auto text-black mb-3" />
              <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
                Payment Successful &amp; Order Confirmed
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                Thank you for wearing the boom! Your order has been placed and is being prepped for dispatch.
              </p>
            </>
          ) : isCod ? (
            <>
              <CheckCircle2 size={48} className="mx-auto text-black mb-3" />
              <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
                Cash on Delivery Order Placed
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                Your order is confirmed. Please keep ₹{order.total_amount} ready in cash or UPI upon delivery.
              </p>
            </>
          ) : isFailed ? (
            <>
              <AlertCircle size={48} className="mx-auto text-black mb-3" />
              <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
                Payment Incomplete or Cancelled
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                Your payment attempt did not complete. Your items are held for 15 minutes before stock is released.
              </p>
            </>
          ) : (
            <>
              <Clock size={48} className="mx-auto text-black mb-3" />
              <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
                Verifying Payment Status...
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                We are awaiting confirmation from your bank or UPI app. You may refresh this page safely.
              </p>
            </>
          )}

          <div className="mt-4 inline-flex items-center space-x-2 bg-[#F8F8F6] border border-neutral-200 px-4 py-1.5 text-xs font-mono font-bold">
            <span>ORDER NUMBER:</span>
            <span className="text-black">{order.order_number}</span>
          </div>
        </div>

        {/* Order Details & Summary */}
        <div className="py-8 space-y-8">
          {/* Order Items */}
          <div>
            <h3 className="text-xs uppercase tracking-widest font-extrabold mb-4 flex items-center">
              <Package size={14} className="mr-2" />
              Order Items Snapshot
            </h3>
            <div className="border border-neutral-200 divide-y divide-neutral-200">
              {(order as any).order_items?.map((item: any) => (
                <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold">{item.product_name}</p>
                    <p className="text-neutral-500 uppercase text-[11px] mt-0.5">
                      {item.variant_info?.color} / {item.variant_info?.size} • Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold">{formatPrice(item.total_amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Payment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="border border-neutral-200 p-4 space-y-2 bg-[#F8F8F6]">
              <h4 className="font-extrabold uppercase tracking-wider flex items-center">
                <MapPin size={13} className="mr-1.5" /> Delivery Address
              </h4>
              <p className="font-bold text-black">{shippingAddr?.full_name}</p>
              <p className="text-neutral-600">{shippingAddr?.address_line1}</p>
              {shippingAddr?.address_line2 && <p className="text-neutral-600">{shippingAddr.address_line2}</p>}
              <p className="text-neutral-600">
                {shippingAddr?.city}, {shippingAddr?.state} - {shippingAddr?.pin_code}
              </p>
              <p className="text-neutral-600 font-mono mt-1">Phone: +91 {shippingAddr?.phone}</p>
            </div>

            <div className="border border-neutral-200 p-4 space-y-2 bg-[#F8F8F6]">
              <h4 className="font-extrabold uppercase tracking-wider">Payment Breakdown</h4>
              <div className="flex justify-between text-neutral-600">
                <span>Method</span>
                <span className="uppercase font-bold text-black">{order.payment_method}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Payment Status</span>
                <span className="uppercase font-bold text-black">{order.payment_status}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Fulfillment Status</span>
                <span className="uppercase font-bold text-black">{order.status}</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 flex justify-between font-extrabold text-sm text-black">
                <span>Total Amount</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/track-order?order_id=${order.order_number}`}
              className="w-full sm:w-auto bg-black text-white hover:bg-neutral-800 px-8 py-3.5 text-xs uppercase tracking-widest font-extrabold text-center transition-colors"
            >
              Track Order Status
            </Link>

            <Link
              href="/shop"
              className="w-full sm:w-auto border border-neutral-300 hover:border-black px-8 py-3.5 text-xs uppercase tracking-widest font-bold text-center transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
