import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  renderNotificationHtml,
  queueOrderNotification,
  getOutboxHistory,
  retryOutboxJob,
  OrderNotificationEvent,
  OrderNotificationPayload,
} from '@/lib/emails/notifications'
import { getMailerStatus, getSmtpConfig } from '@/lib/emails/mailer'
import fs from 'fs'

describe('Automatic Order Notifications & Gmail SMTP Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // 1. Preserve Login OTP
  it('preserves Supabase Auth login OTP configuration untouched', () => {
    const sessionRouteContent = fs.readFileSync(
      'src/app/api/auth/session/route.ts',
      'utf-8'
    )
    expect(sessionRouteContent).toContain('supabase.auth.signInWithOtp')
    expect(sessionRouteContent).toContain('email: cleanEmail')
  })

  // 2. SMTP Transport Configuration
  it('correctly defaults SMTP configuration to Gmail without exposing secrets', async () => {
    const config = getSmtpConfig()
    expect(config.host).toBe('smtp.gmail.com')
    expect(config.user).toBe('bubbleboomstore2026@gmail.com')
    expect(config.from).toContain('BUBBLE BOOM')

    const status = await getMailerStatus()
    expect(status.smtpHost).toBe('smtp.gmail.com')
    expect(status.supportEmail).toBe('bubbleboomstore2026@gmail.com')
  })

  // 3. Render HTML templates for all 8 lifecycle events
  const sampleOrder: OrderNotificationPayload = {
    order_id: 'ord_test_8819',
    order_number: 'BB-20261011-9921',
    event: 'order_confirmed',
    recipient_email: 'customer@example.com',
    customer_name: 'Rohit Sharma',
    total_amount: 3999,
    subtotal: 3999,
    shipping_amount: 0,
    payment_method: 'cashfree',
    payment_status: 'paid',
    items: [
      {
        product_id: 'prod_hoodie_1',
        product_name: 'Vintage Heavyweight Hoodie',
        size: 'XL',
        color: 'Onyx Black',
        quantity: 1,
        price: 2999,
        total_amount: 2999,
        image_url: 'https://bubbleboom.in/images/hoodie-black.jpg',
      },
      {
        product_id: 'prod_tee_1',
        product_name: 'Boxy Graphic Tee',
        size: 'L',
        color: 'Smoke Grey',
        quantity: 1,
        price: 1000,
        total_amount: 1000,
        image_url: 'https://bubbleboom.in/images/tee-grey.jpg',
      },
    ],
    shipping_address: {
      full_name: 'Rohit Sharma',
      phone: '9876543210',
      address_line1: 'Flat 101, Prestige Towers',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
    },
    carrier: 'Bluedart Express',
    tracking_number: 'BLUEDART-882910',
    tracking_url: 'https://bluedart.com/track/882910',
    estimated_delivery: 'October 16, 2026',
  }

  const allEvents: OrderNotificationEvent[] = [
    'order_placed',
    'order_confirmed',
    'order_packed',
    'order_shipped',
    'out_for_delivery',
    'order_delivered',
    'order_cancelled',
    'refund_completed',
  ]

  for (const event of allEvents) {
    it(`renders valid responsive HTML for event: "${event}"`, () => {
      const rendered = renderNotificationHtml(event, { ...sampleOrder, event })
      expect(rendered.subject).toContain('BUBBLE BOOM')
      expect(rendered.subject).toContain('#BB-20261011-9921')
      expect(rendered.html).toContain('BUBBLE BOOM')
      expect(rendered.html).toContain('Rohit Sharma')
      expect(rendered.html).toContain('Vintage Heavyweight Hoodie')
      expect(rendered.html).toContain('Onyx Black')
      expect(rendered.html).toContain('Size: XL')
      expect(rendered.html).toContain('bubbleboomstore2026@gmail.com')
      expect(rendered.html).toContain('₹3,999')
      expect(rendered.text).toContain('BB-20261011-9921')
    })
  }

  // 4. Payment status differentiation (Paid online vs COD doorstep pending)
  it('differentiates between verified online paid orders and Cash on Delivery orders', () => {
    // Online Paid Order
    const onlineRendered = renderNotificationHtml('order_confirmed', {
      ...sampleOrder,
      payment_method: 'cashfree',
      payment_status: 'paid',
    })
    expect(onlineRendered.html).toContain('PAID')
    expect(onlineRendered.html).toContain('Prepaid Online (Cashfree)')

    // COD Unpaid Order
    const codRendered = renderNotificationHtml('order_confirmed', {
      ...sampleOrder,
      payment_method: 'cod',
      payment_status: 'pending',
    })
    expect(codRendered.html).toContain('PAY AT DOORSTEP')
    expect(codRendered.html).toContain('Cash on Delivery (COD)')
    expect(codRendered.html).toContain('Please keep ₹3,999 ready')
  })

  // 5. Logistics tracking details for Shipped event
  it('includes tracking partner and AWB link when order is shipped', () => {
    const shippedRendered = renderNotificationHtml('order_shipped', {
      ...sampleOrder,
      event: 'order_shipped',
    })
    expect(shippedRendered.html).toContain('Bluedart Express')
    expect(shippedRendered.html).toContain('BLUEDART-882910')
    expect(shippedRendered.html).toContain('Track Live Shipment')
  })

  // 6. Outbox Queueing, Deduplication, and Idempotency
  it('queues notifications in the outbox and prevents duplicate dispatches', async () => {
    const uniqueOrderId = 'ord_dedup_' + Date.now()
    const payload: OrderNotificationPayload = {
      ...sampleOrder,
      order_id: uniqueOrderId,
      order_number: 'BB-DEDUP-' + Date.now(),
      event: 'order_placed',
    }

    // 1st queue call
    const res1 = await queueOrderNotification(payload)
    expect(res1.success).toBe(true)
    expect(res1.jobId).toBeDefined()

    // 2nd duplicate call for the same event
    const res2 = await queueOrderNotification(payload)
    expect(res2.success).toBe(true)
    expect(res2.skipped).toBe(true)
    expect(res2.reason).toContain('deduplicated')
  })

  // 7. Outbox history retrieval
  it('retrieves outbox jobs history with status and metadata', async () => {
    const history = await getOutboxHistory({ limit: 10 })
    expect(Array.isArray(history.jobs)).toBe(true)
    expect(history.total).toBeGreaterThanOrEqual(1)
  })

  // 8. Manual job retry
  it('handles job retry gracefully', async () => {
    const history = await getOutboxHistory({ limit: 5 })
    if (history.jobs.length > 0) {
      const targetJob = history.jobs[0]
      const retryResult = await retryOutboxJob(targetJob.id)
      expect(retryResult.success).toBe(true)
    }
  })

  // 9. Fulfillment status notifications & cancellation reason
  it('renders cancellation reason in order_cancelled email template', () => {
    const cancelledRendered = renderNotificationHtml('order_cancelled', {
      ...sampleOrder,
      event: 'order_cancelled',
      cancellation_reason: 'Customer requested size change before dispatch',
    })
    expect(cancelledRendered.html).toContain('Customer requested size change before dispatch')
    expect(cancelledRendered.html).toContain('ORDER CANCELLED')
  })

  it('correctly resolves variant_info size, color and image in email item mapping', () => {
    const variantItemPayload: OrderNotificationPayload = {
      ...sampleOrder,
      event: 'order_packed',
      items: [
        {
          product_id: 'prod_99',
          product_name: 'Monochrome Cargo Pants',
          quantity: 2,
          price: 1599,
          total_amount: 3198,
          variant_info: {
            size: '32',
            color: 'Charcoal Black',
            image_url: 'https://bubbleboom.in/images/cargo-32.jpg',
          },
        },
      ],
    }
    const rendered = renderNotificationHtml('order_packed', variantItemPayload)
    expect(rendered.html).toContain('Size: 32')
    expect(rendered.html).toContain('Color: Charcoal Black')
    expect(rendered.html).toContain('https://bubbleboom.in/images/cargo-32.jpg')
    expect(rendered.html).toContain('Monochrome Cargo Pants')
  })
})
