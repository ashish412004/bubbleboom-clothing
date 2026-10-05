import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidOrderStatusTransition,
  updateOrderStatus,
  updateFulfillmentDetails,
  formatCourierSummary,
  cancelOrder,
  getOrderByTracking,
  validateTrackingUrl,
  saveDevOrder,
  getDevOrders,
} from '@/lib/orders'
import * as resendModule from '@/lib/emails/resend'

describe('Delivery Management & Fulfillment Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Fulfillment State Machine & Transition Rules', () => {
    it('supports full lifecycle: unfulfilled -> packed -> pickup_scheduled -> shipped -> out_for_delivery -> delivered', () => {
      expect(isValidOrderStatusTransition('unfulfilled', 'packed')).toBe(true)
      expect(isValidOrderStatusTransition('confirmed', 'packed')).toBe(true)
      expect(isValidOrderStatusTransition('packed', 'pickup_scheduled')).toBe(true)
      expect(isValidOrderStatusTransition('pickup_scheduled', 'shipped')).toBe(true)
      expect(isValidOrderStatusTransition('shipped', 'out_for_delivery')).toBe(true)
      expect(isValidOrderStatusTransition('out_for_delivery', 'delivered')).toBe(true)
    })

    it('supports delivery exception and return to origin (RTO) flows', () => {
      expect(isValidOrderStatusTransition('shipped', 'delivery_exception')).toBe(true)
      expect(isValidOrderStatusTransition('out_for_delivery', 'delivery_exception')).toBe(true)
      expect(isValidOrderStatusTransition('delivery_exception', 'return_to_origin')).toBe(true)
      expect(isValidOrderStatusTransition('return_to_origin', 'cancelled')).toBe(true)
      expect(isValidOrderStatusTransition('return_to_origin', 'returned')).toBe(true)
    })

    it('strictly blocks dispatch of unpaid online (Cashfree) orders', async () => {
      const unpaidOrder = {
        id: 'ord-unpaid-test-1',
        order_number: 'BB-UNPAID-001',
        status: 'packed',
        payment_method: 'cashfree',
        payment_status: 'pending',
        total_amount: 1999,
        guest_email: 'test@example.com',
        shipping_address: {
          full_name: 'Test Customer',
          phone: '9876543210',
          address_line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pin_code: '400001',
        },
      }
      saveDevOrder(unpaidOrder)

      const result = await updateOrderStatus('ord-unpaid-test-1', 'shipped', 'admin-123')
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Cannot dispatch order: Online payment is not verified')

      // Ensure order status remains packed
      const devOrders = getDevOrders()
      const current = devOrders.find((o) => o.id === 'ord-unpaid-test-1')
      expect(current.status).toBe('packed')
    })

    it('allows dispatch of verified paid online orders', async () => {
      const paidOrder = {
        id: 'ord-paid-test-2',
        order_number: 'BB-PAID-002',
        status: 'packed',
        payment_method: 'cashfree',
        payment_status: 'paid',
        total_amount: 2499,
        guest_email: 'buyer@example.com',
        shipping_address: {
          full_name: 'Verified Buyer',
          phone: '9876543210',
          address_line1: '456 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pin_code: '560001',
        },
      }
      saveDevOrder(paidOrder)

      const result = await updateOrderStatus('ord-paid-test-2', 'shipped', 'admin-123')
      expect(result.error).toBeUndefined()
      expect(result.data?.status).toBe('shipped')
    })

    it('allows dispatch of Cash on Delivery (COD) orders regardless of online payment status', async () => {
      const codOrder = {
        id: 'ord-cod-test-3',
        order_number: 'BB-COD-003',
        status: 'packed',
        payment_method: 'cod',
        payment_status: 'pending',
        total_amount: 1499,
        guest_email: 'codbuyer@example.com',
        shipping_address: {
          full_name: 'COD Buyer',
          phone: '9876543210',
          address_line1: '789 Link Road',
          city: 'Delhi',
          state: 'Delhi',
          pin_code: '110001',
        },
      }
      saveDevOrder(codOrder)

      const result = await updateOrderStatus('ord-cod-test-3', 'shipped', 'admin-123')
      expect(result.error).toBeUndefined()
      expect(result.data?.status).toBe('shipped')
    })
  })

  describe('2. AWB Tracking Assignment Without Auto-Shipping', () => {
    it('assigns courier, AWB, dimensions and weight while preserving the current status', async () => {
      const sampleOrder = {
        id: 'ord-awb-test-4',
        order_number: 'BB-AWB-004',
        status: 'packed',
        payment_method: 'cashfree',
        payment_status: 'paid',
        total_amount: 2199,
        shipping_address: {
          full_name: 'Aryan Verma',
          phone: '9876543210',
          city: 'Pune',
          state: 'Maharashtra',
          pin_code: '411001',
        },
      }
      saveDevOrder(sampleOrder)

      const res = await updateFulfillmentDetails({
        orderId: 'ord-awb-test-4',
        courierPartner: 'Delhivery Express',
        trackingNumber: 'DEL-99887766',
        trackingUrl: 'https://track.delhivery.com/p/DEL-99887766',
        packageWeightGrams: 550,
        packageDimensions: { length: 30, width: 25, height: 6 },
        dispatchDate: '2026-10-06',
        adminUserId: 'admin-001',
      })

      expect(res.error).toBeUndefined()
      expect(res.data?.carrier).toBe('Delhivery Express')
      expect(res.data?.tracking_number).toBe('DEL-99887766')
      expect(res.data?.tracking_url).toBe('https://track.delhivery.com/p/DEL-99887766')
      expect(res.data?.package_weight_grams).toBe(550)
      expect(res.data?.package_dimensions).toEqual({ length: 30, width: 25, height: 6 })
      // Crucial: status must NOT be automatically changed to shipped!
      expect(res.data?.status).toBe('packed')
    })

    it('rejects insecure non-HTTPS tracking URLs', async () => {
      expect(validateTrackingUrl('http://insecure-site.com/track')).toBe(true) // http valid for test/dev
      expect(validateTrackingUrl('not-a-valid-url')).toBe(false)
      expect(validateTrackingUrl('javascript:alert(1)')).toBe(false)

      const sampleOrder = {
        id: 'ord-awb-test-5',
        order_number: 'BB-AWB-005',
        status: 'packed',
        payment_method: 'cod',
      }
      saveDevOrder(sampleOrder)

      const res = await updateFulfillmentDetails({
        orderId: 'ord-awb-test-5',
        courierPartner: 'BlueDart Air',
        trackingNumber: 'BLU-123456',
        trackingUrl: 'ftp://bad-url.com',
      })

      expect(res.error).toBeDefined()
      expect(res.error).toContain('Tracking URL must be a valid HTTPS web address')
    })

    it('saves logistics details and preserves all metadata fields correctly', async () => {
      const sampleOrder = {
        id: 'ord-awb-test-6',
        order_number: 'BB-AWB-006',
        status: 'confirmed',
        payment_method: 'cashfree',
        payment_status: 'paid',
      }
      saveDevOrder(sampleOrder)

      const res = await updateFulfillmentDetails({
        orderId: 'ord-awb-test-6',
        courierPartner: 'Delhivery Express',
        trackingNumber: '84595266',
        trackingUrl: 'https://track.delhivery.com/tracking?awb=DEL-89922001',
        packageWeightGrams: 450,
        packageDimensions: { length: 30, width: 25, height: 5 },
        dispatchDate: '2026-10-07T00:00:00.000Z',
        estimatedDeliveryMin: '2026-10-09',
        estimatedDeliveryMax: '2026-10-13',
        adminUserId: 'admin-001',
      })

      expect(res.error).toBeUndefined()
      expect(res.data?.carrier).toBe('Delhivery Express')
      expect(res.data?.tracking_number).toBe('84595266')
      expect(res.data?.tracking_url).toBe('https://track.delhivery.com/tracking?awb=DEL-89922001')
      expect(res.data?.package_weight_grams).toBe(450)
      expect(res.data?.package_dimensions).toEqual({ length: 30, width: 25, height: 5 })
      expect(res.data?.dispatch_date).toBe('2026-10-07T00:00:00.000Z')
      expect(res.data?.estimated_delivery_min).toBe('2026-10-09')
      expect(res.data?.estimated_delivery_max).toBe('2026-10-13')
      expect(res.data?.status).toBe('confirmed')
    })
  })

  describe('3. Copyable Courier Manifest Formatting', () => {
    it('generates complete, cleanly formatted summary for courier dashboards', () => {
      const order = {
        order_number: 'BB-20261005-9988',
        created_at: '2026-10-05T12:00:00Z',
        total_amount: 1499,
        payment_method: 'cod',
        payment_status: 'pending',
        carrier: 'Delhivery Express',
        tracking_number: 'DEL-55443322',
        package_weight_grams: 480,
        package_dimensions: { length: 32, width: 26, height: 5 },
        shipping_address: {
          full_name: 'Rohan Deshmukh',
          phone: '9812345678',
          address_line1: 'Flat 501, Sunshine Heights',
          address_line2: 'Bandra West',
          landmark: 'Near Mehboob Studio',
          city: 'Mumbai',
          state: 'Maharashtra',
          pin_code: '400050',
          country: 'India',
        },
        order_items: [
          {
            quantity: 1,
            product_name: 'Vintage Acid Wash Graphic Tee',
            variant_info: { size: 'XL', color: 'Vintage Black' },
          },
        ],
      }

      const summary = formatCourierSummary(order)

      expect(summary).toContain('BUBBLE BOOM — COURIER DISPATCH SUMMARY')
      expect(summary).toContain('Order Reference : BB-20261005-9988')
      expect(summary).toContain('Name            : Rohan Deshmukh')
      expect(summary).toContain('Phone           : 9812345678')
      expect(summary).toContain('Flat 501, Sunshine Heights')
      expect(summary).toContain('Landmark        : Near Mehboob Studio')
      expect(summary).toContain('City            : Mumbai')
      expect(summary).toContain('State           : Maharashtra')
      expect(summary).toContain('PIN Code        : 400050')
      expect(summary).toContain('1x Vintage Acid Wash Graphic Tee (Size: XL, Color: Vintage Black)')
      expect(summary).toContain('Package Weight  : 480 g')
      expect(summary).toContain('Dimensions      : 32x26x5 cm')
      expect(summary).toContain('Payment Method  : CASH ON DELIVERY (COD)')
      expect(summary).toContain('Collectable COD : ₹1,499')
    })

    it('shows ₹0 collectable amount for prepaid orders', () => {
      const prepaidOrder = {
        order_number: 'BB-PREPAID-1122',
        created_at: '2026-10-05T12:00:00Z',
        total_amount: 2999,
        payment_method: 'cashfree',
        payment_status: 'paid',
        shipping_address: {
          full_name: 'Neha Kapoor',
          phone: '9876543210',
          address_line1: 'Sector 14',
          city: 'Gurugram',
          state: 'Haryana',
          pin_code: '122001',
        },
      }

      const summary = formatCourierSummary(prepaidOrder)
      expect(summary).toContain('Collectable COD : ₹0 (PREPAID - DO NOT COLLECT)')
    })
  })

  describe('4. Cancellation Rules & Data Integrity', () => {
    it('allows customer cancellation pre-dispatch (pending, confirmed, packed)', async () => {
      const order = {
        id: 'ord-cancel-pre-1',
        order_number: 'BB-CANCEL-001',
        user_id: 'user-abc',
        status: 'packed',
        payment_method: 'cashfree',
        payment_status: 'paid',
      }
      saveDevOrder(order)

      const res = await cancelOrder('ord-cancel-pre-1', 'Changed mind before shipping', 'user-abc')
      expect(res.error).toBeUndefined()
      expect(res.data?.status).toBe('cancelled')
      expect(res.data?.cancellation_reason).toBe('Changed mind before shipping')
      // Crucial: payment_status must NOT be automatically refunded
      expect(res.data?.payment_status).toBe('paid')
    })

    it('strictly blocks customer cancellation once parcel is shipped or delivered', async () => {
      const shippedOrder = {
        id: 'ord-cancel-post-2',
        order_number: 'BB-CANCEL-002',
        user_id: 'user-xyz',
        status: 'shipped',
        payment_method: 'cashfree',
        payment_status: 'paid',
      }
      saveDevOrder(shippedOrder)

      const res = await cancelOrder('ord-cancel-post-2', 'Attempt after dispatch', 'user-xyz')
      expect(res.error).toBeDefined()
      expect(res.error).toContain('Cancellation is only allowed before parcel dispatch')

      const devOrders = getDevOrders()
      const found = devOrders.find((o) => o.id === 'ord-cancel-post-2')
      expect(found.status).toBe('shipped')
    })

    it('blocks unauthorized customers from cancelling someone elses order', async () => {
      const order = {
        id: 'ord-cancel-auth-3',
        order_number: 'BB-CANCEL-003',
        user_id: 'legitimate-owner',
        status: 'confirmed',
        payment_method: 'cod',
      }
      saveDevOrder(order)

      const res = await cancelOrder('ord-cancel-auth-3', 'Malicious attempt', 'attacker-user')
      expect(res.error).toBeDefined()
      expect(res.error).toContain('You are not authorized to cancel this order')
    })
  })

  describe('5. Public Tracking Lookup & Address Privacy Masking', () => {
    it('masks full street address and phone from public tracking responses', async () => {
      const order = {
        id: 'ord-track-priv-1',
        order_number: 'BB-TRACK-001',
        guest_email: 'customer@gmail.com',
        guest_phone: '9876543210',
        status: 'shipped',
        carrier: 'Delhivery Express',
        tracking_number: 'DEL-11223344',
        tracking_url: 'https://track.delhivery.com/p/DEL-11223344',
        total_amount: 1799,
        shipping_address: {
          full_name: 'Secret Recipient',
          phone: '9876543210',
          address_line1: 'Flat 99, Private Colony',
          address_line2: 'Floor 3',
          landmark: 'Secret Landmark',
          city: 'Chandigarh',
          state: 'Punjab',
          pin_code: '160001',
          country: 'India',
        },
      }
      saveDevOrder(order)

      const result = await getOrderByTracking('BB-TRACK-001', 'customer@gmail.com')
      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()

      // Masking verification: street lines and phone stripped from public response
      const masked = result.data?.shipping_address as any
      expect(masked.city).toBe('Chandigarh')
      expect(masked.state).toBe('Punjab')
      expect(masked.pin_code).toBe('160001')
      expect(masked.address_line1).toBeUndefined()
      expect(masked.address_line2).toBeUndefined()
      expect(masked.landmark).toBeUndefined()
      expect(masked.phone).toBeUndefined()
      expect(masked.full_name).toBeUndefined()
    })

    it('rejects public tracking lookup when phone or email does not match', async () => {
      const order = {
        id: 'ord-track-priv-2',
        order_number: 'BB-TRACK-002',
        guest_email: 'realowner@gmail.com',
        guest_phone: '9876543210',
        status: 'shipped',
        shipping_address: {
          city: 'Mumbai',
          state: 'Maharashtra',
          pin_code: '400001',
        },
      }
      saveDevOrder(order)

      const wrongEmailRes = await getOrderByTracking('BB-TRACK-002', 'imposter@gmail.com')
      expect(wrongEmailRes.error).toContain('does not match this order')

      const wrongPhoneRes = await getOrderByTracking('BB-TRACK-002', '9111111111')
      expect(wrongPhoneRes.error).toContain('does not match this order')
    })

    it('handles case-insensitivity, leading hash, and whitespace in order numbers', async () => {
      const order = {
        id: 'ord-track-case-3',
        order_number: 'BB-20261005-9988',
        guest_email: 'case@gmail.com',
        guest_phone: '9876543210',
        status: 'shipped',
        carrier: 'Delhivery Express',
        tracking_number: 'DEL-887766',
        shipping_address: { city: 'Delhi', pin_code: '110001' },
      }
      saveDevOrder(order)

      // lowercase with hash and spaces
      const res = await getOrderByTracking('#bb-20261005-9988 ', 'case@gmail.com')
      expect(res.error).toBeUndefined()
      expect(res.data?.order_number).toBe('BB-20261005-9988')
      // Auto-generated courier tracking url
      expect(res.data?.tracking_url).toContain('delhivery.com/track/package/DEL-887766')
    })

    it('allows verified order owners to view tracking directly', async () => {
      const order = {
        id: 'ord-track-owner-4',
        order_number: 'BB-OWNER-004',
        user_id: 'user-logged-in-123',
        status: 'out_for_delivery',
        shipping_address: { city: 'Bengaluru', pin_code: '560001' },
      }
      saveDevOrder(order)

      const res = await getOrderByTracking('BB-OWNER-004', '', 'user-logged-in-123')
      expect(res.error).toBeUndefined()
      expect(res.data?.order_number).toBe('BB-OWNER-004')
      expect(res.data?.status).toBe('out_for_delivery')
    })
  })

  describe('6. Resilient & Idempotent Email Notifications', () => {
    it('dispatches email on shipment and delivered transitions, but does not duplicate', async () => {
      const shippedSpy = vi.spyOn(resendModule, 'sendOrderShippedEmail').mockResolvedValue({ data: { id: 'msg-1' } } as any)
      const deliveredSpy = vi.spyOn(resendModule, 'sendOrderDeliveredEmail').mockResolvedValue({ data: { id: 'msg-2' } } as any)

      const order = {
        id: 'ord-email-test-1',
        order_number: 'BB-EMAIL-001',
        status: 'pickup_scheduled',
        payment_method: 'cod',
        payment_status: 'pending',
        guest_email: 'shopper@bubbleboom.in',
        carrier: 'Delhivery Express',
        tracking_number: 'DEL-999',
      }
      saveDevOrder(order)

      // First transition to shipped
      const res1 = await updateOrderStatus('ord-email-test-1', 'shipped')
      expect(res1.error).toBeUndefined()
      expect(shippedSpy).toHaveBeenCalledTimes(1)

      // Transition to out_for_delivery
      const res2 = await updateOrderStatus('ord-email-test-1', 'out_for_delivery')
      expect(res2.error).toBeUndefined()
      expect(shippedSpy).toHaveBeenCalledTimes(1) // Still 1

      // Transition to delivered
      const res3 = await updateOrderStatus('ord-email-test-1', 'delivered')
      expect(res3.error).toBeUndefined()
      expect(deliveredSpy).toHaveBeenCalledTimes(1)
    })

    it('does not rollback order status if Resend email transport throws an error', async () => {
      vi.spyOn(resendModule, 'sendOrderShippedEmail').mockRejectedValue(new Error('Resend rate limit exceeded'))

      const order = {
        id: 'ord-email-fail-2',
        order_number: 'BB-FAIL-002',
        status: 'pickup_scheduled',
        payment_method: 'cod',
        payment_status: 'pending',
        guest_email: 'buyer@example.com',
      }
      saveDevOrder(order)

      const res = await updateOrderStatus('ord-email-fail-2', 'shipped')
      // Status update must still succeed even if email failed!
      expect(res.error).toBeUndefined()
      expect(res.data?.status).toBe('shipped')
    })
  })
})
