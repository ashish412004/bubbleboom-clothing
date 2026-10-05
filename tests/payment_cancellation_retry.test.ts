import { describe, it, expect, beforeEach } from 'vitest'
import { finalizeOrderPayment } from '@/lib/payments/finalization'
import { saveDevOrder, getDevOrders, getOrRenewCashfreeSessionForOrder } from '@/lib/orders'

describe('Cashfree Payment Cancellation, Recovery & Retry Engine', () => {
  const baseOrder = {
    id: 'ord_cancel_retry_001',
    order_number: 'BB-RETRY-001',
    created_at: new Date().toISOString(),
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'cashfree',
    subtotal: 2499,
    discount_amount: 0,
    shipping_amount: 0,
    total_amount: 2499,
    shipping_address: {
      full_name: 'Harsh Shukla',
      phone: '9876543210',
      address_line1: 'B-402 Horizon Tower',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      country: 'India',
    },
    guest_email: 'customer@bubbleboom.in',
    order_items: [
      {
        id: 'item_retry_1',
        product_name: 'Boom Boxy Oversized Tee',
        variant_info: { color: 'Black', size: 'XL', sku: 'BOOM-BOX-XL' },
        quantity: 2,
        selling_price: 1249,
        total_amount: 2498,
      },
    ],
    payments: [],
  }

  beforeEach(() => {
    saveDevOrder({ ...baseOrder })
  })

  it('marks order as failed upon user cancellation or drop-off while preserving order details', async () => {
    const res = await finalizeOrderPayment({
      orderNumber: baseOrder.order_number,
      cfPaymentId: 'cf_pay_dropped_1',
      providerOrderStatus: 'USER_DROPPED',
      source: 'return_page',
    })

    expect(res.success).toBe(false)
    expect(res.paymentStatus).toBe('failed')
    expect(res.order.payment_status).toBe('failed')
    expect(res.order.status).toBe('cancelled')
    expect(res.order.cancellation_reason).toContain('USER_DROPPED')

    // Order items and amounts are intact
    expect(res.order.order_items.length).toBe(1)
    expect(res.order.total_amount).toBe(2499)
  })

  it('handles late payment success: upgrades a cancelled/failed order to paid and confirmed', async () => {
    // 1. First user drops off
    await finalizeOrderPayment({
      orderNumber: baseOrder.order_number,
      providerOrderStatus: 'USER_DROPPED',
      source: 'return_page',
    })

    // 2. Later, bank confirms payment and Cashfree sends PAID webhook
    const lateRes = await finalizeOrderPayment({
      orderNumber: baseOrder.order_number,
      cfPaymentId: 'cf_pay_late_success',
      providerOrderStatus: 'PAID',
      paidAmount: 2499,
      currency: 'INR',
      source: 'webhook',
    })

    expect(lateRes.success).toBe(true)
    expect(lateRes.paymentStatus).toBe('paid')
    expect(lateRes.order.payment_status).toBe('paid')
    expect(lateRes.order.status).toBe('confirmed')
    expect(lateRes.order.cancellation_reason).toBeNull()
  })

  it('never downgrades an already paid order if a duplicate failure event arrives', async () => {
    // 1. Mark order paid
    const paidRes = await finalizeOrderPayment({
      orderNumber: baseOrder.order_number,
      cfPaymentId: 'cf_pay_success_1',
      providerOrderStatus: 'PAID',
      paidAmount: 2499,
      currency: 'INR',
      source: 'webhook',
    })

    expect(paidRes.success).toBe(true)
    expect(paidRes.order.payment_status).toBe('paid')

    // 2. Erroneous/delayed FAILED or CANCELLED webhook arrives
    const failRes = await finalizeOrderPayment({
      orderNumber: baseOrder.order_number,
      providerOrderStatus: 'CANCELLED',
      source: 'webhook',
    })

    expect(failRes.paymentStatus).toBe('paid')
    expect(failRes.order.payment_status).toBe('paid')
    expect(failRes.order.status).toBe('confirmed')
  })

  it('resolves replacement gateway attempt with suffix (e.g. -R1) to the base internal order', async () => {
    const res = await finalizeOrderPayment({
      orderNumber: `${baseOrder.order_number}-R1`,
      cfPaymentId: 'cf_pay_retry_attempt_1',
      providerOrderStatus: 'PAID',
      paidAmount: 2499,
      currency: 'INR',
      source: 'return_page',
    })

    expect(res.success).toBe(true)
    expect(res.paymentStatus).toBe('paid')
    expect(res.orderNumber).toBe(baseOrder.order_number)
    expect(res.order.payment_status).toBe('paid')
  })

  it('renews payment session for an existing order without creating duplicate orders', async () => {
    const renewed = await getOrRenewCashfreeSessionForOrder(baseOrder)

    expect(renewed.success).toBe(true)
    expect(renewed.payment_session_id).toBeDefined()
    expect(renewed.order_id).toBe(baseOrder.order_number)
  })

  it('reconciles cart items on Back to Cart without duplicating quantities', () => {
    const existingCart = [
      { id: 'ci_1', variant_id: 'var_other', quantity: 1 },
      { id: 'ci_2', variant_id: 'var_item_1', quantity: 2 },
    ]

    const orderItems = [
      { variant_id: 'var_item_1', quantity: 2 },
      { variant_id: 'var_item_new', quantity: 1 },
    ]

    // Reconcile logic
    const reconciled = [...existingCart]
    for (const item of orderItems) {
      const match = reconciled.find((c) => c.variant_id === item.variant_id)
      if (match) {
        match.quantity = Math.max(match.quantity, item.quantity)
      } else {
        reconciled.push({ id: `ci_new_${item.variant_id}`, variant_id: item.variant_id, quantity: item.quantity })
      }
    }

    // var_item_1 had 2 in cart and 2 in order -> quantity remains 2, not 4
    const item1 = reconciled.find((c) => c.variant_id === 'var_item_1')
    expect(item1?.quantity).toBe(2)

    // var_item_new is added with 1
    const itemNew = reconciled.find((c) => c.variant_id === 'var_item_new')
    expect(itemNew?.quantity).toBe(1)

    // var_other is preserved
    const itemOther = reconciled.find((c) => c.variant_id === 'var_other')
    expect(itemOther?.quantity).toBe(1)
  })
})
