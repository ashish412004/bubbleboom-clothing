import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'

export default function ShopLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Header Skeleton */}
        <div className="border-b border-neutral-200 py-8 sm:py-12 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
            <div className="h-3 w-36 bg-neutral-200 rounded mb-3"></div>
            <div className="h-10 w-64 bg-neutral-300 rounded mb-3"></div>
            <div className="h-4 w-96 bg-neutral-200 rounded max-w-full"></div>
          </div>
        </div>

        {/* Catalog Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="lg:grid lg:grid-cols-4 lg:gap-10">
            {/* Sidebar Skeleton */}
            <aside className="hidden lg:block lg:col-span-1 animate-pulse space-y-6">
              <div className="h-6 w-32 bg-neutral-200 rounded"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-4 w-full bg-neutral-100 rounded"></div>
                ))}
              </div>
              <div className="h-6 w-28 bg-neutral-200 rounded pt-4"></div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-neutral-100 rounded"></div>
                ))}
              </div>
            </aside>

            {/* Grid Skeleton */}
            <div className="lg:col-span-3">
              <div className="h-4 w-28 bg-neutral-200 rounded mb-8 animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="aspect-[3/4] bg-neutral-200 rounded-none w-full"></div>
                    <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                    <div className="h-3 bg-neutral-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
