import { describe, it, expect } from 'vitest'
import { calculateCartTotals } from '@/lib/cart'

describe('Pricing & Integer Paise Arithmetic', () => {
  it('correctly calculates integer paise for single item below free shipping threshold', () => {
    // 1 tee at ₹999 (99900 paise)
    const items = [
      {
        variant_id: 'v1',
        quantity: 1,
        variant: {
          stock: 10,
          product: {
            id: 'p1',
            mrp: 1999,
            selling_price: 999,
            is_published: true,
          },
        },
      },
    ]

    const totals = calculateCartTotals(items, 0, false)

    expect(totals.subtotal_paise).toBe(99900)
    expect(totals.discount_paise).toBe(0)
    // Under ₹1,499 threshold (149900 paise), standard shipping of ₹99 (9900 paise) applies
    expect(totals.shipping_paise).toBe(9900)
    expect(totals.cod_fee_paise).toBe(0)
    expect(totals.total_paise).toBe(99900 + 9900)
    expect(totals.total_paise).toBe(109800)
  })

  it('correctly waives shipping when cart subtotal meets or exceeds ₹1,499 free shipping threshold', () => {
    // 2 tees at ₹999 = ₹1,998 (199800 paise)
    const items = [
      {
        variant_id: 'v1',
        quantity: 2,
        variant: {
          stock: 10,
          product: {
            id: 'p1',
            mrp: 1999,
            selling_price: 999,
            is_published: true,
          },
        },
      },
    ]

    const totals = calculateCartTotals(items, 0, false)

    expect(totals.subtotal_paise).toBe(199800)
    expect(totals.shipping_paise).toBe(0) // Free delivery!
    expect(totals.total_paise).toBe(199800)
  })

  it('correctly applies COD convenience fee of ₹50 (5000 paise)', () => {
    const items = [
      {
        variant_id: 'v1',
        quantity: 2,
        variant: {
          stock: 10,
          product: {
            id: 'p1',
            mrp: 1999,
            selling_price: 999,
            is_published: true,
          },
        },
      },
    ]

    const totals = calculateCartTotals(items, 0, true)

    expect(totals.subtotal_paise).toBe(199800)
    expect(totals.shipping_paise).toBe(0)
    expect(totals.cod_fee_paise).toBe(5000)
    expect(totals.total_paise).toBe(199800 + 5000)
  })

  it('never produces negative total after applying large discounts', () => {
    const items = [
      {
        variant_id: 'v1',
        quantity: 1,
        variant: {
          stock: 5,
          product: {
            id: 'p1',
            mrp: 500,
            selling_price: 300,
            is_published: true,
          },
        },
      },
    ]

    // Discount of ₹500 on ₹300 cart
    const totals = calculateCartTotals(items, 50000, false)

    expect(totals.subtotal_paise).toBe(30000)
    // Total should floor at 0 (or shipping fee)
    expect(totals.total_paise).toBeGreaterThanOrEqual(0)
  })
})
