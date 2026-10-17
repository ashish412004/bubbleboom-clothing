import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://bubbleboomstore.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/account',
          '/account/*',
          '/api',
          '/api/*',
          '/cart',
          '/checkout',
          '/login',
          '/signup',
          '/forgot-password',
          '/orders',
          '/orders/*',
          '/payment-return',
          '/auth',
          '/auth/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
