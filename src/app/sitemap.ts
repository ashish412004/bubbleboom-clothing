import { MetadataRoute } from 'next'
import { getAppOrigin } from '@/lib/origin'
import { getCollections } from '@/lib/collections'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppOrigin()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.5,
    },
  ]

  try {
    const publishedCollections = await getCollections(false)
    const collectionRoutes: MetadataRoute.Sitemap = publishedCollections
      .filter((c) => Boolean(c.slug) && c.is_visible)
      .map((c) => ({
        url: `${baseUrl}/collections/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }))

    return [...staticRoutes, ...collectionRoutes]
  } catch {
    return staticRoutes
  }
}
