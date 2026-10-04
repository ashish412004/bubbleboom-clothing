import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getProducts } from '@/lib/products'
import { ProductCard } from '@/components/product/product-card'
import Link from 'next/link'
import { Search as SearchIcon, ArrowRight } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export const dynamic = 'force-dynamic'

const POPULAR_SEARCHES = ['Oversized Tee', 'Heavyweight Hoodie', 'Cargo Pants', 'Boxy Shirt', 'Acid Wash', 'Monochrome']

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = q?.trim() || ''
  const products = query ? await getProducts({ search: query }) : []

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Search Header Bar */}
        <section className="border-b border-black py-12 md:py-16 bg-[#F8F8F6]">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-center mb-6">
              Search Catalog
            </h1>

            {/* Direct Search Form */}
            <form action="/search" method="GET" className="relative flex items-center">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by silhouette, style, color, or keyword..."
                className="w-full bg-white border-2 border-black px-5 py-4 pl-12 text-sm md:text-base font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus:border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                autoFocus
              />
              <SearchIcon className="absolute left-4 w-5 h-5 text-neutral-500" />
              <button
                type="submit"
                className="absolute right-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
              >
                Search
              </button>
            </form>

            {/* Popular Searches Tags */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-mono text-neutral-500 uppercase tracking-wider mr-1">Trending:</span>
              {POPULAR_SEARCHES.map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="bg-white border border-neutral-300 hover:border-black px-3 py-1 font-mono uppercase transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Results Area */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {query ? (
            <>
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-neutral-200">
                <span className="text-xs uppercase tracking-widest font-mono text-neutral-600">
                  {products.length} {products.length === 1 ? 'Result' : 'Results'} for &ldquo;{query}&rdquo;
                </span>
                <Link
                  href="/shop"
                  className="text-xs uppercase tracking-widest font-bold underline hover:text-neutral-600 transition-colors"
                >
                  Clear Search
                </Link>
              </div>

              {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-neutral-300">
                  <h3 className="text-lg uppercase tracking-widest font-black mb-2">No Matching Products Found</h3>
                  <p className="text-xs text-neutral-500 mb-6 max-w-md mx-auto">
                    We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Check spelling or try browsing our full collection.
                  </p>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                  >
                    <span>Browse All Drops</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm font-mono text-neutral-500 uppercase tracking-widest">
                Enter your query above or click a trending tag to explore.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
