import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCollections,
  getCollectionBySlug,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  clearCollectionsCache,
  getProductsByCollectionId,
  getAvailableProductsForCollection,
} from '@/lib/collections'
import { MOCK_COLLECTIONS } from '@/lib/mock-data'
import sitemap from '@/app/sitemap'

describe('Collections Management & Unwanted Collections Removal', () => {
  beforeEach(() => {
    clearCollectionsCache()
  })

  describe('PHASE 1: Unwanted Collections Cleanup & Preservation of Monochrome Kicks', () => {
    it('does not contain Monochrome Originals in public collections', async () => {
      const collections = await getCollections(false)
      const unwanted1 = collections.find((c) => c.slug === 'monochrome-originals' || c.name.toLowerCase().includes('monochrome originals'))
      expect(unwanted1).toBeUndefined()
    })

    it('does not contain Urban Essentials in public collections', async () => {
      const collections = await getCollections(false)
      const unwanted2 = collections.find((c) => c.slug === 'urban-essentials' || c.name.toLowerCase().includes('urban essentials'))
      expect(unwanted2).toBeUndefined()
    })

    it('preserves BUBBLE BOOM – MONOCHROME KICKS as the active public collection', async () => {
      const collections = await getCollections(false)
      const kicks = collections.find((c) => c.slug === 'bubble-boom-monochrome-kicks')
      expect(kicks).toBeDefined()
      expect(kicks?.name).toBe('BUBBLE BOOM – MONOCHROME KICKS')
      expect(kicks?.banner_image_url).toContain('bubble-boom-black-white-chunky-sneaker.png')
      expect(kicks?.is_visible).toBe(true)
    })

    it('ensures MOCK_COLLECTIONS fallback dataset only retains Monochrome Kicks', () => {
      const slugs = MOCK_COLLECTIONS.map((c) => c.slug)
      expect(slugs).toContain('bubble-boom-monochrome-kicks')
      expect(slugs).not.toContain('monochrome-originals')
      expect(slugs).not.toContain('urban-essentials')
    })
  })

  describe('PHASE 2–10: Admin Collection CRUD, Product Assignment & Metadata Controls', () => {
    it('fetches collections including drafts when includeDrafts is true', async () => {
      const all = await getCollections(true)
      expect(Array.isArray(all)).toBe(true)
      expect(all.length).toBeGreaterThan(0)
    })

    it('fetches collection by slug and includes assigned products', async () => {
      const col = await getCollectionBySlug('bubble-boom-monochrome-kicks')
      expect(col).toBeDefined()
      expect(col?.slug).toBe('bubble-boom-monochrome-kicks')
      expect(col?.name).toBe('BUBBLE BOOM – MONOCHROME KICKS')
      expect(col?.product_count).toBeGreaterThanOrEqual(1)
    })

    it('returns null for nonexistent collection slugs', async () => {
      const col = await getCollectionBySlug('nonexistent-drop-slug-9999')
      expect(col).toBeNull()
    })

    it('supports creating a new collection and updating its visibility and featured state', async () => {
      const testSlug = `test-capsule-${Date.now()}`
      const created = await createCollection({
        name: 'Unit Test Capsule Drop',
        slug: testSlug,
        description: 'Automated test capsule description',
        banner_image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
        sort_order: 99,
        is_visible: false, // draft
        is_featured: false,
      })

      expect(created.data).toBeDefined()
      expect(created.data?.slug).toBe(testSlug)
      expect(created.data?.is_visible).toBe(false)

      // Verify draft collection does not appear in public collections
      clearCollectionsCache()
      const publicCols = await getCollections(false)
      expect(publicCols.find((c) => c.slug === testSlug)).toBeUndefined()

      // Update collection to published and featured
      const updated = await updateCollection(created.data!.id, {
        is_visible: true,
        is_featured: true,
        description: 'Updated narrative',
      })
      expect(updated.data).toBeDefined()

      // Clean up test collection safely
      await deleteCollection(created.data!.id)
      clearCollectionsCache()
      const afterDelete = await getCollectionBySlug(testSlug)
      expect(afterDelete).toBeNull()
    })
  })

  describe('PHASE 11–14: Storefront & Dynamic Sitemap Integration', () => {
    it('sitemap includes published collections and excludes draft collections', async () => {
      const sitemapEntries = await sitemap()
      expect(Array.isArray(sitemapEntries)).toBe(true)

      const urls = sitemapEntries.map((e) => e.url)
      // Monochrome Kicks must be in sitemap
      const hasMonochromeKicks = urls.some((u) => u.includes('/collections/bubble-boom-monochrome-kicks'))
      expect(hasMonochromeKicks).toBe(true)

      // Unwanted collections must not be in sitemap
      const hasMonochromeOriginals = urls.some((u) => u.includes('/collections/monochrome-originals'))
      const hasUrbanEssentials = urls.some((u) => u.includes('/collections/urban-essentials'))
      expect(hasMonochromeOriginals).toBe(false)
      expect(hasUrbanEssentials).toBe(false)
    })
  })
})
