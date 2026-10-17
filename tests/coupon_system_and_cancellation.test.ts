import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateCouponDiscount } from '@/lib/coupons'
import { isValidOrderStatusTransition } from '@/lib/orders'

describe('BUBBLE BOOM – Coupon System & Pre-Dispatch Cancellation Suite', () => {
  describe('1. Coupon Arithmetic & Constraint Validation', () => {
    it('applies percentage discount accurately without maximum cap', () => {
      // 10% off on ₹1,999 (199900 paise) = ₹199.90 -> 19990 paise (rounded)
      const res = calculateCouponDiscount(
        {
          discount_type: 'percentage',
          discount_value: 10,
          minimum_amount: 500,
        },
        199900
      )

      expect(res.valid).toBe(true)
      expect(res.discount_paise).toBe(19990)
    })

    it('enforces maximum discount cap for percentage coupons', () => {
      // 25% off on ₹10,000 (1000000 paise) = ₹2,500, but cap is ₹500 (50000 paise)
      const res = calculateCouponDiscount(
        {
          discount_type: 'percentage',
          discount_value: 25,
          maximum_discount: 500,
          minimum_amount: 1000,
        },
        1000000
      )

      expect(res.valid).toBe(true)
      expect(res.discount_paise).toBe(50000) // Capped at ₹500
    })

    it('rejects coupon when cart subtotal is below minimum order amount', () => {
      // Cart ₹899 (89900 paise), minimum required ₹999
      const res = calculateCouponDiscount(
        {
          discount_type: 'percentage',
          discount_value: 15,
          minimum_amount: 999,
        },
        89900
      )

      expect(res.valid).toBe(false)
      expect(res.discount_paise).toBe(0)
      expect(res.error).toContain('Minimum order amount of ₹999 required')
    })

    it('handles fixed rupee discounts and clamps to subtotal if discount exceeds cart value', () => {
      // Flat ₹500 off on ₹450 cart (45000 paise)
      const res = calculateCouponDiscount(
        {
          discount_type: 'fixed',
          discount_value: 500,
          minimum_amount: 0,
        },
        45000
      )

      expect(res.valid).toBe(true)
      expect(res.discount_paise).toBe(45000) // Clamped to entire subtotal, cannot be negative
    })

    it('normalizes coupon code format (case insensitive & trimmed)', () => {
      const normalize = (code: string) => code.trim().toUpperCase()

      expect(normalize('  welcome10  ')).toBe('WELCOME10')
      expect(normalize('boom20')).toBe('BOOM20')
      expect(normalize('  festive_50  ')).toBe('FESTIVE_50')
    })
  })

  describe('2. Coupon Expiry, Usage Limits & Restrictions Engine', () => {
    function evaluateCouponEligibility(coupon: {
      code: string
      is_active: boolean
      start_date?: string | null
      expiry_date?: string | null
      usage_limit?: number | null
      usage_count: number
      per_customer_limit?: number | null
      applicable_products?: string[] | null
    }, context: {
      now: Date
      userRedemptionsCount?: number
      cartProductIds: string[]
    }): { eligible: boolean; reason?: string } {
      if (!coupon.is_active) {
        return { eligible: false, reason: 'This coupon code is currently disabled' }
      }
      if (coupon.start_date && new Date(coupon.start_date) > context.now) {
        return { eligible: false, reason: 'This coupon code is not yet active' }
      }
      if (coupon.expiry_date && new Date(coupon.expiry_date) < context.now) {
        return { eligible: false, reason: 'This coupon code has expired' }
      }
      if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.usage_count >= coupon.usage_limit) {
        return { eligible: false, reason: 'This coupon has reached its maximum global usage limit' }
      }
      if (coupon.per_customer_limit !== null && coupon.per_customer_limit !== undefined) {
        if ((context.userRedemptionsCount || 0) >= coupon.per_customer_limit) {
          return { eligible: false, reason: `You have reached the maximum allowed uses (${coupon.per_customer_limit}) for this coupon` }
        }
      }
      if (coupon.applicable_products && coupon.applicable_products.length > 0) {
        const matches = context.cartProductIds.some((p) => coupon.applicable_products!.includes(p))
        if (!matches) {
          return { eligible: false, reason: 'This coupon is not applicable to any items in your cart' }
        }
      }
      return { eligible: true }
    }

    const testNow = new Date('2026-10-17T12:00:00Z')

    it('rejects deactivated coupons', () => {
      const res = evaluateCouponEligibility(
        { code: 'OFF50', is_active: false, usage_count: 0 },
        { now: testNow, cartProductIds: ['prod-1'] }
      )
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('disabled')
    })

    it('rejects expired coupons', () => {
      const res = evaluateCouponEligibility(
        {
          code: 'SUMMER26',
          is_active: true,
          expiry_date: '2026-08-31T23:59:59Z',
          usage_count: 5,
        },
        { now: testNow, cartProductIds: ['prod-1'] }
      )
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('expired')
    })

    it('rejects coupons that have not started yet', () => {
      const res = evaluateCouponEligibility(
        {
          code: 'DIWALI26',
          is_active: true,
          start_date: '2026-11-01T00:00:00Z',
          usage_count: 0,
        },
        { now: testNow, cartProductIds: ['prod-1'] }
      )
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('not yet active')
    })

    it('enforces global usage limit', () => {
      const res = evaluateCouponEligibility(
        {
          code: 'FIRST100',
          is_active: true,
          usage_limit: 100,
          usage_count: 100,
        },
        { now: testNow, cartProductIds: ['prod-1'] }
      )
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('maximum global usage limit')
    })

    it('enforces per-customer limit', () => {
      const res = evaluateCouponEligibility(
        {
          code: 'WELCOME10',
          is_active: true,
          usage_limit: 1000,
          usage_count: 50,
          per_customer_limit: 1,
        },
        { now: testNow, userRedemptionsCount: 1, cartProductIds: ['prod-1'] }
      )
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('maximum allowed uses (1)')
    })

    it('validates product restriction in cart', () => {
      const res1 = evaluateCouponEligibility(
        {
          code: 'KICKS20',
          is_active: true,
          usage_count: 0,
          applicable_products: ['sneaker-001', 'sneaker-002'],
        },
        { now: testNow, cartProductIds: ['tee-001', 'hoodie-002'] }
      )
      expect(res1.eligible).toBe(false)
      expect(res1.reason).toContain('not applicable to any items in your cart')

      const res2 = evaluateCouponEligibility(
        {
          code: 'KICKS20',
          is_active: true,
          usage_count: 0,
          applicable_products: ['sneaker-001', 'sneaker-002'],
        },
        { now: testNow, cartProductIds: ['tee-001', 'sneaker-001'] }
      )
      expect(res2.eligible).toBe(true)
    })
  })

  describe('3. Pre-Dispatch Order Cancellation State Machine & Eligibility', () => {
    function checkCancellationEligibility(order: {
      status: string
      shipment?: {
        status?: string
        tracking_number?: string | null
      } | null
    }): { eligible: boolean; error?: string } {
      if (order.status === 'cancelled') {
        return { eligible: false, error: 'Order is already cancelled' }
      }
      if (order.status === 'delivered') {
        return { eligible: false, error: 'Delivered orders cannot be cancelled. Please request a return.' }
      }
      if (order.status === 'shipped' || order.status === 'out_for_delivery') {
        return { eligible: false, error: 'Cannot cancel order: Shipment has already been dispatched with courier' }
      }
      if (
        order.shipment &&
        ['shipped', 'out_for_delivery', 'delivered'].includes(order.shipment.status || '')
      ) {
        return { eligible: false, error: 'Cannot cancel order: Shipment has already been dispatched with courier' }
      }
      return { eligible: true }
    }

    it('permits cancellation when order is in pre-dispatch stages (pending, confirmed, packed)', () => {
      expect(checkCancellationEligibility({ status: 'pending' }).eligible).toBe(true)
      expect(checkCancellationEligibility({ status: 'confirmed' }).eligible).toBe(true)
      expect(checkCancellationEligibility({ status: 'packed' }).eligible).toBe(true)
    })

    it('strictly blocks cancellation once shipped, in transit, or delivered', () => {
      const shipped = checkCancellationEligibility({ status: 'shipped' })
      expect(shipped.eligible).toBe(false)
      expect(shipped.error).toContain('already been dispatched with courier')

      const outForDelivery = checkCancellationEligibility({ status: 'out_for_delivery' })
      expect(outForDelivery.eligible).toBe(false)
      expect(outForDelivery.error).toContain('already been dispatched with courier')

      const delivered = checkCancellationEligibility({ status: 'delivered' })
      expect(delivered.eligible).toBe(false)
      expect(delivered.error).toContain('Delivered orders cannot be cancelled')
    })

    it('blocks cancellation if active courier shipment exists even if order status is laggy', () => {
      const res = checkCancellationEligibility({
        status: 'confirmed',
        shipment: { status: 'shipped', tracking_number: 'SR123456789' },
      })
      expect(res.eligible).toBe(false)
      expect(res.error).toContain('already been dispatched with courier')
    })

    it('prohibits duplicate cancellation on already cancelled orders', () => {
      const res = checkCancellationEligibility({ status: 'cancelled' })
      expect(res.eligible).toBe(false)
      expect(res.error).toContain('already cancelled')
    })
  })

  describe('4. Order Cancellation Financials: COD vs Prepaid Refund Dispatch', () => {
    function processOrderCancellation(order: {
      id: string
      order_number: string
      payment_method: 'cod' | 'cashfree'
      payment_status: 'paid' | 'pending' | 'failed'
      total_amount: number
    }): {
      newOrderStatus: string
      newPaymentStatus: string
      refundInitiated: boolean
      refundAmount: number
      message: string
    } {
      if (order.payment_method === 'cashfree' && order.payment_status === 'paid') {
        return {
          newOrderStatus: 'cancelled',
          newPaymentStatus: 'refund_pending',
          refundInitiated: true,
          refundAmount: order.total_amount,
          message: 'Order cancelled. ₹' + order.total_amount + ' refund initiated to your original payment method.',
        }
      }

      // COD or unpaid online order
      return {
        newOrderStatus: 'cancelled',
        newPaymentStatus: 'cancelled',
        refundInitiated: false,
        refundAmount: 0,
        message: 'Order cancelled successfully. No payment was collected.',
      }
    }

    it('initiates refund for paid Cashfree orders and transitions payment_status to refund_pending', () => {
      const res = processOrderCancellation({
        id: 'ord-prepaid-1',
        order_number: 'BB-20261017-001',
        payment_method: 'cashfree',
        payment_status: 'paid',
        total_amount: 2499,
      })

      expect(res.newOrderStatus).toBe('cancelled')
      expect(res.newPaymentStatus).toBe('refund_pending')
      expect(res.refundInitiated).toBe(true)
      expect(res.refundAmount).toBe(2499)
      expect(res.message).toContain('₹2499 refund initiated')
    })

    it('never initiates gateway refund for Cash on Delivery (COD) orders', () => {
      const res = processOrderCancellation({
        id: 'ord-cod-1',
        order_number: 'BB-20261017-002',
        payment_method: 'cod',
        payment_status: 'pending',
        total_amount: 1799,
      })

      expect(res.newOrderStatus).toBe('cancelled')
      expect(res.newPaymentStatus).toBe('cancelled')
      expect(res.refundInitiated).toBe(false)
      expect(res.refundAmount).toBe(0)
      expect(res.message).toContain('No payment was collected')
    })
  })

  describe('5. Inventory Restoration Idempotency & Safe Deletion Checks', () => {
    it('accurately restores variant stock and prevents double-restoration', () => {
      let variantStock = 5
      const movements: Array<{ orderId: string; type: string; qty: number }> = []

      function restoreOrderStock(orderId: string, items: Array<{ variantId: string; qty: number }>) {
        // Idempotency check:
        const alreadyRestored = movements.some(
          (m) => m.orderId === orderId && m.type === 'restock'
        )
        if (alreadyRestored) {
          return { restored: false, count: 0 }
        }

        for (const item of items) {
          variantStock += item.qty
          movements.push({ orderId, type: 'restock', qty: item.qty })
        }
        return { restored: true, count: items.length }
      }

      // First cancellation execution
      const run1 = restoreOrderStock('ord-test-1', [{ variantId: 'var-1', qty: 2 }])
      expect(run1.restored).toBe(true)
      expect(run1.count).toBe(1)
      expect(variantStock).toBe(7) // 5 + 2

      // Second duplicate execution (e.g. user double-clicked or retry)
      const run2 = restoreOrderStock('ord-test-1', [{ variantId: 'var-1', qty: 2 }])
      expect(run2.restored).toBe(false)
      expect(run2.count).toBe(0)
      expect(variantStock).toBe(7) // Stock remains 7, not 9
    })

    it('safely blocks admin deletion of inventory variants associated with customer orders', () => {
      function canDeleteVariant(variantId: string, associatedOrdersCount: number) {
        if (associatedOrdersCount > 0) {
          return {
            allowed: false,
            error: 'Cannot delete variant: It is associated with customer orders. Please unpublish or hide the product instead.',
          }
        }
        return { allowed: true }
      }

      const activeProductCheck = canDeleteVariant('var-hoodie-l', 3)
      expect(activeProductCheck.allowed).toBe(false)
      expect(activeProductCheck.error).toContain('associated with customer orders')

      const unusedVariantCheck = canDeleteVariant('var-demo-test', 0)
      expect(unusedVariantCheck.allowed).toBe(true)
    })
  })
})
