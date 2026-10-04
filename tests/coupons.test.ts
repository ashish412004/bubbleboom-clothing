import { describe, it, expect } from 'vitest'
import { calculateCouponDiscount } from '@/lib/coupons'

describe('Coupon Validation & Discount Arithmetic', () => {
  it('applies percentage discount accurately without cap', () => {
    // 10% off on ₹2,000 (200000 paise) = ₹200 (20000 paise)
    const result = calculateCouponDiscount(
      {
        discount_type: 'percentage',
        discount_value: 10,
        minimum_amount: 1000,
        maximum_discount: null,
      },
      200000
    )

    expect(result.valid).toBe(true)
    expect(result.discount_paise).toBe(20000)
  })

  it('strictly enforces maximum discount cap when percentage discount exceeds limit', () => {
    // 20% off on ₹10,000 = ₹2,000, but cap is ₹500 (50000 paise)
    const result = calculateCouponDiscount(
      {
        discount_type: 'percentage',
        discount_value: 20,
        minimum_amount: 1000,
        maximum_discount: 500,
      },
      1000000
    )

    expect(result.valid).toBe(true)
    expect(result.discount_paise).toBe(50000) // capped at ₹500
  })

  it('rejects coupon when cart subtotal is below minimum order threshold', () => {
    // Min spend ₹1,499, cart has ₹1,200 (120000 paise)
    const result = calculateCouponDiscount(
      {
        discount_type: 'percentage',
        discount_value: 15,
        minimum_amount: 1499,
      },
      120000
    )

    expect(result.valid).toBe(false)
    expect(result.discount_paise).toBe(0)
    expect(result.error).toContain('Minimum order amount of ₹1499 required')
  })

  it('calculates fixed rupee discount and does not exceed subtotal', () => {
    // Flat ₹300 off on ₹2,500 cart
    const result = calculateCouponDiscount(
      {
        discount_type: 'fixed',
        discount_value: 300,
        minimum_amount: 500,
      },
      250000
    )

    expect(result.valid).toBe(true)
    expect(result.discount_paise).toBe(30000) // ₹300 in paise
  })

  it('caps fixed discount to subtotal if discount is greater than cart value', () => {
    // Flat ₹500 off on ₹400 cart
    const result = calculateCouponDiscount(
      {
        discount_type: 'fixed',
        discount_value: 500,
        minimum_amount: 0,
      },
      40000
    )

    expect(result.valid).toBe(true)
    expect(result.discount_paise).toBe(40000) // capped to subtotal
  })
})
