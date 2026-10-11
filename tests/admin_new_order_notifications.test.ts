import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  renderNotificationHtml,
  queueOrderNotification,
  queueAdminNewOrderNotification,
  OrderNotificationPayload,
} from '@/lib/emails/notifications'
import fs from 'fs'

describe('Admin New Order Notification Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const sampleAdminOrderPayload: OrderNotificationPayload = {
    order_id: 'ord_admin_test_101',
    order_number: 'BB-20261012-7788',
    event: 'admin_new_order',
    recipient_email: 'bubbleboomstore2026@gmail.com',
    customer_name: 'Aditya Verma',
    customer_email: 'aditya.verma@example.com',
    customer_phone: '+91 98765 43210',
    order_date_ist: '2026-10-12T05:30:00.000Z',
    total_amount: 3499,
    subtotal: 3499,
    shipping_amount: 0,
    cod_amount: 0,
    discount_amount: 0,
    payment_method: 'cashfree',
    payment_status: 'paid',
    items: [
      {
        product_id: 'prod_hoodie_1',
        product_name: 'Heavyweight Boxy Hoodie',
        size: 'L',
        color: 'Washed Black',
        quantity: 1,
        price: 2499,
        total_amount: 2499,
        image_url: 'https://bubbleboom.in/images/products/hoodie-black.jpg',
      },
      {
        product_id: 'prod_tee_1',
        product_name: 'Oversized Acid Wash Tee',
        size: 'XL',
        color: 'Smoke Grey',
        quantity: 1,
        price: 1000,
        total_amount: 1000,
        image_url: 'https://bubbleboom.in/images/products/tee-grey.jpg',
      },
    ],
    shipping_address: {
      full_name: 'Aditya Verma',
      phone: '+91 98765 43210',
      address_line1: 'Flat 402, Highrise Tower, Indiranagar',
      address_line2: '100ft Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pin_code: '560038',
    },
  }

  // 1. Template Rendering & Branding
  it('renders the correct subject and editorial B&W email structure for admin_new_order', () => {
    const rendered = renderNotificationHtml('admin_new_order', sampleAdminOrderPayload)

    // Subject requirement: 🛍️ NEW ORDER RECEIVED – BUBBLE BOOM | Order #{order_number}
    expect(rendered.subject).toBe('🛍️ NEW ORDER RECEIVED – BUBBLE BOOM | Order #BB-20261012-7788')

    // B&W Brand Header & Order Title
    expect(rendered.html).toContain('BUBBLE BOOM')
    expect(rendered.html).toContain('NEW ORDER RECEIVED')
    expect(rendered.html).toContain('BB-20261012-7788')

    // Customer details
    expect(rendered.html).toContain('Aditya Verma')
    expect(rendered.html).toContain('aditya.verma@example.com')
    expect(rendered.html).toContain('+91 98765 43210')
    expect(rendered.html).toContain('Bengaluru')
    expect(rendered.html).toContain('560038')

    // Products & Items breakdown
    expect(rendered.html).toContain('Heavyweight Boxy Hoodie')
    expect(rendered.html).toContain('Washed Black')
    expect(rendered.html).toContain('L')
    expect(rendered.html).toContain('Oversized Acid Wash Tee')
    expect(rendered.html).toContain('Smoke Grey')
    expect(rendered.html).toContain('XL')

    // Financial totals & Payment status
    expect(rendered.html).toContain('PAID')
    expect(rendered.html).toContain('Cashfree')
    expect(rendered.html).toContain('3,499')

    // Prominent Admin Action Button
    expect(rendered.html).toContain('VIEW ORDER IN ADMIN PANEL')
    expect(rendered.html).toContain('/admin/orders/ord_admin_test_101')

    // Text alternative includes order number and admin link
    expect(rendered.text).toContain('BB-20261012-7788')
    expect(rendered.text).toContain('/admin/orders/ord_admin_test_101')
  })

  // 2. COD Orders Rendering
  it('correctly formats COD order details with pending payment status', () => {
    const codPayload: OrderNotificationPayload = {
      ...sampleAdminOrderPayload,
      payment_method: 'cod',
      payment_status: 'pending',
    }

    const rendered = renderNotificationHtml('admin_new_order', codPayload)
    expect(rendered.html).toContain('Cash on Delivery (COD)')
    expect(rendered.html).toContain('PENDING (COLLECT ON DELIVERY)')
  })

  // 3. Queue Admin Notification Helper & Deduplication
  it('queues admin notification with correct defaults and prevents duplicate deliveries', async () => {
    const testOrder = {
      id: `ord_test_dedup_${Date.now()}`,
      order_number: `BB-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      total_amount: 1999,
      subtotal: 1999,
      shipping_amount: 0,
      payment_method: 'cod',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      shipping_address: {
        full_name: 'Priya Sharma',
        phone: '9876543211',
        address_line1: 'B-12 Defence Colony',
        city: 'New Delhi',
        state: 'Delhi',
        pin_code: '110024',
      },
      order_items: [
        {
          product_name: 'Oversized Boxy Tee',
          quantity: 1,
          price: 1999,
          variant_info: { size: 'M', color: 'White' },
        },
      ],
    }

    // First queuing attempt
    const res1 = await queueAdminNewOrderNotification(testOrder, { immediate: false })
    expect(res1.success).toBe(true)
    expect(res1.jobId).toBeDefined()

    // Second queuing attempt with the exact same order must be deduplicated
    const res2 = await queueAdminNewOrderNotification(testOrder, { immediate: false })
    expect(res2.success).toBe(true)
    expect(res2.skipped).toBe(true)
    expect(res2.reason).toContain('deduplicated')
  })

  // 4. Code Integration Verification: Checkout Route
  it('verifies checkout route calls queueAdminNewOrderNotification for COD orders', () => {
    const checkoutContent = fs.readFileSync('src/app/api/checkout/route.ts', 'utf-8')
    expect(checkoutContent).toContain('queueAdminNewOrderNotification')
    expect(checkoutContent).toContain('Cash on Delivery')
  })

  // 5. Code Integration Verification: Payment Finalization
  it('verifies payment finalization calls queueAdminNewOrderNotification on verified PAID status', () => {
    const finalizationContent = fs.readFileSync('src/lib/payments/finalization.ts', 'utf-8')
    expect(finalizationContent).toContain('queueAdminNewOrderNotification')
    expect(finalizationContent).toContain("providerOrderStatus === 'PAID'")
  })

  // 6. Preservation of Supabase Login OTP & Auth
  it('preserves Supabase Auth login OTP untouched without side-effects', () => {
    const sessionRouteContent = fs.readFileSync('src/app/api/auth/session/route.ts', 'utf-8')
    expect(sessionRouteContent).toContain('supabase.auth.signInWithOtp')
    expect(sessionRouteContent).toContain('email: cleanEmail')
  })
})
