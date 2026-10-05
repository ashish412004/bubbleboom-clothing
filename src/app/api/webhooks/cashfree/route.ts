import { NextRequest, NextResponse } from 'next/server'
import { verifyCashfreeWebhook } from '@/lib/payments/cashfree'
import { finalizeOrderPayment } from '@/lib/payments/finalization'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature =
      request.headers.get('x-webhook-signature') ||
      request.headers.get('x-signature') ||
      ''
    const timestamp =
      request.headers.get('x-webhook-timestamp') ||
      request.headers.get('x-timestamp') ||
      ''

    // 1. Verify webhook signature
    const isValid = await verifyCashfreeWebhook(rawBody, signature, timestamp)
    if (!isValid) {
      console.warn('Rejected Cashfree webhook: Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const eventData = payload.data || payload

    // Cashfree order identifier
    const orderNumber =
      eventData.order?.order_id || eventData.order_id || payload.order_id
    const paymentData = eventData.payment || eventData
    const cfPaymentId =
      paymentData.cf_payment_id || eventData.cf_payment_id || undefined
    const paymentStatus =
      paymentData.payment_status || eventData.payment_status || eventData.order?.order_status || 'UNKNOWN'
    const orderAmount =
      eventData.order?.order_amount || paymentData.payment_amount || eventData.order_amount
    const currency =
      eventData.order?.order_currency || paymentData.payment_currency || 'INR'

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order reference missing' }, { status: 400 })
    }

    // Map Cashfree webhook status to standardized finalization status
    let mappedStatus: 'PAID' | 'FAILED' | 'ACTIVE' = 'ACTIVE'
    if (paymentStatus === 'SUCCESS') {
      mappedStatus = 'PAID'
    } else if (['FAILED', 'CANCELLED', 'USER_DROPPED'].includes(paymentStatus)) {
      mappedStatus = 'FAILED'
    }

    // 2. Delegate to shared idempotent finalization engine
    const result = await finalizeOrderPayment({
      orderNumber,
      cfPaymentId: cfPaymentId ? String(cfPaymentId) : undefined,
      providerOrderStatus: mappedStatus,
      paidAmount: orderAmount,
      currency,
      rawPaymentData: eventData,
      source: 'webhook',
    })

    return NextResponse.json(
      {
        received: true,
        order_number: orderNumber,
        status: result.paymentStatus,
        message: result.message,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Cashfree webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook processing error', details: error.message },
      { status: 500 }
    )
  }
}
