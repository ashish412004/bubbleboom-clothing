import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getOrderById } from '@/lib/orders'
import { getPaymentStatus, getOrderPayments } from '@/lib/payments/cashfree'
import { finalizeOrderPayment } from '@/lib/payments/finalization'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { PaymentRecoveryClient } from './payment-recovery-client'

export const dynamic = 'force-dynamic'

interface OrderPaymentPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    session_id?: string
    auto?: string
    order_id?: string
  }>
}

export default async function OrderPaymentPage({ params, searchParams }: OrderPaymentPageProps) {
  const { id } = await params
  const sParams = await searchParams

  const lookupId = id || sParams.order_id

  if (!lookupId) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-black">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center">
          <AlertCircle size={40} className="mx-auto text-black mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Order Reference Missing</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            No order reference was provided. Please return to the shop or check your order history.
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

  // 1. Fetch internal order (supports both UUID and customer order_number)
  let order = await getOrderById(lookupId)
  if (!order) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-black">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center">
          <AlertCircle size={40} className="mx-auto text-black mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Order Not Found</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            We could not locate order &quot;{lookupId}&quot;. Please verify the order number or check your account order history.
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

  // 2. Ownership verification
  const currentUser = await getCurrentUser()
  if (order.user_id && currentUser && order.user_id !== currentUser.id) {
    const userIsAdmin = await isAdmin(currentUser.id)
    if (!userIsAdmin) {
      return (
        <div className="flex flex-col min-h-screen bg-white text-black">
          <Header />
          <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center">
            <AlertCircle size={40} className="mx-auto text-black mb-4" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Access Restricted</h1>
            <p className="text-xs text-neutral-500 mt-2 mb-6">
              You are signed into an account that is not associated with this order.
            </p>
            <Link
              href="/account/orders"
              className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold"
            >
              My Orders
            </Link>
          </main>
          <Footer />
        </div>
      )
    }
  }

  // 3. Determine initial payment status with server-side check
  let initialStatus: 'verifying' | 'paid' | 'pending' | 'failed' = 'pending'
  let initialReason = ''

  if (order.payment_method === 'cod' || order.payment_status === 'paid') {
    initialStatus = 'paid'
  } else if (!isSupabaseConfigured()) {
    // In dev mode without database, if no auto-launch, default to pending or failed
    initialStatus = sParams.auto === '1' ? 'pending' : (order.payment_status === 'failed' ? 'failed' : 'pending')
  } else {
    try {
      const cfStatus = await getPaymentStatus(order.order_number)
      const cfPaymentsRes = await getOrderPayments(order.order_number)

      let latestCfPaymentId: string | undefined = undefined
      let hasSuccessfulPayment = false

      if (cfPaymentsRes && !('error' in cfPaymentsRes) && cfPaymentsRes.payments.length > 0) {
        const successfulPayment = cfPaymentsRes.payments.find((p: any) => p.payment_status === 'SUCCESS')
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
          if (finalRes.order) order = finalRes.order
          initialStatus = 'paid'
        } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(cfStatus.order_status)) {
          const finalRes = await finalizeOrderPayment({
            orderNumber: order.order_number,
            cfPaymentId: latestCfPaymentId,
            providerOrderStatus: 'FAILED',
            rawPaymentData: cfStatus.data,
            source: 'return_page',
          })
          if (finalRes.order) order = finalRes.order
          initialStatus = 'failed'
          initialReason = `Order was ${cfStatus.order_status.toLowerCase()} at payment gateway.`
        } else if (cfPaymentsRes && !('error' in cfPaymentsRes) && cfPaymentsRes.payments.length > 0 && !hasSuccessfulPayment) {
          const latestAttempt = cfPaymentsRes.payments[0]
          if (['FAILED', 'USER_DROPPED', 'CANCELLED'].includes(latestAttempt.payment_status)) {
            const finalRes = await finalizeOrderPayment({
              orderNumber: order.order_number,
              cfPaymentId: latestCfPaymentId,
              providerOrderStatus: latestAttempt.payment_status,
              rawPaymentData: latestAttempt,
              source: 'return_page',
            })
            if (finalRes.order) order = finalRes.order
            initialStatus = 'failed'
            initialReason = latestAttempt.payment_message || 'Payment was cancelled or unsuccessful.'
          } else {
            initialStatus = 'pending'
          }
        } else {
          initialStatus = 'pending'
        }
      }
    } catch (e) {
      console.warn('Initial server-side payment verification notice:', e)
      initialStatus = 'pending'
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />
      <main className="flex-1 w-full">
        <PaymentRecoveryClient
          order={order}
          initialStatus={initialStatus}
          initialReason={initialReason}
          initialSessionId={sParams.session_id}
          autoLaunch={sParams.auto === '1'}
        />
      </main>
      <Footer />
    </div>
  )
}
