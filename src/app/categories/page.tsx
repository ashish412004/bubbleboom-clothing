import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { CategoryCard } from '@/components/category/category-card'
import { getCategoriesWithCovers } from '@/lib/categories'
import { getStoreSettings, StoreGeneralSettings } from '@/lib/settings'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const revalidate = 60

export const metadata = {
  title: 'All Categories | BUBBLE BOOM',
  description: 'Explore the complete Bubble Boom streetwear wardrobe by category — T-Shirts, Hoodies, Footwear, Cargos, Jeans, Sweatshirts, and more.',
}

export default async function CategoriesPage() {
  const [categories, generalSettings] = await Promise.all([
    getCategoriesWithCovers({ includeHidden: false }),
    getStoreSettings<StoreGeneralSettings>('general'),
  ])

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header
        announcementText={generalSettings.announcement_text}
        announcementLink={generalSettings.announcement_link}
      />

      <main className="flex-1">
        {/* Editorial Header */}
        <section className="border-b border-black py-14 sm:py-20 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500 font-bold block mb-2">
              Bubble Boom Wardrobe
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase">
              All Categories
            </h1>
            <p className="mt-3 text-xs sm:text-sm md:text-base text-neutral-600 max-w-2xl mx-auto font-light leading-relaxed">
              Explore our complete architectural wardrobe hierarchy. Each silhouette is crafted for distinct attitude, raw heavyweight textures, and uncompromising presence.
            </p>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">
                Showing {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
              </p>
              <Link
                href="/shop"
                className="text-xs font-mono uppercase tracking-widest font-bold hover:underline inline-flex items-center gap-1"
              >
                Browse All Garments <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {categories.map((cat, idx) => (
                <CategoryCard key={cat.id} category={cat} priority={idx < 4} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
