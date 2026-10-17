import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { ProductCard } from '@/components/product/product-card'
import { CategorySlider } from '@/components/category/category-slider'
import { HeroCarousel } from '@/components/home/hero-carousel'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, Compass } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { getCategoriesWithCovers } from '@/lib/categories'
import { getCollections } from '@/lib/collections'
import { getStoreSettings, StoreGeneralSettings } from '@/lib/settings'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function HomePage() {
  const [products, featuredCategories, collections, generalSettings] = await Promise.all([
    getProducts({ sortBy: 'created_at', sortOrder: 'desc' }),
    getCategoriesWithCovers({ onlyFeatured: true, limit: 12 }),
    getCollections(),
    getStoreSettings<StoreGeneralSettings>('general'),
  ])

  // Split products for storefront sections
  const newArrivals = products.slice(0, 4)
  const bestSellers = products.slice(0, 4)

  return (
    <div suppressHydrationWarning className="flex flex-col min-h-screen bg-white text-black">
      <Header
        announcementText={generalSettings.announcement_text}
        announcementLink={generalSettings.announcement_link}
      />

      <main className="flex-1">
        {/* 1. Automatic Background Carousel Hero Section */}
        <HeroCarousel
          heroTitle={generalSettings.hero_title}
          heroDescription={generalSettings.hero_description}
          primaryCtaText={generalSettings.hero_cta_primary}
          primaryCtaLink="/shop"
          secondaryCtaText={generalSettings.hero_cta_secondary}
          secondaryCtaLink="/collections"
        />

        {/* 2. Shop By Category Horizontal Carousel */}
        {featuredCategories.length > 0 && (
          <CategorySlider categories={featuredCategories} />
        )}

        {/* 3. New Arrivals (Only visible when products exist) */}
        {newArrivals.length > 0 && (
          <section className="py-16 sm:py-24 border-b border-neutral-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1">
                    Fresh Drops
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase">
                    New Arrivals
                  </h2>
                </div>
                <Link
                  href="/shop?sort=newest"
                  className="text-xs uppercase tracking-widest font-bold hover:underline flex items-center"
                >
                  View All <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {newArrivals.map((product, idx) => (
                  <ProductCard key={product.id} product={product as any} priority={idx < 2} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 4. Featured Collection Editorial Banner (Only visible when a real collection exists) */}
        {(() => {
          const featuredCollection =
            collections.find((c) => c.slug === 'bubble-boom-monochrome-kicks') || collections[0]
          if (!featuredCollection) return null

          const coverImage = featuredCollection.banner_image_url
          const mobileImage = (featuredCollection as any).mobile_banner_image_url || coverImage

          return (
            <section className="bg-black text-white py-16 sm:py-24 lg:py-28 overflow-hidden border-y border-neutral-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
                  <div className="space-y-5 sm:space-y-6 order-2 lg:order-1">
                    <div className="inline-flex items-center space-x-2 border border-neutral-800 px-3 py-1 text-[11px] uppercase tracking-widest font-bold text-neutral-300">
                      <Sparkles size={12} className="mr-1" />
                      Featured Capsule
                    </div>
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter uppercase leading-[0.95]">
                      {featuredCollection.name}
                    </h2>
                    {featuredCollection.description && (
                      <p className="text-xs sm:text-sm md:text-base text-neutral-400 max-w-lg leading-relaxed font-light">
                        {featuredCollection.description}
                      </p>
                    )}
                    <div className="pt-2">
                      <Link
                        href={`/collections/${featuredCollection.slug}`}
                        className="inline-flex items-center bg-white text-black hover:bg-neutral-200 px-7 sm:px-8 py-3.5 sm:py-4 text-xs uppercase tracking-widest font-extrabold transition-colors"
                      >
                        Shop The Capsule
                        <ArrowRight size={16} className="ml-2" />
                      </Link>
                    </div>
                  </div>

                  {/* Campaign Cover Image or B Logo Fallback */}
                  <div className="order-1 lg:order-2">
                    <Link
                      href={`/collections/${featuredCollection.slug}`}
                      className="block relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] w-full overflow-hidden bg-neutral-950 border border-neutral-800 group"
                    >
                      {coverImage ? (
                        <>
                          <Image
                            src={coverImage}
                            alt={featuredCollection.name}
                            fill
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            priority
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-12">
                          <div className="relative w-40 h-40 sm:w-56 sm:h-56">
                            <Image
                              src="/images/brand/bubble-boom-icon.png"
                              alt="Bubble Boom Monogram"
                              fill
                              sizes="(max-width: 640px) 160px, 224px"
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )
        })()}

        {/* 5. Best Sellers (Only visible when products exist) */}
        {bestSellers.length > 0 && (
          <section className="py-16 sm:py-24 border-b border-neutral-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1">
                    Crowd Favorites
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase">
                    Best Sellers
                  </h2>
                </div>
                <Link
                  href="/shop?sort=selling_price"
                  className="text-xs uppercase tracking-widest font-bold hover:underline flex items-center"
                >
                  Shop All <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {bestSellers.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. Brand Statement Section */}
        <section className="py-20 sm:py-32 bg-[#F8F8F6] border-b border-neutral-200 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <p className="text-xs uppercase tracking-widest font-bold text-neutral-500">
              Bubble Boom Manifesto
            </p>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter uppercase leading-[0.95]">
              {generalSettings.brand_statement || 'YOUR STYLE. YOUR RULES.'}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto leading-relaxed">
              Bubble Boom is built on the belief that clothing is personal armor. No compromises on fabric density, no fleeting fads. Just uncompromising silhouettes made for individuals who dare to stand out.
            </p>
            <div className="pt-4">
              <Link
                href="/about"
                className="inline-flex items-center text-xs uppercase tracking-widest font-extrabold border-b-2 border-black pb-1 hover:text-neutral-600 transition-colors"
              >
                Read Our Story <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
