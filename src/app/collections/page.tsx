import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCollections } from '@/lib/collections'
import { ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Collections | BUBBLE BOOM',
  description: 'Curated capsules designed for individuality and attitude. Wear the Boom.',
}

export default async function CollectionsPage() {
  const collections = await getCollections()

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Editorial Header */}
        <section className="border-b border-black py-16 md:py-24 bg-[#F8F8F6]">
          <div className="container mx-auto px-4 text-center">
            <span className="text-xs uppercase tracking-widest font-mono text-gray-500">Bubble Boom Capsules</span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-2 uppercase">Collections</h1>
            <p className="mt-4 text-base md:text-lg text-gray-700 max-w-2xl mx-auto font-normal">
              Every drop is a deliberate expression. Explore our curated capsules engineered for distinct silhouettes, raw aesthetics, and uncompromising standards.
            </p>
          </div>
        </section>

        {/* Collections Grid */}
        <section className="container mx-auto px-4 py-16">
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="group block border border-black overflow-hidden bg-white hover:border-black transition-all"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                    <Image
                      src={col.banner_image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=80'}
                      alt={col.name}
                      fill
                      className="object-cover grayscale contrast-110 group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-4 border border-black">
                      <span className="text-xs uppercase tracking-widest font-mono text-gray-600">Capsule Drop</span>
                      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black mt-1">
                        {col.name}
                      </h2>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col justify-between">
                    {col.description && (
                      <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                        {col.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold tracking-wider group-hover:translate-x-1 transition-transform">
                      <span>Explore Capsule</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-neutral-300">
              <span className="text-xs uppercase tracking-widest font-mono text-neutral-500 font-bold block mb-2">BUBBLE BOOM CAPSULES</span>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-2">New capsules arriving soon</h2>
              <p className="text-xs text-neutral-600 max-w-md mx-auto font-mono mb-6">
                We are curating and preparing our next limited release capsule drops. Stay tuned.
              </p>
              <Link
                href="/shop"
                className="inline-block bg-black text-white px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
