import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { ProductCard } from '@/components/product/product-card'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, Compass } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { getCategories } from '@/lib/categories'
import { getCollections } from '@/lib/collections'
import { getStoreSettings, StoreGeneralSettings } from '@/lib/settings'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function HomePage() {
  const [products, categories, collections, generalSettings] = await Promise.all([
    getProducts({ sortBy: 'created_at', sortOrder: 'desc' }),
    getCategories(),
    getCollections(),
    getStoreSettings<StoreGeneralSettings>('general'),
  ])

  // Split products for storefront sections
  const newArrivals = products.slice(0, 4)
  const bestSellers = products.slice(0, 4)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header
        announcementText={generalSettings.announcement_text}
        announcementLink={generalSettings.announcement_link}
      />

      <main className="flex-1">
        {/* 1. Large Editorial Hero Section */}
        <section className="relative min-h-[75vh] sm:min-h-[85vh] bg-black text-white flex items-center justify-center overflow-hidden">
          {/* Hero Photography Background */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/brand/hero-bg.png"
              alt="Bubble Boom Streetwear Hero Background"
              fill
              priority
              quality={90}
              className="object-cover object-center"
              sizes="100vw"
            />
            {/* Elegant dark gradient overlay for optimal text legibility */}
            <div className="absolute inset-0 bg-black/60 bg-gradient-to-t from-black via-black/50 to-black/70" />
          </div>

          {/* Subtle geometric star overlay from brand monogram */}
          <div className="absolute inset-0 opacity-20 pointer-events-none z-[1]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-neutral-600/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-neutral-600/30" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center">
            {/* Monogram Badge */}
            <div className="mb-6 inline-flex items-center space-x-2 border border-neutral-800 bg-neutral-950/80 px-4 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] uppercase tracking-widest font-bold text-neutral-300">
                BUBBLE BOOM ORIGINALS
              </span>
            </div>

            {/* Hero Main Heading */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter uppercase leading-[0.9] mb-6">
              {generalSettings.hero_title || 'WEAR THE BOOM.'}
            </h1>

            {/* Description */}
            <p className="text-base sm:text-xl md:text-2xl text-neutral-300 max-w-2xl font-normal leading-relaxed mb-10">
              {generalSettings.hero_description || 'Every style. Every mood. Make it yours.'}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/shop"
                className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 px-8 py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all hover:scale-105"
              >
                {generalSettings.hero_cta_primary || 'SHOP NOW'}
                <ArrowRight size={16} className="ml-2" />
              </Link>
              <Link
                href="/collections"
                className="w-full sm:w-auto border border-white text-white hover:bg-white hover:text-black px-8 py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all"
              >
                {generalSettings.hero_cta_secondary || 'EXPLORE COLLECTIONS'}
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Shop By Category */}
        <section className="py-16 sm:py-24 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1">
                  Curated Catalog
                </p>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase">
                  Shop By Category
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-xs uppercase tracking-widest font-bold hover:underline hidden sm:inline-flex items-center"
              >
                All Categories <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className="group relative aspect-square bg-[#F8F8F6] border border-neutral-200 flex flex-col items-center justify-center p-4 hover:border-black transition-all hover:shadow-sm"
                >
                  <span className="text-xs sm:text-sm uppercase tracking-wider font-bold text-center text-black group-hover:underline">
                    {cat.name}
                  </span>
                  <span className="mt-2 text-[10px] uppercase tracking-widest text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3. New Arrivals */}
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

            {newArrivals.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {newArrivals.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold">
                  Catalog refreshing. Check back shortly.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 4. Featured Collection Editorial Banner */}
        <section className="bg-black text-white py-20 sm:py-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 border border-neutral-800 px-3 py-1 text-[11px] uppercase tracking-widest font-bold text-neutral-300">
                  <Sparkles size={12} className="mr-1" />
                  Featured Capsule
                </div>
                <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tighter uppercase leading-[0.95]">
                  Monochrome Originals
                </h2>
                <p className="text-sm sm:text-base text-neutral-400 max-w-lg leading-relaxed">
                  Engineered with heavyweight 240 GSM combed cotton and 380 GSM fleece. Strict black, white, and neutral grey aesthetics featuring the authentic Bubble Boom star monogram.
                </p>
                <div className="pt-2">
                  <Link
                    href="/collections/monochrome-originals"
                    className="inline-flex items-center bg-white text-black hover:bg-neutral-200 px-8 py-4 text-xs uppercase tracking-widest font-extrabold transition-colors"
                  >
                    Shop The Capsule
                    <ArrowRight size={16} className="ml-2" />
                  </Link>
                </div>
              </div>

              {/* Minimal Brand Monogram Showcase */}
              <div className="relative aspect-[4/3] bg-neutral-950 border border-neutral-800 flex items-center justify-center p-12">
                <div className="relative w-48 h-48 sm:w-64 sm:h-64">
                  <Image
                    src="/images/brand/bubble-boom-icon.png"
                    alt="Bubble Boom Monogram"
                    fill
                    sizes="(max-width: 640px) 192px, 256px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Best Sellers */}
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

            {bestSellers.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {bestSellers.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-500 uppercase tracking-widest font-semibold">
                  Best sellers will appear as orders are placed.
                </p>
              </div>
            )}
          </div>
        </section>

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
