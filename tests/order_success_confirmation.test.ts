import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Order Success & Confirmation Page Suite', () => {
  const successViewPath = path.join(process.cwd(), 'src', 'components', 'order', 'order-success-view.tsx')
  const paymentRecoveryPath = path.join(process.cwd(), 'src', 'app', 'orders', '[id]', 'payment', 'payment-recovery-client.tsx')
  const paymentReturnPath = path.join(process.cwd(), 'src', 'app', 'payment-return', 'payment-return-client.tsx')
  const orderRedirectPath = path.join(process.cwd(), 'src', 'app', 'orders', '[id]', 'page.tsx')
  const drawerPath = path.join(process.cwd(), 'src', 'components', 'account', 'orders-view-with-drawer.tsx')
  const accountOrderDetailPath = path.join(process.cwd(), 'src', 'app', 'account', 'orders', '[id]', 'page.tsx')
  const adminOrderDetailPath = path.join(process.cwd(), 'src', 'app', 'admin', 'orders', '[id]', 'page.tsx')

  const successViewContent = fs.readFileSync(successViewPath, 'utf-8')
  const paymentRecoveryContent = fs.readFileSync(paymentRecoveryPath, 'utf-8')
  const paymentReturnContent = fs.readFileSync(paymentReturnPath, 'utf-8')
  const orderRedirectContent = fs.readFileSync(orderRedirectPath, 'utf-8')
  const drawerContent = fs.readFileSync(drawerPath, 'utf-8')
  const accountOrderDetailContent = fs.readFileSync(accountOrderDetailPath, 'utf-8')
  const adminOrderDetailContent = fs.readFileSync(adminOrderDetailPath, 'utf-8')

  it('1. OrderSuccessView component exists and enforces black-and-white Bubble Boom aesthetic', () => {
    expect(fs.existsSync(successViewPath)).toBe(true)
    expect(successViewContent).toContain("'use client'")
    expect(successViewContent).toContain('export function OrderSuccessView')
    // Monochromatic branding
    expect(successViewContent).toContain('border-black')
    expect(successViewContent).toContain('bg-black text-white')
  })

  it('2. Top success state includes icon, heading, confirmation copy, order ID, and status pills', () => {
    // Check heading
    expect(successViewContent).toContain('Order Placed Successfully')
    // Check order status & payment status
    expect(successViewContent).toContain('PAID & VERIFIED')
    expect(successViewContent).toContain('COD (PENDING DELIVERY)')
    // Check copy-to-clipboard for order number
    expect(successViewContent).toContain('navigator.clipboard.writeText')
    expect(successViewContent).toContain('Order ID copied to clipboard!')
  })

  it('3. Replaces fragmented boxes with a compact unified order summary card', () => {
    // Single compact card structure
    expect(successViewContent).toContain('border-2 border-black bg-white shadow-sm overflow-hidden')
    expect(successViewContent).toContain('ORDER ID:')
    expect(successViewContent).toContain('Order Date')
    expect(successViewContent).toContain('Payment Method')
    expect(successViewContent).toContain('Total Payable / Paid')
    expect(successViewContent).toContain('Est. Delivery')
  })

  it('4. Provides full price breakdown with subtotal, discount, shipping, COD fee, tax, and total explanation', () => {
    expect(successViewContent).toContain('Price &amp; Payment Breakdown')
    expect(successViewContent).toContain('Subtotal (Items Total)')
    expect(successViewContent).toContain('Promotional Discount')
    expect(successViewContent).toContain('Shipping &amp; Packaging')
    expect(successViewContent).toContain('COD Handling Fee')
    expect(successViewContent).toContain('Taxes (GST 5% / 12%)')
    expect(successViewContent).toContain('Total Due on Delivery:')
    expect(successViewContent).toContain('Total Amount Paid:')
    // Explanations for payment settled vs cash/UPI due
    expect(successViewContent).toContain('Payment settled in full via')
    expect(successViewContent).toContain('Cash / UPI collection required:')
  })

  it('5. Renders delivery progress timeline with Confirmed -> Packed -> Shipped -> Delivered', () => {
    expect(successViewContent).toContain('Delivery Progress')
    expect(successViewContent).toContain('Confirmed')
    expect(successViewContent).toContain('Packed')
    expect(successViewContent).toContain('Shipped')
    expect(successViewContent).toContain('Delivered')
    // Dynamic estimated delivery date calculation (3-5 business days)
    expect(successViewContent).toContain('3 * 24 * 60 * 60 * 1000')
    expect(successViewContent).toContain('5 * 24 * 60 * 60 * 1000')
  })

  it('6. Purchased items section guarantees visible thumbnails, product names, variant details, and prices', () => {
    expect(successViewContent).toContain('Purchased Items')
    expect(successViewContent).toContain('getSafeImageUrl')
    expect(successViewContent).toContain('Size:')
    expect(successViewContent).toContain('Color:')
    expect(successViewContent).toContain('Qty:')
    expect(successViewContent).toContain('BOOM') // Fallback monogram
  })

  it('7. Shipping destination displays full name, address lines, city, state, pin, and phone', () => {
    expect(successViewContent).toContain('Shipping Destination')
    expect(successViewContent).toContain('shippingAddr?.full_name')
    expect(successViewContent).toContain('shippingAddr?.address_line1')
    expect(successViewContent).toContain('shippingAddr?.city')
    expect(successViewContent).toContain('shippingAddr?.pin_code')
    expect(successViewContent).toContain('Phone: +91')
  })

  it('8. Renders all 4 action buttons with mobile touch targets (min-h-[44px])', () => {
    expect(successViewContent).toContain('View in My Orders')
    expect(successViewContent).toContain('Track Order Details')
    expect(successViewContent).toContain('Download Invoice')
    expect(successViewContent).toContain('Continue Shopping')
    // Min 44px touch targets on mobile
    expect(successViewContent).toContain('min-h-[44px]')
  })

  it('9. Integrates OrderSuccessView into post-checkout payment recovery and payment return flows', () => {
    // PaymentRecoveryClient
    expect(paymentRecoveryContent).toContain("import { OrderSuccessView } from '@/components/order/order-success-view'")
    expect(paymentRecoveryContent).toContain("<OrderSuccessView order={order} orderNumber={orderNumber} />")

    // PaymentReturnClient
    expect(paymentReturnContent).toContain("import { OrderSuccessView } from '@/components/order/order-success-view'")
    expect(paymentReturnContent).toContain("<OrderSuccessView order={order} orderNumber={orderNumber} />")
  })

  it('10. Implements direct route redirection for /orders/[id] -> /orders/[id]/payment', () => {
    expect(fs.existsSync(orderRedirectPath)).toBe(true)
    expect(orderRedirectContent).toContain("redirect(`/orders/${encodeURIComponent(id)}/payment")
  })

  it('11. Account orders drawer displays thumbnails, variant details, line prices, and invoice actions', () => {
    expect(drawerContent).toContain('getSafeImageUrl')
    expect(drawerContent).toContain('Size:')
    expect(drawerContent).toContain('Color:')
    expect(drawerContent).toContain('Qty:')
    expect(drawerContent).toContain('/api/orders/')
  })

  it('12. Account order detail and Admin order detail pages safely render thumbnails and variant info', () => {
    expect(accountOrderDetailContent).toContain('getSafeImageUrl')
    expect(accountOrderDetailContent).toContain('Size:')
    expect(accountOrderDetailContent).toContain('Ordered Items')

    expect(adminOrderDetailContent).toContain('getSafeImageUrl')
    expect(adminOrderDetailContent).toContain('Items Snapshot')
  })
})
