import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCategories,
  getFeaturedCategories,
  getCategoryBySlug,
  getCategoryById,
  resolveCategoryCoverImages,
  getCategoriesWithCovers,
  updateCategory,
  createCategory,
  clearCategoriesCache,
  DEFAULT_FEATURED_CATEGORY_SLUGS,
  Category,
  CategoryWithCover,
} from '@/lib/categories'
import { saveDevProduct, clearProductCache } from '@/lib/products'
import fs from 'fs'
import path from 'path'

describe('Shop By Category & Automatic Category Images Suite', () => {
  beforeEach(() => {
    clearCategoriesCache()
    clearProductCache()

    // Clean up temporary files if any
    try {
      const metaFile = path.join(process.cwd(), '.next', 'bb_category_meta.json')
      if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile)
    } catch {}
  })

  // 1. Homepage displays a maximum of 8 featured categories
  it('1. Homepage displays a maximum of 8 featured categories in designated order', async () => {
    const featured = await getFeaturedCategories(8)
    expect(featured.length).toBeLessThanOrEqual(8)
    expect(featured.length).toBe(8)

    const slugs = featured.map((c) => c.slug)
    expect(slugs).toEqual([
      't-shirts',
      'hoodies',
      'footwear',
      'shirts',
      'jeans',
      'cargos',
      'sweatshirts',
      'joggers',
    ])

    // Shorts and Accessories must not be featured on homepage by default
    expect(slugs).not.toContain('shorts')
    expect(slugs).not.toContain('accessories')
  })

  // 2. Admin can select and reorder featured categories
  it('2. Admin can toggle categories on/off homepage and reorder them', async () => {
    // Admin features Shorts at position 1 and moves T-Shirts to position 9 (off top 8)
    await updateCategory('c1000000-0000-0000-0000-000000000015', {
      show_on_homepage: true,
      homepage_order: 1,
    })
    await updateCategory('c1000000-0000-0000-0000-000000000001', {
      show_on_homepage: false,
    })

    const updatedFeatured = await getFeaturedCategories(8)
    const updatedSlugs = updatedFeatured.map((c) => c.slug)

    expect(updatedSlugs[0]).toBe('shorts')
    expect(updatedSlugs).not.toContain('t-shirts')
    expect(updatedFeatured.length).toBeLessThanOrEqual(8)
  })

  // 3 & 4. Automatic category images match the correct product category
  it('3 & 4. Automatic category images deterministically match the correct category product', async () => {
    // Add mock footwear product with shoes image
    const shoeProduct = {
      id: 'prod-test-shoe-1',
      name: 'Bubble Boom Air Kicks',
      slug: 'bubble-boom-air-kicks',
      category_id: 'c1000000-0000-0000-0000-000000000010', // footwear
      is_published: true,
      is_active: true,
      created_at: '2026-10-10T00:00:00Z',
      images: [
        {
          id: 'img-shoe-1',
          image_url: 'https://cdn.bubbleboom.in/storage/shoes-primary.webp',
          sort_order: 0,
        },
      ],
    }

    // Add mock hoodie product with hoodie image
    const hoodieProduct = {
      id: 'prod-test-hoodie-1',
      name: 'Heavyweight Boxy Hoodie',
      slug: 'heavyweight-boxy-hoodie',
      category_id: 'c1000000-0000-0000-0000-000000000002', // hoodies
      is_published: true,
      is_active: true,
      created_at: '2026-10-10T00:00:00Z',
      images: [
        {
          id: 'img-hoodie-1',
          image_url: 'https://cdn.bubbleboom.in/storage/hoodie-primary.webp',
          sort_order: 0,
        },
      ],
    }

    saveDevProduct(shoeProduct)
    saveDevProduct(hoodieProduct)

    const categories = await getCategories()
    const resolved = await resolveCategoryCoverImages(categories)

    const footwearCat = resolved.find((c) => c.slug === 'footwear')
    const hoodieCat = resolved.find((c) => c.slug === 'hoodies')

    expect(footwearCat).toBeDefined()
    expect(footwearCat?.image_source).toBe('auto_product')
    expect(footwearCat?.cover_image).toBe('https://cdn.bubbleboom.in/storage/shoes-primary.webp')

    expect(hoodieCat).toBeDefined()
    expect(hoodieCat?.image_source).toBe('auto_product')
    expect(hoodieCat?.cover_image).toBe('https://cdn.bubbleboom.in/storage/hoodie-primary.webp')
  })

  // 5. Manual image uploads override automatic images
  it('5. Manual custom cover image upload overrides automatic selection', async () => {
    const customUrl = 'https://cdn.bubbleboom.in/custom-covers/custom-hoodies-cover.jpg'
    await updateCategory('c1000000-0000-0000-0000-000000000002', {
      image_url: customUrl,
    })

    const categories = await getCategories()
    const resolved = await resolveCategoryCoverImages(categories)
    const hoodieCat = resolved.find((c) => c.slug === 'hoodies')

    expect(hoodieCat?.cover_image).toBe(customUrl)
    expect(hoodieCat?.image_source).toBe('custom')
  })

  // 6. Removing a custom image restores automatic selection
  it('6. Removing a custom image restores automatic product image selection', async () => {
    // Set custom then remove it
    await updateCategory('c1000000-0000-0000-0000-000000000002', {
      image_url: 'https://cdn.bubbleboom.in/custom.jpg',
    })
    // Remove custom image
    await updateCategory('c1000000-0000-0000-0000-000000000002', {
      image_url: null,
    })

    const categories = await getCategories()
    const resolved = await resolveCategoryCoverImages(categories)
    const hoodieCat = resolved.find((c) => c.slug === 'hoodies')

    expect(hoodieCat?.image_source).toBe('auto_product')
    expect(hoodieCat?.cover_image).toBe('https://cdn.bubbleboom.in/storage/hoodie-primary.webp')
  })

  // 7. Empty categories display branded fallbacks
  it('7. Empty categories without products or custom image display branded fallback', async () => {
    const categories = await getCategories()
    const resolved = await resolveCategoryCoverImages(categories)

    // Cargos or Joggers currently have no active published products in test env
    const emptyCat = resolved.find((c) => c.slug === 'cargos')
    expect(emptyCat).toBeDefined()
    expect(emptyCat?.cover_image).toBeNull()
    expect(emptyCat?.image_source).toBe('fallback')
  })

  // 8. View All Categories lists all publicly visible categories
  it('8. View All Categories lists all publicly visible categories including non-featured ones', async () => {
    const allCategories = await getCategories(false)
    const slugs = allCategories.map((c) => c.slug)

    // Must include both featured and non-featured categories
    expect(slugs).toContain('t-shirts')
    expect(slugs).toContain('hoodies')
    expect(slugs).toContain('footwear')
    expect(slugs).toContain('shorts')
    expect(slugs).toContain('accessories')
    expect(allCategories.length).toBeGreaterThanOrEqual(10)
  })

  // 9. All category links work
  it('9. All categories provide valid slugs and URLs', async () => {
    const allCategories = await getCategories()
    for (const cat of allCategories) {
      expect(cat.slug).toBeDefined()
      expect(cat.slug.length).toBeGreaterThan(0)
      const targetUrl = `/shop?category=${encodeURIComponent(cat.slug)}`
      expect(targetUrl).toMatch(/^\/shop\?category=[a-z0-9-]+$/)
    }
  })

  // 10. Featured product override works
  it('10. Specific featured product selection takes precedence over auto selection', async () => {
    const specificProd = {
      id: 'prod-special-hoodie',
      name: 'Special Archive Hoodie',
      slug: 'special-archive-hoodie',
      category_id: 'c1000000-0000-0000-0000-000000000002',
      is_published: true,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      images: [
        {
          id: 'img-special',
          image_url: 'https://cdn.bubbleboom.in/special-hoodie.jpg',
          sort_order: 0,
        },
      ],
    }
    saveDevProduct(specificProd)

    await updateCategory('c1000000-0000-0000-0000-000000000002', {
      image_url: null,
      featured_product_id: 'prod-special-hoodie',
    })

    const categories = await getCategories()
    const resolved = await resolveCategoryCoverImages(categories)
    const hoodieCat = resolved.find((c) => c.slug === 'hoodies')

    expect(hoodieCat?.image_source).toBe('featured_product')
    expect(hoodieCat?.cover_image).toBe('https://cdn.bubbleboom.in/special-hoodie.jpg')
    expect(hoodieCat?.featured_product_name).toBe('Special Archive Hoodie')
  })
})
