import { describe, it, expect, beforeEach } from 'vitest'
import { getStoreSettings, clearStoreSettingsCache } from '@/lib/settings'
import { getCategories, clearCategoriesCache } from '@/lib/categories'
import { getCollections, clearCollectionsCache } from '@/lib/collections'
import { getProducts, clearProductCache } from '@/lib/products'
import { calculateCartTotals } from '@/lib/cart'

describe('Performance & Optimistic Cart Optimization Suite', () => {
  beforeEach(() => {
    clearStoreSettingsCache()
    clearCategoriesCache()
    clearCollectionsCache()
    clearProductCache()
  })

  describe('1. In-Memory Micro-Caching & Fast Path Latency', () => {
    it('returns store settings from cache on repeated calls', async () => {
      const first = await getStoreSettings('shipping')
      expect(first).toBeDefined()
      expect(first.free_shipping_threshold_paise).toBe(149900)

      const start = performance.now()
      const second = await getStoreSettings('shipping')
      const duration = performance.now() - start

      expect(second).toEqual(first)
      expect(duration).toBeLessThan(15) // Sub-15ms cached return
    })

    it('returns categories from cache on repeated calls', async () => {
      const first = await getCategories()
      expect(first.length).toBeGreaterThan(0)

      const start = performance.now()
      const second = await getCategories()
      const duration = performance.now() - start

      expect(second).toEqual(first)
      expect(duration).toBeLessThan(15)
    })

    it('returns collections from cache on repeated calls', async () => {
      const first = await getCollections(true)
      expect(first.length).toBeGreaterThan(0)

      const start = performance.now()
      const second = await getCollections(true)
      const duration = performance.now() - start

      expect(second).toEqual(first)
      expect(duration).toBeLessThan(15)
    })

    it('returns products from cache on repeated calls with identical filters', async () => {
      const filters = { sortBy: 'created_at' as const, sortOrder: 'desc' as const }
      const first = await getProducts(filters)

      const start = performance.now()
      const second = await getProducts(filters)
      const duration = performance.now() - start

      expect(second.length).toBe(first.length)
      expect(duration).toBeLessThan(15)
    })
  })

  describe('2. Authoritative & Optimistic Cart Calculations', () => {
    it('computes exact paise precision and free shipping threshold', () => {
      // Mock cart items below threshold (e.g. ₹999)
      const itemsBelow: any[] = [
        {
          id: 'item-1',
          quantity: 1,
          variant: {
            product: {
              selling_price: 999,
            },
          },
        },
      ]

      const summaryBelow = calculateCartTotals(itemsBelow)
      expect(summaryBelow.subtotal_paise).toBe(99900)
      expect(summaryBelow.shipping_paise).toBe(9900) // Standard shipping applied below ₹1499
      expect(summaryBelow.total_paise).toBe(99900 + 9900)

      // Mock cart items above threshold (e.g. ₹1998)
      const itemsAbove: any[] = [
        {
          id: 'item-1',
          quantity: 2,
          variant: {
            product: {
              selling_price: 999,
            },
          },
        },
      ]

      const summaryAbove = calculateCartTotals(itemsAbove)
      expect(summaryAbove.subtotal_paise).toBe(199800)
      expect(summaryAbove.shipping_paise).toBe(0) // FREE shipping unlocked!
      expect(summaryAbove.total_paise).toBe(199800)
    })

    it('accurately applies promotional discounts without reducing total below zero', () => {
      const items: any[] = [
        {
          id: 'item-1',
          quantity: 1,
          variant: {
            product: {
              selling_price: 2000,
            },
          },
        },
      ]

      // 10% discount on ₹2000 = ₹200 (20000 paise)
      const summaryWithDiscount = calculateCartTotals(items, 20000)
      expect(summaryWithDiscount.subtotal_paise).toBe(200000)
      expect(summaryWithDiscount.discount_paise).toBe(20000)
      expect(summaryWithDiscount.shipping_paise).toBe(0) // > 1499
      expect(summaryWithDiscount.total_paise).toBe(180000)
    })
  })
})
