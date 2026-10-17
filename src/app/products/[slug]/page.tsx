import { notFound } from 'next/navigation'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { ProductCard } from '@/components/product/product-card'
import { getProducts, getProductBySlug, getRelatedProducts, isProductTest } from '@/lib/products'
import { getStoreSettings, StoreShippingSettings, StoreExchangeSettings } from '@/lib/settings'
import { ProductInteractive } from './product-interactive'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 60 // Cache for 60s with Incremental Static Regeneration

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    const products = await getProducts()
    return products.filter((p) => Boolean(p.slug)).map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return {
      title: 'Product Not Found | Bubble Boom',
    }
  }

  const isTest = isProductTest(product)
  const canonicalUrl = `https://bubbleboomstore.com/products/${product.slug}`
  const firstImage = (product as any).images?.[0]?.image_url

  return {
    title: `${product.name} | Bubble Boom`,
    description: (product.description || '').slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: isTest
      ? {
          index: false,
          follow: true,
          nocache: true,
          googleBot: {
            index: false,
            follow: true,
          },
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      title: `${product.name} | Bubble Boom`,
      description: (product.description || '').slice(0, 160),
      url: canonicalUrl,
      images: firstImage ? [{ url: firstImage }] : [],
    },
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const [product, shippingSettings, exchangeSettings] = await Promise.all([
    getProductBySlug(slug),
    getStoreSettings<StoreShippingSettings>('shipping'),
    getStoreSettings<StoreExchangeSettings>('exchange'),
  ])

  if (!product) {
    notFound()
  }

  const isTest = isProductTest(product)
  const relatedProducts = await getRelatedProducts(product.id, product.category_id || undefined, 4)

  // Structured Data (Schema.org Product) - strictly emitted ONLY for genuine LIVE merchandise
  const jsonLd = !isTest
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: (product as any).images?.map((i: any) => i.image_url) || [],
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: product.selling_price,
          availability: 'https://schema.org/InStock',
          url: `https://bubbleboomstore.com/products/${product.slug}`,
          seller: {
            '@type': 'Organization',
            name: 'Bubble Boom',
          },
        },
      }
    : null

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <Header />

      <main className="flex-1">
        {/* Breadcrumb Bar */}
        <div className="border-b border-neutral-200 py-3.5 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <nav className="text-xs uppercase tracking-widest text-neutral-500 flex items-center space-x-2">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/shop" className="hover:underline">Shop</Link>
              <span>/</span>
              <span className="text-black font-semibold truncate max-w-xs">{product.name}</span>
            </nav>
            {isTest && (
              <span className="text-[10px] font-mono uppercase font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 shrink-0">
                Test / Demo Merchandise
              </span>
            )}
          </div>
        </div>

        {/* Main Product Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <ProductInteractive
            product={product as any}
            shippingSettings={shippingSettings}
            exchangeSettings={exchangeSettings}
          />
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="border-t border-neutral-200 py-16 sm:py-24 bg-[#F8F8F6]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1">
                    Complete The Look
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase">
                    You May Also Like
                  </h2>
                </div>
                <Link
                  href="/shop"
                  className="text-xs uppercase tracking-widest font-bold hover:underline"
                >
                  View All Products →
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {relatedProducts.map((relProduct) => (
                  <ProductCard key={relProduct.id} product={relProduct as any} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
