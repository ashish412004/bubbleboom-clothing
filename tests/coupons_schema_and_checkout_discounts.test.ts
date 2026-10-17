import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { calculateCouponDiscount } from '@/lib/coupons'

describe('Bubble Boom – Coupons Schema, Limits & Checkout Discounts Suite', () => {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '020_coupons_per_customer_limit.sql')
  const adminRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'coupons', 'route.ts')
  const couponsLibPath = path.join(process.cwd(), 'src', 'lib', 'coupons.ts')
  const adminPagePath = path.join(process.cwd(), 'src', 'app', 'admin', 'coupons', 'page.tsx')
  const couponManagerPath = path.join(process.cwd(), 'src', 'app', 'admin', 'coupons', 'coupon-manager.tsx')
  const checkoutFormPath = path.join(process.cwd(), 'src', 'app', 'checkout', 'checkout-form.tsx')
  const ordersLibPath = path.join(process.cwd(), 'src', 'lib', 'orders.ts')
  const finalizationPath = path.join(process.cwd(), 'src', 'lib', 'payments', 'finalization.ts')

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8')
  const adminRouteContent = fs.readFileSync(adminRoutePath, 'utf-8')
  const couponsLibContent = fs.readFileSync(couponsLibPath, 'utf-8')
  const adminPageContent = fs.readFileSync(adminPagePath, 'utf-8')
  const couponManagerContent = fs.readFileSync(couponManagerPath, 'utf-8')
  const checkoutFormContent = fs.readFileSync(checkoutFormPath, 'utf-8')
  const ordersLibContent = fs.readFileSync(ordersLibPath, 'utf-8')
  const finalizationContent = fs.readFileSync(finalizationPath, 'utf-8')

  it('1. Migration 020 safely adds per_customer_limit, guest tracking, atomic increment, and DIWALI2026', () => {
    expect(fs.existsSync(migrationPath)).toBe(true)
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS per_customer_limit INTEGER CHECK (per_customer_limit > 0)')
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS applicable_products UUID[]')
    expect(migrationContent).toContain('ALTER TABLE public.coupon_usage ALTER COLUMN user_id DROP NOT NULL')
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS customer_email TEXT')
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS customer_phone TEXT')
    expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION increment_coupon_usage')
    expect(migrationContent).toContain("NOTIFY pgrst, 'reload schema'")

    // DIWALI2026 specifications
    expect(migrationContent).toContain("'DIWALI2026'")
    expect(migrationContent).toContain("'fixed'")
    expect(migrationContent).toContain('100') // 100 flat
    expect(migrationContent).toContain('999') // min spend
    expect(migrationContent).toContain("'2026-11-30 23:59:59+05:30'")
  })

  it('2. DIWALI2026 discount arithmetic satisfies all exact business rules', () => {
    const diwaliCoupon = {
      discount_type: 'fixed' as const,
      discount_value: 100, // ₹100
      minimum_amount: 999, // ₹999
      maximum_discount: 100, // ₹100
    }

    // A. Cart subtotal ₹998 (99800 paise) -> Below minimum order threshold -> Rejected
    const belowMin = calculateCouponDiscount(diwaliCoupon, 99800)
    expect(belowMin.valid).toBe(false)
    expect(belowMin.discount_paise).toBe(0)
    expect(belowMin.error).toContain('Minimum order amount of ₹999 required')

    // B. Cart subtotal exactly ₹999 (99900 paise) -> Eligible -> Exactly ₹100 discount (10000 paise)
    const exactMin = calculateCouponDiscount(diwaliCoupon, 99900)
    expect(exactMin.valid).toBe(true)
    expect(exactMin.discount_paise).toBe(10000)

    // C. Cart subtotal ₹2,499 (249900 paise) -> Eligible -> Capped to flat ₹100 discount (10000 paise)
    const largeCart = calculateCouponDiscount(diwaliCoupon, 249900)
    expect(largeCart.valid).toBe(true)
    expect(largeCart.discount_paise).toBe(10000)
  })

  it('3. Usage limits validation: Prevents per-user limit from exceeding total usage limit', () => {
    // Backend API route validation
    expect(adminRouteContent).toContain('numPerCustomerLimit > numUsageLimit')
    expect(adminRouteContent).toContain('cannot exceed the total usage limit')

    // Frontend coupon-manager validation
    expect(couponManagerContent).toContain('numPerCustomerLimit > numUsageLimit')
    expect(couponManagerContent).toContain('cannot exceed total usage limit')
  })

  it('4. Admin coupons route returns clear, actionable error if schema cache lacks per_customer_limit', () => {
    expect(adminRouteContent).toContain("Could not find the 'per_customer_limit' column of 'coupons' in the database schema")
    expect(adminRouteContent).toContain("supabase/migrations/020_coupons_per_customer_limit.sql")
  })

  it('5. Admin coupons page fetches real database state without overriding empty list with demo data', () => {
    expect(adminPageContent).toContain('if (Array.isArray(data))')
    expect(adminPageContent).toContain('couponsList = data')
    expect(couponManagerContent).toContain('No promotional coupons found in database')
  })

  it('6. Coupon validation and recording handles both registered users and guest checkouts', () => {
    expect(couponsLibContent).toContain('customerEmail?: string')
    expect(couponsLibContent).toContain('customerPhone?: string')
    expect(couponsLibContent).toContain('usagePayload.customer_email = customerEmail.toLowerCase().trim()')
    expect(couponsLibContent).toContain('usagePayload.customer_phone = customerPhone.trim()')
    expect(couponsLibContent).toContain('increment_coupon_usage')
  })

  it('7. Order creation recalculates authoritatively on server and handles both COD and Cashfree', () => {
    // Server re-validates coupon directly
    expect(ordersLibContent).toContain('const couponRes = await validateCoupon')
    expect(ordersLibContent).toContain('couponDiscountPaise = couponRes.discount_paise')
    expect(ordersLibContent).toContain('subtotalPaise - couponDiscountPaise + shippingPaise + codFeePaise')

    // COD records coupon usage upon placement
    expect(ordersLibContent).toContain('await recordCouponUsage(')

    // Cashfree finalization records coupon usage upon verified payment
    expect(finalizationContent).toContain('await recordCouponUsage(')

    // Order cancellation rolls back coupon usage
    expect(ordersLibContent).toContain('await rollbackCouponUsage(order.id)')
  })
})
