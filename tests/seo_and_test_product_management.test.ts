import { describe, it, expect } from 'vitest'
import { isProductTest, getProductMode, validateProductForLive } from '@/lib/products'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import { OFFICIAL_DOMAIN } from '@/lib/origin'

describe('Bubble Boom – SEO Setup & Test Product Management Suite', () => {
  describe('1. Test Product Classification & Detection', () => {
    it('accurately identifies test products via explicit product_mode', () => {
      expect(isProductTest({ product_mode: 'test' })).toBe(true)
      expect(getProductMode({ product_mode: 'test' })).toBe('test')

      expect(isProductTest({ product_mode: 'live' })).toBe(false)
      expect(getProductMode({ product_mode: 'live' })).toBe('live')
    })

    it('accurately identifies test products via is_test boolean flag', () => {
      expect(isProductTest({ is_test: true })).toBe(true)
      expect(isProductTest({ is_test: false, product_mode: 'live' })).toBe(false)
    })

    it('accurately identifies test products via tags array', () => {
      expect(isProductTest({ tags: ['mode:test', 'summer'] })).toBe(true)
      expect(isProductTest({ tags: ['test-product'] })).toBe(true)
      expect(isProductTest({ tags: ['mode:live'], product_mode: 'live' })).toBe(false)
    })

    it('detects demo / test keywords in title or slug as fallback', () => {
      expect(isProductTest({ name: 'Demo Acid Wash Hoodie', slug: 'demo-acid-wash' })).toBe(true)
      expect(isProductTest({ name: 'Sample Tee', slug: 'sample-tee' })).toBe(true)
      expect(isProductTest({ name: 'Test Boxy Tee', slug: 'test-boxy' })).toBe(true)
    })

    it('defaults safely to test mode if product is ambiguous / unclassified', () => {
      expect(isProductTest({})).toBe(true)
      expect(getProductMode({})).toBe('test')
    })
  })

  describe('2. Live Conversion Validation Rules', () => {
    const validBaseProduct = {
      name: 'Bubble Boom Heavyweight Tee',
      slug: 'bubble-boom-heavyweight-tee',
      category_id: 'cat_streetwear_123',
      description: '100% French Terry Cotton 280 GSM oversized fit tee.',
      selling_price: 1499,
      mrp: 2499,
      is_published: true,
      is_active: true,
    }

    const validVariants = [
      { id: 'v1', size: 'M', color: 'Vintage Black', stock: 15, is_active: true },
      { id: 'v2', size: 'L', color: 'Vintage Black', stock: 20, is_active: true },
    ]

    const validImages = [
      { id: 'img1', image_url: 'https://images.bubbleboomstore.com/tee-front.jpg' },
      { id: 'img2', image_url: 'https://images.bubbleboomstore.com/tee-back.jpg' },
    ]

    it('passes validation when all production requirements are satisfied', () => {
      const result = validateProductForLive(validBaseProduct, validVariants, validImages)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when product title or slug is missing', () => {
      const result = validateProductForLive({ ...validBaseProduct, name: '' }, validVariants, validImages)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Product name'))).toBe(true)
    })

    it('fails when selling price is zero or negative', () => {
      const result = validateProductForLive({ ...validBaseProduct, selling_price: 0 }, validVariants, validImages)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('selling price'))).toBe(true)
    })

    it('fails when MRP is less than selling price', () => {
      const result = validateProductForLive({ ...validBaseProduct, mrp: 1200, selling_price: 1500 }, validVariants, validImages)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('MRP'))).toBe(true)
    })

    it('fails when category is not selected', () => {
      const result = validateProductForLive({ ...validBaseProduct, category_id: '' }, validVariants, validImages)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('category'))).toBe(true)
    })

    it('fails when no product images are uploaded', () => {
      const result = validateProductForLive(validBaseProduct, validVariants, [])
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('photograph'))).toBe(true)
    })

    it('fails when there are no active variants', () => {
      const result = validateProductForLive(validBaseProduct, [{ ...validVariants[0], is_active: false }], validImages)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('variant'))).toBe(true)
    })

    it('fails when all variant stock is zero', () => {
      const zeroStockVariants = validVariants.map(v => ({ ...v, stock: 0 }))
      const result = validateProductForLive(validBaseProduct, zeroStockVariants, validImages)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('stock'))).toBe(true)
    })
  })

  describe('3. Dynamic Sitemap Generation (SEO)', () => {
    it('uses the canonical production origin https://bubbleboomstore.com', async () => {
      expect(OFFICIAL_DOMAIN).toBe('https://bubbleboomstore.com')
      const entries = await sitemap()
      expect(entries.length).toBeGreaterThan(0)
      for (const entry of entries) {
        expect(entry.url.startsWith('https://bubbleboomstore.com')).toBe(true)
      }
    })

    it('includes public pages like home, about, contact, and privacy policy', async () => {
      const entries = await sitemap()
      const urls = entries.map(e => e.url)

      expect(urls).toContain('https://bubbleboomstore.com')
      expect(urls).toContain('https://bubbleboomstore.com/shop')
      expect(urls).toContain('https://bubbleboomstore.com/about')
      expect(urls).toContain('https://bubbleboomstore.com/contact')
      expect(urls).toContain('https://bubbleboomstore.com/privacy-policy')
      expect(urls).toContain('https://bubbleboomstore.com/terms')
      expect(urls).toContain('https://bubbleboomstore.com/returns-refunds')
      expect(urls).toContain('https://bubbleboomstore.com/shipping-policy')
    })

    it('strictly excludes private / sensitive routes from sitemap', async () => {
      const entries = await sitemap()
      const urls = entries.map(e => e.url)

      expect(urls.some(u => u.includes('/admin'))).toBe(false)
      expect(urls.some(u => u.includes('/checkout'))).toBe(false)
      expect(urls.some(u => u.includes('/cart'))).toBe(false)
      expect(urls.some(u => u.includes('/account'))).toBe(false)
      expect(urls.some(u => u.includes('/auth'))).toBe(false)
    })
  })

  describe('4. Dynamic Robots Rules (SEO)', () => {
    it('points to https://bubbleboomstore.com/sitemap.xml and allows public crawling', () => {
      const robotConfig = robots()
      expect(robotConfig.sitemap).toBe('https://bubbleboomstore.com/sitemap.xml')
      expect(robotConfig.host).toBe('https://bubbleboomstore.com')

      const rules = Array.isArray(robotConfig.rules) ? robotConfig.rules[0] : robotConfig.rules
      expect(rules.allow).toBe('/')
      expect(rules.disallow).toContain('/admin')
      expect(rules.disallow).toContain('/account')
      expect(rules.disallow).toContain('/cart')
      expect(rules.disallow).toContain('/checkout')
      expect(rules.disallow).toContain('/api')
      expect(rules.disallow).toContain('/auth')
    })
  })
})
