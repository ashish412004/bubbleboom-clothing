import { describe, it, expect } from 'vitest'
import { finalizeOrderPayment } from '@/lib/payments/finalization'
import { generateOrderInvoicePdf } from '@/lib/invoices/generate-pdf'
import { saveDevOrder, getDevOrders } from '@/lib/orders'

describe('End-to-End Payment Flow & Invoicing Verification', () => {
  const sampleOrder = {
    id: 'ord_test_flow_101',
    order_number: 'BB-FLOW-101',
    created_at: new Date().toISOString(),
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'cashfree',
    subtotal: 1599,
    discount_amount: 100,
    shipping_amount: 0,
    total_amount: 1499,
    shipping_address: {
      full_name: 'Harsh Shukla',
      phone: '9876543210',
      address_line1: 'B-402 Horizon Tower',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      country: 'India',
    },
    guest_email: 'hhshukla241099@gmail.com',
    order_items: [
      {
        id: 'item_1',
        product_name: 'Boom Iconic Cosmic Tee',
        variant_info: { color: 'Black', size: 'L', sku: 'BOOM-TEE-L' },
        quantity: 1,
        selling_price: 1499,
        total_amount: 1499,
      },
    ],
    payments: [],
  }

  it('finalizes a pending order to paid idempotently (dev mode)', async () => {
    saveDevOrder(sampleOrder)

    // First finalization
    const res1 = await finalizeOrderPayment({
      orderNumber: sampleOrder.order_number,
      cfPaymentId: 'cf_pay_12345678',
      providerOrderStatus: 'PAID',
      paidAmount: 1499,
      currency: 'INR',
      source: 'return_page',
    })

    expect(res1.success).toBe(true)
    expect(res1.paymentStatus).toBe('paid')
    expect(res1.order.payment_status).toBe('paid')
    expect(res1.order.status).toBe('confirmed')

    // Subsequent finalization (idempotent duplicate event from webhook)
    const res2 = await finalizeOrderPayment({
      orderNumber: sampleOrder.order_number,
      cfPaymentId: 'cf_pay_12345678',
      providerOrderStatus: 'PAID',
      paidAmount: 1499,
      currency: 'INR',
      source: 'webhook',
    })

    expect(res2.success).toBe(true)
    expect(res2.paymentStatus).toBe('paid')
  })

  it('generates a valid, non-empty binary PDF invoice buffer with customer details', () => {
    const pdfBuf = generateOrderInvoicePdf({
      ...sampleOrder,
      payment_status: 'paid',
      payments: [{ cf_payment_id: 'cf_pay_12345678', amount: 1499, status: 'paid' }],
    })

    expect(Buffer.isBuffer(pdfBuf)).toBe(true)
    expect(pdfBuf.length).toBeGreaterThan(1000)
    // PDF header magic bytes %PDF-
    expect(pdfBuf.toString('ascii', 0, 5)).toBe('%PDF-')
  })
})
