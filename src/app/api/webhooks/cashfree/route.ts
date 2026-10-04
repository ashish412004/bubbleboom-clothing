import { NextRequest, NextResponse } from 'next/server'
import { verifyCashfreeWebhook } from '@/lib/payments/cashfree'
import { createServiceClient } from '@/lib/supabase/server'
import { confirmStockReservation } from '@/lib/inventory'
import { recordCouponUsage } from '@/lib/coupons'

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
    const eventType = payload.type || payload.event || 'PAYMENT_EVENT'
    const eventData = payload.data || payload

    // Cashfree order identifier
    const orderNumber =
      eventData.order?.order_id || eventData.order_id || payload.order_id
    const paymentData = eventData.payment || eventData
    const cfPaymentId =
      paymentData.cf_payment_id || eventData.cf_payment_id || 'unknown_payment_id'
    const paymentStatus =
      paymentData.payment_status || eventData.payment_status || 'UNKNOWN'

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order reference missing' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // 2. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderErr || !order) {
      console.error('Order not found for Cashfree webhook:', orderNumber)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 3. Webhook idempotency check via payment_events
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('cashfree_order_id', orderNumber)
      .maybeSingle()

    const paymentId = existingPayment?.id

    if (paymentId) {
      const { data: existingEvent } = await supabase
        .from('payment_events')
        .select('id, processed')
        .eq('payment_id', paymentId)
        .eq('event_type', eventType)
        .eq('event_data->>id', String(cfPaymentId))
        .maybeSingle()

      if (existingEvent && existingEvent.processed) {
        // Already processed successfully, return 200 immediately
        return NextResponse.json({ message: 'Event already processed' }, { status: 200 })
      }
    }

    // If order is already paid, do not let an out-of-order or late failure event overwrite it!
    if (order.payment_status === 'paid' && paymentStatus !== 'SUCCESS') {
      console.log(`Order ${orderNumber} already marked paid. Ignoring non-success event.`);
      return NextResponse.json({ message: 'Order already paid' }, { status: 200 })
    }

    // 4. Process payment status
    if (paymentStatus === 'SUCCESS') {
      // Confirm inventory reservation atomically
      await confirmStockReservation(order.id)

      // Update order to confirmed and paid
      await supabase
        .from('orders')
        .update({
          status: order.status === 'pending' ? 'confirmed' : order.status,
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      // Update payment record
      if (paymentId) {
        await supabase
          .from('payments')
          .update({
            status: 'paid',
            cf_payment_id: String(cfPaymentId),
            payment_data: eventData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
      } else {
        await supabase.from('payments').insert({
          order_id: order.id,
          cashfree_order_id: orderNumber,
          cf_payment_id: String(cfPaymentId),
          amount: order.total_amount,
          status: 'paid',
          payment_method: 'cashfree',
          currency: 'INR',
          payment_data: eventData,
        })
      }

      // Record coupon usage if coupon was used
      if (order.coupon_id && order.user_id) {
        await recordCouponUsage(
          order.coupon_id,
          order.user_id,
          order.id,
          order.coupon_discount * 100
        )
      }

      // Record outbox job for order confirmation email
      await supabase.from('outbox_jobs').insert({
        job_type: 'EMAIL_ORDER_CONFIRMATION',
        payload: {
          order_id: order.id,
          order_number: order.order_number,
          email: order.guest_email || 'customer@bubbleboom.in',
        },
        status: 'pending',
      })
    } else if (['FAILED', 'CANCELLED', 'USER_DROPPED'].includes(paymentStatus)) {
      // Mark payment failed if not already paid
      if (paymentId && existingPayment?.status !== 'paid') {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            cf_payment_id: String(cfPaymentId),
            payment_data: eventData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
      }
    }

    // 5. Record event in payment_events for idempotency
    if (paymentId) {
      await supabase.from('payment_events').insert({
        payment_id: paymentId,
        event_type: eventType,
        event_data: { id: cfPaymentId, raw: eventData },
        processed: true,
      })
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Unhandled Cashfree webhook error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
