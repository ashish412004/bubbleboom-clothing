'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search as SearchIcon, X, Loader2, ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'

interface SearchClientProps {
  initialQuery?: string
  initialCategory?: string
  initialProducts?: any[]
}

const POPULAR_SEARCHES = [
  'Oversized Tee',
  'Heavyweight Hoodie',
  'Cargo Pants',
  'Boxy Shirt',
  'Acid Wash',
  'Monochrome',
]

export function SearchClient({
  initialQuery = '',
  initialCategory = 'all',
  initialProducts = [],
}: SearchClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const [products, setProducts] = useState<any[]>(initialProducts)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(initialProducts.length)

  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const executeSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim()
    if (!trimmed) {
      setProducts([])
      setSuggestions([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setLoading(true)

    try {
      const catParam = category && category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=24${catParam}`, {
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      // Map API products to full ProductCard structure if needed
      setProducts(data.products || [])
      setSuggestions(data.suggestions || [])
      setTotalCount(data.total || 0)

      // Sync URL without full page reload
      window.history.replaceState(null, '', `/search?q=${encodeURIComponent(trimmed)}${catParam}`)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err)
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false)
      }
    }
  }, [category])

  // Handle typing with 300ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!val.trim()) {
      setProducts([])
      setSuggestions([])
      setTotalCount(0)
      window.history.replaceState(null, '', '/search')
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val)
    }, 300)
  }

  // Clear search input
  const handleClear = () => {
    setQuery('')
    setProducts([])
    setSuggestions([])
    setTotalCount(0)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    window.history.replaceState(null, '', '/search')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    executeSearch(query)
  }

  const handleSelectSuggestion = (term: string) => {
    setQuery(term)
    executeSearch(term)
  }

  return (
    <div>
      {/* Search Header Bar */}
      <section className="border-b border-black py-10 sm:py-14 bg-[#F8F8F6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-center mb-6">
            Search Catalog
          </h1>

          {/* Interactive Search Input */}
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search by silhouette, style, color, or keyword..."
              className="w-full bg-white border-2 border-black px-5 py-4 pl-12 pr-24 text-sm sm:text-base font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus:border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all min-h-[48px]"
              autoFocus
              aria-label="Search catalog input"
            />
            <SearchIcon className="absolute left-4 w-5 h-5 text-neutral-500 pointer-events-none" />

            <div className="absolute right-2 flex items-center gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-500 mr-1" />}
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-neutral-400 hover:text-black transition-colors rounded-xs"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="bg-black text-white px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer min-h-[36px]"
              >
                Search
              </button>
            </div>
          </form>

          {/* Typeahead Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-mono text-neutral-500 text-[11px] uppercase tracking-wider mr-1">
                Suggestions:
              </span>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSelectSuggestion(sug)}
                  className="bg-white border border-neutral-300 hover:border-black px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-mono text-neutral-500 uppercase tracking-wider mr-1">Trending:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleSelectSuggestion(term)}
                className="bg-white border border-neutral-300 hover:border-black px-3 py-1 font-mono uppercase text-xs transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {query ? (
          <>
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-neutral-200">
              <span className="text-xs uppercase tracking-widest font-mono text-neutral-600">
                {totalCount} {totalCount === 1 ? 'Result' : 'Results'} for &ldquo;{query}&rdquo;
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs uppercase tracking-widest font-bold underline hover:text-neutral-600 transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : !loading ? (
              <div className="py-20 text-center border border-dashed border-neutral-300 bg-neutral-50 p-8">
                <h3 className="text-base sm:text-lg uppercase tracking-widest font-black mb-2">
                  No Matching Products Found
                </h3>
                <p className="text-xs text-neutral-500 mb-6 max-w-md mx-auto">
                  We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Check spelling or try browsing our full collection.
                </p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                >
                  <span>Browse All Drops</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="py-16 text-center text-neutral-500">
            <p className="text-xs uppercase font-mono tracking-widest">
              Type above to search by style, category, or colour.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
