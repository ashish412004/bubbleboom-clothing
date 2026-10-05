import { NextRequest, NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'
import { getPaymentStatus, getOrderPayments } from '@/lib/payments/cashfree'
import { finalizeOrderPayment } from '@/lib/payments/finalization'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('order_id')

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order reference required.' }, { status: 400 })
    }

    // 1. Fetch internal order
    const order = await getOrderById(orderNumber)
    if (!order) {
      return NextResponse.json({ error: `Order ${orderNumber} not found.` }, { status: 404 })
    }

    // Authorization: If order belongs to an authenticated user, only that user or an admin may verify
    const currentUser = await getCurrentUser()
    if (order.user_id && currentUser && order.user_id !== currentUser.id) {
      const userIsAdmin = await isAdmin(currentUser.id)
      if (!userIsAdmin) {
        return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
      }
    }

    // 2. If COD, it's already confirmed
    if (order.payment_method === 'cod') {
      return NextResponse.json({
        status: 'paid',
        payment_method: 'cod',
        order,
      })
    }

    // 3. If already paid, return verified success immediately
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        status: 'paid',
        payment_method: 'cashfree',
        order,
      })
    }

    // 4. In dev mode without Supabase / real gateway
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        status: 'paid',
        payment_method: 'cashfree',
        order,
      })
    }

    // 5. Query authoritative Cashfree PG API directly
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

    // 6. Run shared idempotent finalization engine based on Cashfree response
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

        return NextResponse.json({
          status: 'paid',
          payment_method: 'cashfree',
          order: finalRes.order || order,
        })
      } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(cfStatus.order_status)) {
        await finalizeOrderPayment({
          orderNumber: order.order_number,
          cfPaymentId: latestCfPaymentId,
          providerOrderStatus: 'FAILED',
          rawPaymentData: cfStatus.data,
          source: 'return_page',
        })

        return NextResponse.json({
          status: 'failed',
          payment_method: 'cashfree',
          order,
          reason: `Cashfree reports order status as ${cfStatus.order_status}`,
        })
      }
    }

    // Order is still pending / active at payment gateway
    return NextResponse.json({
      status: 'pending',
      payment_method: 'cashfree',
      order,
      message: 'Awaiting payment confirmation from Cashfree gateway.',
    })
  } catch (error: any) {
    console.error('Payment verification API error:', error)
    return NextResponse.json({ error: error.message || 'Payment verification failed' }, { status: 500 })
  }
}
