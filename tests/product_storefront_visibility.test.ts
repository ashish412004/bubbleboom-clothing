import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProducts, getProductBySlug } from '@/lib/products'

describe('Storefront Product Visibility Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('correctly maps and returns published products when fetched', async () => {
    const products = await getProducts()
    expect(Array.isArray(products)).toBe(true)
    // Products should have parsed images with valid structure
    for (const p of products) {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('name')
      expect(p).toHaveProperty('slug')
      expect(Array.isArray(p.images)).toBe(true)
      expect(Array.isArray(p.variants)).toBe(true)
      for (const img of p.images) {
        expect(img).toHaveProperty('image_url')
        expect(typeof img.image_url).toBe('string')
      }
    }
  })

  it('filters products by category slug (case-insensitive)', async () => {
    const hoodies = await getProducts({ category: 'hoodies' })
    expect(Array.isArray(hoodies)).toBe(true)
    for (const h of hoodies) {
      if (h.category?.slug) {
        expect(h.category.slug.toLowerCase()).toBe('hoodies')
      }
    }

    const uppercaseHoodies = await getProducts({ category: 'HOODIES' })
    expect(uppercaseHoodies.length).toBe(hoodies.length)
  })

  it('returns empty array cleanly for a category without products without crashing', async () => {
    const nonexistent = await getProducts({ category: 'nonexistent-category-slug' })
    expect(Array.isArray(nonexistent)).toBe(true)
    expect(nonexistent.length).toBe(0)
  })
})
