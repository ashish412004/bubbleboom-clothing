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

  // Split products for storefront sections: ensure no duplicate products are shown across sections
  const newArrivals = products.slice(0, 4)
  const newArrivalIds = new Set(newArrivals.map((p) => p.id))
  // Distinct products for secondary storefront display (no duplicates from New Arrivals)
  const distinctFeaturedProducts = products.filter((p) => !newArrivalIds.has(p.id)).slice(0, 4)

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

        {/* 3. New Arrivals (Product-count-aware responsive layout) */}
        {newArrivals.length > 0 && (
          <section className="py-12 sm:py-16 lg:py-20 border-b border-neutral-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8 sm:mb-10">
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

              {/* Responsive layout: 1 product centered, 2 products balanced/centered, 3 balanced, 4+ full grid */}
              {newArrivals.length === 1 && (
                <div className="flex justify-center">
                  <div className="w-full max-w-[280px] sm:max-w-[320px]">
                    <ProductCard product={newArrivals[0] as any} priority />
                  </div>
                </div>
              )}

              {newArrivals.length === 2 && (
                <div className="grid grid-cols-2 max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto gap-4 sm:gap-6 lg:gap-8 justify-center">
                  {newArrivals.map((product, idx) => (
                    <div key={product.id} className="w-full">
                      <ProductCard product={product as any} priority={idx < 2} />
                    </div>
                  ))}
                </div>
              )}

              {newArrivals.length === 3 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 max-w-3xl lg:max-w-4xl mx-auto gap-4 sm:gap-6 lg:gap-8 justify-center">
                  {newArrivals.map((product, idx) => (
                    <div
                      key={product.id}
                      className={idx === 2 ? 'col-span-2 sm:col-span-1 max-w-[280px] sm:max-w-none mx-auto w-full' : 'w-full'}
                    >
                      <ProductCard product={product as any} priority={idx < 2} />
                    </div>
                  ))}
                </div>
              )}

              {newArrivals.length >= 4 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {newArrivals.map((product, idx) => (
                    <ProductCard key={product.id} product={product as any} priority={idx < 2} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Featured Collection Editorial Banner (Compact 45/55 Split Layout) */}
        {(() => {
          const featuredCollection =
            collections.find((c) => c.slug === 'bubble-boom-monochrome-kicks') || collections[0]
          if (!featuredCollection) return null

          const coverImage = featuredCollection.banner_image_url
          const mobileImage = (featuredCollection as any).mobile_banner_image_url || coverImage

          return (
            <section className="bg-black text-white py-10 sm:py-14 lg:py-16 overflow-hidden border-y border-neutral-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center">
                  {/* Text Column: ~45% width */}
                  <div className="space-y-4 sm:space-y-5 order-2 lg:order-1 lg:col-span-5">
                    <div className="inline-flex items-center space-x-2 border border-neutral-800 px-3 py-1 text-[11px] uppercase tracking-widest font-bold text-neutral-300">
                      <Sparkles size={12} className="mr-1" />
                      Featured Capsule
                    </div>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter uppercase leading-[0.98]">
                      {featuredCollection.name}
                    </h2>
                    {featuredCollection.description && (
                      <p className="text-xs sm:text-sm text-neutral-400 max-w-lg leading-relaxed font-light">
                        {featuredCollection.description}
                      </p>
                    )}
                    <div className="pt-1 sm:pt-2">
                      <Link
                        href={`/collections/${featuredCollection.slug}`}
                        className="inline-flex items-center bg-white text-black hover:bg-neutral-200 px-6 sm:px-7 py-3 sm:py-3.5 text-xs uppercase tracking-widest font-extrabold transition-colors"
                      >
                        Shop The Capsule
                        <ArrowRight size={16} className="ml-2" />
                      </Link>
                    </div>
                  </div>

                  {/* Image Column: ~55% width, cinematic aspect ratio */}
                  <div className="order-1 lg:order-2 lg:col-span-7">
                    <Link
                      href={`/collections/${featuredCollection.slug}`}
                      className="block relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10] max-h-[360px] w-full overflow-hidden bg-neutral-950 border border-neutral-800 group"
                    >
                      {coverImage ? (
                        <>
                          <Image
                            src={coverImage}
                            alt={featuredCollection.name}
                            fill
                            sizes="(max-width: 1024px) 100vw, 55vw"
                            priority
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-8 sm:p-12">
                          <div className="relative w-32 h-32 sm:w-44 sm:h-44">
                            <Image
                              src="/images/brand/bubble-boom-icon.png"
                              alt="Bubble Boom Monogram"
                              fill
                              sizes="(max-width: 640px) 128px, 176px"
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

        {/* 5. Featured Products (Conditionally rendered ONLY if distinct products exist, avoiding repetition) */}
        {distinctFeaturedProducts.length > 0 && (
          <section className="py-12 sm:py-16 lg:py-20 border-b border-neutral-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8 sm:mb-10">
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1">
                    Handpicked
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase">
                    Featured Products
                  </h2>
                </div>
                <Link
                  href="/shop"
                  className="text-xs uppercase tracking-widest font-bold hover:underline flex items-center"
                >
                  Shop All <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>

              {/* Product-count-aware layout for distinct featured products */}
              {distinctFeaturedProducts.length === 1 && (
                <div className="flex justify-center">
                  <div className="w-full max-w-[280px] sm:max-w-[320px]">
                    <ProductCard product={distinctFeaturedProducts[0] as any} />
                  </div>
                </div>
              )}

              {distinctFeaturedProducts.length === 2 && (
                <div className="grid grid-cols-2 max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto gap-4 sm:gap-6 lg:gap-8 justify-center">
                  {distinctFeaturedProducts.map((product) => (
                    <div key={product.id} className="w-full">
                      <ProductCard product={product as any} />
                    </div>
                  ))}
                </div>
              )}

              {distinctFeaturedProducts.length === 3 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 max-w-3xl lg:max-w-4xl mx-auto gap-4 sm:gap-6 lg:gap-8 justify-center">
                  {distinctFeaturedProducts.map((product, idx) => (
                    <div
                      key={product.id}
                      className={idx === 2 ? 'col-span-2 sm:col-span-1 max-w-[280px] sm:max-w-none mx-auto w-full' : 'w-full'}
                    >
                      <ProductCard product={product as any} />
                    </div>
                  ))}
                </div>
              )}

              {distinctFeaturedProducts.length >= 4 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {distinctFeaturedProducts.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 6. Brand Statement Section */}
        <section className="py-14 sm:py-20 lg:py-24 bg-[#F8F8F6] border-b border-neutral-200 text-center">
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
