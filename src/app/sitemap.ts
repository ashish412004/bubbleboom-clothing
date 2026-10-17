import { MetadataRoute } from 'next'
import { getCollections } from '@/lib/collections'
import { getCategories } from '@/lib/categories'
import { getProducts, isProductTest } from '@/lib/products'

export const OFFICIAL_DOMAIN = 'https://bubbleboomstore.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = OFFICIAL_DOMAIN

  // 1. Core Public Static Pages (strictly excludes cart, checkout, admin, account, and auth)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/size-guide`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/track-order`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/shipping-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/returns-refunds`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // 2. Published Categories
  let categoryRoutes: MetadataRoute.Sitemap = []
  try {
    const categories = await getCategories(false)
    categoryRoutes = categories
      .filter((c) => Boolean(c.slug) && c.is_active)
      .map((c) => ({
        url: `${baseUrl}/shop?category=${encodeURIComponent(c.slug)}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (catErr) {
    console.warn('[sitemap] Failed to load categories for sitemap:', catErr)
  }

  // 3. Published Visible Collections
  let collectionRoutes: MetadataRoute.Sitemap = []
  try {
    const publishedCollections = await getCollections(false)
    collectionRoutes = publishedCollections
      .filter((c) => Boolean(c.slug) && c.is_visible)
      .map((c) => ({
        url: `${baseUrl}/collections/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (colErr) {
    console.warn('[sitemap] Failed to load collections for sitemap:', colErr)
  }

  // 4. LIVE Products ONLY (strictly excludes TEST/DEMO and Draft items)
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const products = await getProducts()
    productRoutes = products
      .filter((p) => Boolean(p.slug) && p.is_published && p.is_active && !isProductTest(p))
      .map((p) => ({
        url: `${baseUrl}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }))
  } catch (prodErr) {
    console.warn('[sitemap] Failed to load products for sitemap:', prodErr)
  }

  return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes]
}
