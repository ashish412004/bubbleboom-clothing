import { Metadata } from 'next'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCollections, getCollectionBySlug } from '@/lib/collections'
import { ProductCard } from '@/components/product/product-card'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { parseProductImage } from '@/lib/utils'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getAppOrigin } from '@/lib/origin'
import { Eye } from 'lucide-react'

interface CollectionPageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ preview?: string }>
}

export async function generateStaticParams() {
  try {
    const collections = await getCollections(false)
    return collections.filter((c) => Boolean(c.slug)).map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug, true)
  const origin = getAppOrigin()

  if (!collection) {
    return {
      title: 'Collection Not Found | BUBBLE BOOM',
    }
  }

  const title = collection.seo_title || `${collection.name} | BUBBLE BOOM`
  const description =
    collection.seo_description ||
    collection.short_description ||
    collection.description ||
    'Explore curated Bubble Boom capsule releases engineered for attitude.'
  const ogImage = collection.seo_image_url || collection.banner_image_url

  return {
    title,
    description,
    alternates: {
      canonical: `${origin}/collections/${collection.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${origin}/collections/${collection.slug}`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: collection.name }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  }
}

export const revalidate = 60

export default async function CollectionDetailPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const isPreviewRequested = resolvedSearchParams.preview === 'true'

  let allowDraft = false
  if (isPreviewRequested) {
    const user = await getCurrentUser()
    if (user && (await isAdmin(user.id))) {
      allowDraft = true
    }
  }

  const collection = await getCollectionBySlug(slug, allowDraft)

  if (!collection) {
    notFound()
  }

  const name = collection.name
  const description = collection.description || ''
  const banner = collection.banner_image_url || ''
  const isDraftPreview = !collection.is_visible

  // @ts-ignore
  const rawProducts: any[] =
    collection.collection_products
      ?.map((cp: any) => cp.products)
      .filter((p: any) => p && p.is_published !== false) || []

  const products = rawProducts.map((p) => ({
    ...p,
    images: (((p.images || p.product_images || []) as any[]) || []).map(parseProductImage).filter(Boolean),
  }))

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      {/* Admin Preview Mode Indicator */}
      {isDraftPreview && (
        <div className="bg-amber-400 text-black px-4 py-2 text-xs font-mono font-bold uppercase flex items-center justify-center gap-2 border-b border-black">
          <Eye size={14} />
          <span>Admin Preview Mode — This collection is currently Draft / Unpublished</span>
        </div>
      )}

      <main className="flex-1">
        {/* Collection Hero / Banner */}
        <div className="relative border-b border-black bg-black text-white overflow-hidden py-16 md:py-24">
          {banner && (
            <div className="absolute inset-0 opacity-45">
              <Image
                src={banner}
                alt={name}
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>
          )}

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-3 flex items-center space-x-2 font-mono">
              <Link href="/" className="hover:underline hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/collections" className="hover:underline hover:text-white">Collections</Link>
              <span>/</span>
              <span className="text-white font-semibold">{name}</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight">
              {name}
            </h1>
            {description && (
              <p className="mt-4 text-sm md:text-base text-neutral-300 max-w-2xl font-light leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-neutral-200">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500 font-bold">
              {products.length} {products.length === 1 ? 'Design' : 'Designs'} in Capsule
            </span>
            <Link
              href="/shop"
              className="text-xs uppercase tracking-widest font-bold underline hover:text-neutral-600 transition-colors"
            >
              View Full Catalog
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-neutral-300 bg-[#F8F8F6]">
              <h3 className="text-lg uppercase tracking-widest font-black mb-2">New styles coming soon</h3>
              <p className="text-xs text-neutral-500 mb-6 font-mono max-w-md mx-auto">
                Items for this capsule drop are currently being curated and prepared. Check back shortly.
              </p>
              <Link
                href="/shop"
                className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
              >
                Browse Shop All
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
