import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getOrderById } from '@/lib/orders'
import { getPaymentStatus, getOrderPayments } from '@/lib/payments/cashfree'
import { finalizeOrderPayment } from '@/lib/payments/finalization'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { PaymentReturnClient } from './payment-return-client'

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
          <h1 className="text-2xl font-black uppercase tracking-tight">Order Reference Missing</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            No order identifier was received from the payment gateway.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold"
          >
            Return to Store
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  // 1. Fetch internal order
  let order = await getOrderById(orderNumber)
  if (!order) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-black">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center">
          <AlertCircle size={40} className="mx-auto text-black mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Order Not Found</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            We could not locate order &quot;{orderNumber}&quot;. If money was deducted, our webhook reconciliation will update it within a few minutes.
          </p>
          <Link
            href="/track-order"
            className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold"
          >
            Track Order
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  let initialStatus: 'verifying' | 'paid' | 'failed' | 'pending' = 'verifying'

  // 2. COD orders are immediately confirmed
  if (order.payment_method === 'cod') {
    initialStatus = 'paid'
  } else if (order.payment_status === 'paid') {
    initialStatus = 'paid'
  } else if (!isSupabaseConfigured()) {
    initialStatus = 'paid'
  } else {
    // 3. Fast initial check with Cashfree PG
    try {
      const cfStatus = await getPaymentStatus(order.order_number)
      const cfPaymentsRes = await getOrderPayments(order.order_number)

      let latestCfPaymentId: string | undefined = undefined
      let hasSuccessfulPayment = false

      if (cfPaymentsRes && !('error' in cfPaymentsRes) && cfPaymentsRes.payments.length > 0) {
        const successfulPayment = cfPaymentsRes.payments.find(
          (p: any) => p.payment_status === 'SUCCESS'
        )
        if (successfulPayment) {
          hasSuccessfulPayment = true
          latestCfPaymentId = String(successfulPayment.cf_payment_id)
        } else {
          latestCfPaymentId = String(cfPaymentsRes.payments[0].cf_payment_id)
        }
      }

      if (cfStatus && !('error' in cfStatus)) {
        if (cfStatus.order_status === 'PAID' || hasSuccessfulPayment) {
          const finalRes = await finalizeOrderPayment({
            orderNumber: order.order_number,
            cfPaymentId: latestCfPaymentId,
            providerOrderStatus: 'PAID',
            paidAmount: cfStatus.order_amount || order.total_amount,
            currency: cfStatus.order_currency || 'INR',
            rawPaymentData: cfStatus.data,
            source: 'return_page',
          })
          if (finalRes.order) {
            order = finalRes.order
          }
          initialStatus = 'paid'
        } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(cfStatus.order_status)) {
          await finalizeOrderPayment({
            orderNumber: order.order_number,
            cfPaymentId: latestCfPaymentId,
            providerOrderStatus: 'FAILED',
            rawPaymentData: cfStatus.data,
            source: 'return_page',
          })
          initialStatus = 'failed'
        } else {
          initialStatus = 'verifying'
        }
      }
    } catch (e) {
      console.warn('Initial server-side payment verification notice:', e)
      initialStatus = 'verifying'
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />
      <main className="flex-1 w-full">
        <PaymentReturnClient
          orderNumber={order.order_number}
          initialStatus={initialStatus}
          initialOrder={order}
        />
      </main>
      <Footer />
    </div>
  )
}
