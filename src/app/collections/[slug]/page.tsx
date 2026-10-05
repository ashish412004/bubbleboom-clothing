import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCollectionBySlug } from '@/lib/collections'
import { getProducts } from '@/lib/products'
import { ProductCard } from '@/components/product/product-card'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface CollectionPageProps {
  params: Promise<{ slug: string }>
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)

  if (!collection) {
    notFound()
  }

  const name = collection.name
  const description = collection.description || ''
  const banner = collection.banner_image_url || ''
  // @ts-ignore
  const products: any[] = collection.collection_products?.map((cp: any) => cp.products).filter(Boolean) || []

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Collection Hero / Banner */}
        <div className="relative border-b border-black bg-black text-white overflow-hidden py-16 md:py-24">
          {banner && (
            <div className="absolute inset-0 opacity-40">
              <Image
                src={banner}
                alt={name}
                fill
                className="object-cover grayscale contrast-125"
                priority
              />
            </div>
          )}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-3 flex items-center space-x-2 font-mono">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/collections" className="hover:underline">Collections</Link>
              <span>/</span>
              <span className="text-white font-semibold">{name}</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight">
              {name}
            </h1>
            {description && (
              <p className="mt-3 text-sm md:text-base text-neutral-300 max-w-2xl font-light">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-neutral-200">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">
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
            <div className="py-24 text-center border border-dashed border-neutral-300">
              <h3 className="text-lg uppercase tracking-widest font-black mb-2">New styles coming soon</h3>
              <p className="text-xs text-neutral-500 mb-6 font-mono">
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
