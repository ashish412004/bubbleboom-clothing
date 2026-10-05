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
              <span className="text-black font-semibold">Shop All</span>
              {params.category && (
                <>
                  <span>/</span>
                  <span className="capitalize text-black">{params.category.replace(/-/g, ' ')}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase">
              {params.sale === 'true' ? 'Sale & Special Drops' : 'Catalog Collection'}
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
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center border border-dashed border-neutral-200">
                  <h3 className="text-lg uppercase tracking-widest font-black mb-2">New styles coming soon</h3>
                  <p className="text-xs text-neutral-500 mb-6 font-mono">
                    New streetwear drops and capsules are currently being prepared. Check back shortly.
                  </p>
                  <Link
                    href="/shop"
                    className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                  >
                    View All Categories
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
