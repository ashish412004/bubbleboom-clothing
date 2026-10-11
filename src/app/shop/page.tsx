import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { ProductCard } from '@/components/product/product-card'
import { getProducts } from '@/lib/products'
import { getCategories } from '@/lib/categories'
import { ShopFilters } from './shop-filters'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface ShopPageProps {
  searchParams: Promise<{
    category?: string
    collection?: string
    search?: string
    size?: string
    color?: string
    minPrice?: string
    maxPrice?: string
    inStock?: string
    sale?: string
    sort?: string
  }>
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams

  const minPrice = params.minPrice ? parseInt(params.minPrice) : undefined
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : undefined
  const inStockOnly = params.inStock === 'true'
  const saleOnly = params.sale === 'true'

  let sortBy: 'created_at' | 'selling_price' | 'best_selling' = 'created_at'
  let sortOrder: 'asc' | 'desc' = 'desc'

  if (params.sort === 'price_asc') {
    sortBy = 'selling_price'
    sortOrder = 'asc'
  } else if (params.sort === 'price_desc') {
    sortBy = 'selling_price'
    sortOrder = 'desc'
  } else if (params.sort === 'best_selling') {
    sortBy = 'best_selling'
    sortOrder = 'desc'
  }

  const [products, categories] = await Promise.all([
    getProducts({
      category: params.category,
      collection: params.collection,
      search: params.search,
      size: params.size,
      color: params.color,
      minPrice,
      maxPrice,
      inStockOnly,
      saleOnly,
      sortBy,
      sortOrder,
    }),
    getCategories(),
  ])

  const currentCategory = categories.find(
    (c) => c.slug.toLowerCase() === params.category?.toLowerCase() || c.id === params.category
  )
  const categoryDisplayName = currentCategory?.name || (params.category ? params.category.replace(/-/g, ' ') : null)

  const hasAttributeFilters = Boolean(
    params.size ||
    params.color ||
    params.minPrice ||
    params.maxPrice ||
    params.inStock === 'true' ||
    params.sale === 'true' ||
    params.search
  )

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Page Title & Breadcrumb */}
        <div className="border-b border-neutral-200 py-8 sm:py-12 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2 flex items-center space-x-2">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/shop" className={`hover:underline ${!categoryDisplayName ? 'text-black font-semibold' : ''}`}>
                Shop All
              </Link>
              {categoryDisplayName && (
                <>
                  <span>/</span>
                  <span className="capitalize text-black font-semibold">{categoryDisplayName}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase">
              {categoryDisplayName || (params.sale === 'true' ? 'Sale & Special Drops' : 'Catalog Collection')}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-600 max-w-xl">
              Authentic streetwear wardrobe. Designed for uncompromising individuality.
            </p>
          </div>
        </div>

        {/* Catalog Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="lg:grid lg:grid-cols-4 lg:gap-10">
            {/* Desktop Filters Sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <ShopFilters categories={categories} />
            </aside>

            {/* Product Grid Area */}
            <div className="lg:col-span-3">
              {/* Mobile Filter Button and Sort Bar */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-neutral-200">
                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
                  Showing {products.length} {products.length === 1 ? 'Product' : 'Products'}
                </span>

                <div className="lg:hidden">
                  <ShopFilters categories={categories} isMobile />
                </div>
              </div>

              {/* Product Grid */}
              {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                  {products.map((product, idx) => (
                    <ProductCard key={product.id} product={product as any} priority={idx < 2} />
                  ))}
                </div>
              ) : hasAttributeFilters ? (
                /* State: No matching filters */
                <div className="py-20 px-4 text-center border border-dashed border-neutral-300 bg-neutral-50">
                  <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg uppercase tracking-widest font-black mb-2">
                    No Matching Products
                  </h3>
                  <p className="text-xs text-neutral-500 mb-6 max-w-md mx-auto">
                    No products match your selected filters. Try broadening your filter selection or clearing active filters.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={params.category ? `/shop?category=${encodeURIComponent(params.category)}` : '/shop'}
                      className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                    >
                      Clear Filters
                    </Link>
                    <Link
                      href="/shop"
                      className="border border-black text-black px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-100 transition-colors"
                    >
                      View All Products
                    </Link>
                  </div>
                </div>
              ) : params.category ? (
                /* State: Empty category */
                <div className="py-20 px-4 text-center border border-dashed border-neutral-300 bg-neutral-50">
                  <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg uppercase tracking-widest font-black mb-2">
                    No Products In {categoryDisplayName?.toUpperCase() || 'This Category'} Yet
                  </h3>
                  <p className="text-xs text-neutral-500 mb-6 max-w-md mx-auto">
                    New drops and styles in this category are currently in production. Check out our active styles across other categories.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/shop"
                      className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                    >
                      Explore All Products
                    </Link>
                    <Link
                      href="/categories"
                      className="border border-black text-black px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-100 transition-colors"
                    >
                      Browse Categories
                    </Link>
                  </div>
                </div>
              ) : params.collection ? (
                /* State: Empty collection */
                <div className="py-20 px-4 text-center border border-dashed border-neutral-300 bg-neutral-50">
                  <h3 className="text-base sm:text-lg uppercase tracking-widest font-black mb-2">
                    Collection Coming Soon
                  </h3>
                  <p className="text-xs text-neutral-500 mb-6 max-w-md mx-auto">
                    Pieces for this capsule collection will be releasing shortly. Stay tuned.
                  </p>
                  <Link
                    href="/shop"
                    className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                  >
                    Explore All Drops
                  </Link>
                </div>
              ) : (
                /* State: Entire store empty */
                <div className="py-24 text-center border border-dashed border-neutral-200">
                  <h3 className="text-lg uppercase tracking-widest font-black mb-2">New styles coming soon</h3>
                  <p className="text-xs text-neutral-500 mb-6 font-mono">
                    New streetwear drops and capsules are currently being prepared. Check back shortly.
                  </p>
                  <Link
                    href="/"
                    className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                  >
                    Return to Homepage
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
