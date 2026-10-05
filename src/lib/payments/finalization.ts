import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { confirmStockReservation, releaseStockReservation } from '@/lib/inventory'
import { recordCouponUsage } from '@/lib/coupons'
import { sendOrderConfirmationEmail } from '@/lib/emails/resend'
import { getDevOrders, saveDevOrder } from '@/lib/orders'

export interface FinalizationParams {
  orderNumber: string
  cfPaymentId?: string
  providerOrderStatus: 'PAID' | 'FAILED' | 'CANCELLED' | 'USER_DROPPED' | 'EXPIRED' | 'ACTIVE' | string
  paidAmount?: number // in Rupees or Paise
  currency?: string
  rawPaymentData?: any
  source: 'webhook' | 'return_page' | 'reconciliation' | 'manual' | 'verify_api'
}

export interface FinalizationResult {
  success: boolean
  paymentStatus: 'paid' | 'failed' | 'pending'
  orderNumber: string
  order?: any
  alreadyFinalized?: boolean
  message: string
}

/**
 * Shared idempotent payment finalization function.
 * Called by Cashfree webhooks, return-page verification, and background reconciliation.
 */
export async function finalizeOrderPayment(
  params: FinalizationParams
): Promise<FinalizationResult> {
  const {
    orderNumber,
    cfPaymentId,
    providerOrderStatus,
    paidAmount,
    currency = 'INR',
    rawPaymentData,
    source,
  } = params

  const isDevMode = !isSupabaseConfigured()
  const baseOrderNumber = orderNumber.replace(/-R\d+$/i, '')

  // 1. Handle in-memory dev mode
  if (isDevMode) {
    const devOrders = getDevOrders()
    const devOrder = devOrders.find(
      (o) => o.order_number === orderNumber || o.order_number === baseOrderNumber || o.id === orderNumber || o.id === baseOrderNumber
    )

    if (!devOrder) {
      return {
        success: false,
        paymentStatus: 'failed',
        orderNumber: baseOrderNumber,
        message: `Order ${orderNumber} not found in development store.`,
      }
    }

    if (providerOrderStatus === 'PAID') {
      devOrder.payment_status = 'paid'
      devOrder.status = 'confirmed'
      devOrder.cancellation_reason = null
      devOrder.cancelled_at = null
      saveDevOrder(devOrder)
      return {
        success: true,
        paymentStatus: 'paid',
        orderNumber: baseOrderNumber,
        order: devOrder,
        message: 'Order marked as paid (dev mode).',
      }
    }

    if (['FAILED', 'CANCELLED', 'USER_DROPPED', 'EXPIRED'].includes(providerOrderStatus)) {
      if (devOrder.payment_status === 'paid') {
        return {
          success: true,
          paymentStatus: 'paid',
          orderNumber: baseOrderNumber,
          order: devOrder,
          alreadyFinalized: true,
          message: 'Order is already marked as paid. Ignoring late cancellation event.',
        }
      }
      devOrder.payment_status = 'failed'
      devOrder.status = 'cancelled'
      devOrder.cancellation_reason = `Payment status is ${providerOrderStatus}`
      saveDevOrder(devOrder)
      return {
        success: false,
        paymentStatus: 'failed',
        orderNumber: baseOrderNumber,
        order: devOrder,
        message: `Payment status is ${providerOrderStatus} (dev mode).`,
      }
    }

    return {
      success: false,
      paymentStatus: providerOrderStatus === 'ACTIVE' ? 'pending' : 'failed',
      orderNumber,
      order: devOrder,
      message: `Payment status is ${providerOrderStatus} (dev mode).`,
    }
  }

  // 2. Production / Supabase Database Flow
  const supabase = await createServiceClient()

  // Fetch internal order (resolves base order number or lookup via payments table)
  let { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', baseOrderNumber)
    .maybeSingle()

  if (!order && baseOrderNumber !== orderNumber) {
    const { data: directOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .maybeSingle()
    if (directOrder) order = directOrder
  }

  if (!order) {
    // Try matching payment row for retry gateway order reference
    const { data: matchedPayment } = await supabase
      .from('payments')
      .select('order_id')
      .eq('cashfree_order_id', orderNumber)
      .maybeSingle()
    if (matchedPayment?.order_id) {
      const { data: orderFromPayment } = await supabase
        .from('orders')
        .select('*')
        .eq('id', matchedPayment.order_id)
        .maybeSingle()
      if (orderFromPayment) order = orderFromPayment
    }
  }

  if (!order) {
    console.error(`[finalizeOrderPayment] Order not found: ${orderNumber}`, orderErr)
    return {
      success: false,
      paymentStatus: 'failed',
      orderNumber: baseOrderNumber,
      message: `Internal order ${orderNumber} not found.`,
    }
  }

  // Fetch items and payments separately
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', order.id)

  // 3. Amount & Currency Validation (when provided by provider)
  if (paidAmount !== undefined && paidAmount !== null && paidAmount > 0) {
    // Determine if paidAmount is in Paise or Rupees
    // If paidAmount is greater than 10x order total, it's likely in paise
    const normalizedPaidRupees =
      paidAmount > order.total_amount * 10 ? Math.round(paidAmount / 100) : Math.round(paidAmount)

    // Verify amount matches expected order total within 1 rupee tolerance (to account for rounding)
    if (Math.abs(normalizedPaidRupees - order.total_amount) > 1) {
      console.warn(
        `[finalizeOrderPayment] Amount mismatch for order ${orderNumber}: expected ₹${order.total_amount}, received ₹${normalizedPaidRupees}`
      )
      // Record payment attempt exception
      await supabase.from('payments').insert({
        order_id: order.id,
        cashfree_order_id: orderNumber,
        cf_payment_id: cfPaymentId ? String(cfPaymentId) : null,
        amount: normalizedPaidRupees,
        status: 'failed',
        payment_method: 'cashfree',
        currency,
        payment_data: {
          ...rawPaymentData,
          flag: 'AMOUNT_MISMATCH',
          expected_amount: order.total_amount,
          received_amount: normalizedPaidRupees,
        },
      })

      return {
        success: false,
        paymentStatus: 'failed',
        orderNumber,
        order,
        message: `Payment amount ₹${normalizedPaidRupees} did not match authoritative order total ₹${order.total_amount}.`,
      }
    }
  }

  // 4. Idempotency Check: A successful payment must NEVER be overwritten by failed or pending events
  if (order.payment_status === 'paid') {
    return {
      success: true,
      paymentStatus: 'paid',
      orderNumber,
      order: { ...order, payments: payments || [] },
      alreadyFinalized: true,
      message: `Order ${orderNumber} is already verified and paid.`,
    }
  }

  // Find existing payment row for this order
  const existingPayment = payments?.find(
    (p: any) => p.cashfree_order_id === orderNumber || p.order_id === order.id
  )

  // 5. SUCCESS / PAID Flow
  if (providerOrderStatus === 'PAID') {
    // A. Confirm stock reservation atomically (commits inventory decrement)
    try {
      await confirmStockReservation(order.id)
    } catch (invErr) {
      console.error(`[finalizeOrderPayment] Error confirming stock reservation for order ${order.id}:`, invErr)
    }

    // B. Update order status: confirmed & paid (clears any prior cancellation on late success)
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        cancellation_reason: null,
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('*')
      .single()

    if (updateErr) {
      console.error(`[finalizeOrderPayment] Error updating order status for ${orderNumber}:`, updateErr)
    }

    // C. Update or insert payment record
    if (existingPayment) {
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          cf_payment_id: cfPaymentId ? String(cfPaymentId) : existingPayment.cf_payment_id,
          amount: order.total_amount,
          payment_data: rawPaymentData || existingPayment.payment_data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
    } else {
      await supabase.from('payments').insert({
        order_id: order.id,
        cashfree_order_id: orderNumber,
        cf_payment_id: cfPaymentId ? String(cfPaymentId) : null,
        amount: order.total_amount,
        status: 'paid',
        payment_method: 'cashfree',
        currency,
        payment_data: rawPaymentData || {},
      })
    }

    // D. Record coupon usage if coupon was applied
    if (order.coupon_id && order.user_id) {
      try {
        await recordCouponUsage(
          order.coupon_id,
          order.user_id,
          order.id,
          (order.coupon_discount || 0) * 100
        )
      } catch (couponErr) {
        console.warn('[finalizeOrderPayment] Coupon usage tracking error:', couponErr)
      }
    }

    // E. Queue order confirmation email
    const customerEmail = order.guest_email || (order.shipping_address as any)?.email
    const customerName = (order.shipping_address as any)?.full_name || 'Customer'
    if (customerEmail) {
      try {
        // Enqueue to outbox_jobs for reliable background delivery
        await supabase.from('outbox_jobs').insert({
          job_type: 'EMAIL_ORDER_CONFIRMATION',
          payload: {
            order_id: order.id,
            order_number: order.order_number,
            email: customerEmail,
            customer_name: customerName,
            total_amount: order.total_amount,
          },
          status: 'pending',
        })

        // Also attempt direct asynchronous delivery via Resend
        sendOrderConfirmationEmail({
          email: customerEmail,
          orderId: order.order_number,
          customerName: customerName,
          totalAmount: order.total_amount,
          items: (orderItems as any[]) || ((order as any)?.order_items as any[]) || [],
          shippingAddress: order.shipping_address,
        }).catch((e) =>
          console.warn('[finalizeOrderPayment] Direct email send error (queued in outbox):', e)
        )
      } catch (emailErr) {
        console.warn('[finalizeOrderPayment] Outbox email queue warning:', emailErr)
      }
    }

    return {
      success: true,
      paymentStatus: 'paid',
      orderNumber: baseOrderNumber,
      order: updatedOrder || order,
      message: 'Payment verified and order confirmed successfully.',
    }
  }

  // 6. FAILED / CANCELLED / EXPIRED Flow
  if (['FAILED', 'CANCELLED', 'USER_DROPPED', 'EXPIRED'].includes(providerOrderStatus)) {
    // If order is already paid, NEVER downgrade!
    if ((order as any).payment_status === 'paid') {
      return {
        success: true,
        paymentStatus: 'paid',
        orderNumber: baseOrderNumber,
        order,
        alreadyFinalized: true,
        message: `Order ${baseOrderNumber} is already verified and paid. Ignoring late failure event.`,
      }
    }

    // Release inventory reservation so stock is immediately available again
    try {
      await releaseStockReservation(order.id)
    } catch (relErr) {
      console.warn(`[finalizeOrderPayment] Error releasing stock reservation for failed order ${order.id}:`, relErr)
    }

    // Explicitly update order status so it is marked cancelled & payment failed
    const { data: updatedOrder } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        cancellation_reason: `Payment ${providerOrderStatus.toLowerCase()}`,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('*, order_items(*)')
      .maybeSingle()

    if (existingPayment && existingPayment.status !== 'paid') {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          cf_payment_id: cfPaymentId ? String(cfPaymentId) : existingPayment.cf_payment_id,
          payment_data: rawPaymentData || existingPayment.payment_data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
    } else if (!existingPayment) {
      await supabase.from('payments').insert({
        order_id: order.id,
        cashfree_order_id: orderNumber,
        cf_payment_id: cfPaymentId ? String(cfPaymentId) : null,
        amount: order.total_amount,
        status: 'failed',
        payment_method: 'cashfree',
        currency,
        payment_data: rawPaymentData || {},
      })
    }

    return {
      success: false,
      paymentStatus: 'failed',
      orderNumber: baseOrderNumber,
      order: updatedOrder || order,
      message: `Payment status is ${providerOrderStatus}. Order is marked failed and cancelled.`,
    }
  }

  // 7. PENDING / ACTIVE Flow
  return {
    success: true,
    paymentStatus: 'pending',
    orderNumber: baseOrderNumber,
    order,
    message: 'Payment is awaiting confirmation from bank or gateway.',
  }
}
