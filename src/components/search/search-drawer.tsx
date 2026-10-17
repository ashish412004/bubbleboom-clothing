'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Search, X, ChevronDown, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useSearchStore } from '@/lib/search-store'
import { formatPrice, formatDiscount, getSafeImageUrl } from '@/lib/utils'

export interface SearchProductItem {
  id: string
  name: string
  slug: string
  mrp: number
  selling_price: number
  image_url: string | null
  category: string | null
  category_slug?: string | null
  in_stock: boolean
}

export interface SearchCategoryItem {
  id: string
  name: string
  slug: string
}

export function SearchDrawer() {
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = useSearchStore((state) => state.isOpen)
  const closeSearch = useSearchStore((state) => state.closeSearch)
  const query = useSearchStore((state) => state.query)
  const setQuery = useSearchStore((state) => state.setQuery)
  const category = useSearchStore((state) => state.category)
  const setCategory = useSearchStore((state) => state.setCategory)

  const [products, setProducts] = useState<SearchProductItem[]>([])
  const [categories, setCategories] = useState<SearchCategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isRecommended, setIsRecommended] = useState(true)
  const [hasSearched, setHasSearched] = useState(false)

  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Fetch search or recommendations
  const fetchData = useCallback(
    async (searchTerm: string, selectedCategory: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setLoading(true)

      try {
        const trimmed = searchTerm.trim()
        const params = new URLSearchParams()
        if (trimmed) params.set('q', trimmed)
        if (selectedCategory && selectedCategory !== 'all') {
          params.set('category', selectedCategory)
        }
        params.set('limit', trimmed ? '24' : '6')

        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!res.ok) throw new Error('Search failed')

        const data = await res.json()
        setProducts(data.products || [])
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories)
        }
        setTotalCount(data.total || 0)
        setIsRecommended(data.isRecommended ?? !trimmed)
        setHasSearched(Boolean(trimmed))
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err)
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false)
        }
      }
    },
    []
  )

  // On open: save focus, lock body scroll, autofocus input, fetch initial data
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Autofocus appropriate input after small tick to allow mount
    const timer = setTimeout(() => {
      if (window.innerWidth >= 768) {
        desktopInputRef.current?.focus()
      } else {
        mobileInputRef.current?.focus()
      }
    }, 60)

    fetchData(query, category)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, closeSearch, fetchData])

  // Close when pathname changes
  useEffect(() => {
    if (isOpen) {
      closeSearch()
    }
  }, [pathname, closeSearch])

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchData(val, category)
    }, 300)
  }

  // Handle category change
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    fetchData(query, newCat)
  }

  // Clear query
  const handleClearQuery = () => {
    setQuery('')
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    fetchData('', category)
    if (window.innerWidth >= 768) {
      desktopInputRef.current?.focus()
    } else {
      mobileInputRef.current?.focus()
    }
  }

  // View all destination
  const viewAllHref = query.trim()
    ? `/search?q=${encodeURIComponent(query.trim())}${category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''}`
    : `/shop${category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Search Store">
      {/* Semi-transparent dark backdrop (Desktop) */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-300 ease-out"
        onClick={closeSearch}
        aria-hidden="true"
      />

      {/* 1. DESKTOP SLIDING DRAWER (>= 768px): Slides in from the right */}
      <aside
        className="hidden md:flex fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[75vw] lg:w-[70vw] max-w-[900px] bg-white text-black shadow-2xl flex-col transition-transform duration-300 ease-out animate-in slide-in-from-right"
        aria-label="Desktop Search Drawer"
      >
        {/* Header: Circular Close Button + Search Input Bar */}
        <div className="p-6 pb-4 border-b border-neutral-100 flex flex-col gap-4 shrink-0">
          {/* Top Row: Circular Close Button on upper right */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
              BUBBLE BOOM / SEARCH
            </span>
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search drawer"
              className="w-9 h-9 rounded-full border border-neutral-300 hover:border-black flex items-center justify-center text-black hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar Row: [ All Categories ▼ ] [ Search products... 🔍 ] */}
          <div className="flex items-center gap-6 pt-1">
            {/* Category Dropdown with minimal bottom underline */}
            <div className="relative shrink-0 min-w-[150px] max-w-[200px]">
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                aria-label="Filter by Category"
                className="w-full appearance-none bg-transparent pr-7 py-2.5 text-xs font-bold uppercase tracking-wider text-black border-b border-black focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-black w-3.5 h-3.5" />
            </div>

            {/* Large Search Input with minimal bottom underline */}
            <div className="relative flex-1">
              <input
                ref={desktopInputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-full bg-transparent py-2.5 pr-8 text-base lg:text-lg font-medium text-black placeholder:text-neutral-400 border-b border-black focus:outline-none"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                ) : query ? (
                  <button
                    type="button"
                    onClick={handleClearQuery}
                    aria-label="Clear search query"
                    className="p-1 text-neutral-400 hover:text-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="w-4 h-4 text-neutral-400 pointer-events-none" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Results Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Section Heading */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-mono uppercase tracking-widest font-extrabold text-black">
              {query.trim()
                ? `SEARCH RESULTS ${products.length > 0 ? `(${totalCount})` : ''}`
                : 'NEED SOME INSPIRATION?'}
            </h3>
            {category !== 'all' && (
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                Category:{' '}
                <strong className="text-black">
                  {categories.find((c) => c.slug === category)?.name || category}
                </strong>
              </span>
            )}
          </div>

          {/* Loading Skeleton Indicator */}
          {loading && products.length === 0 ? (
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-[3/4] bg-neutral-100 rounded-xl" />
                  <div className="h-3 bg-neutral-100 rounded-sm w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded-sm w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            /* 3-Column Desktop Product Grid */
            <div className="grid grid-cols-3 gap-5 lg:gap-6">
              {products.map((product) => {
                const discount = formatDiscount(product.mrp, product.selling_price)
                const hasDiscount = discount > 0 && product.mrp > product.selling_price

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={closeSearch}
                    className="group flex flex-col bg-white focus:outline-none focus:ring-1 focus:ring-black rounded-xl p-1"
                  >
                    {/* Portrait Photograph */}
                    <div className="relative aspect-[3/4] bg-neutral-100 rounded-xl overflow-hidden mb-3">
                      {product.image_url ? (
                        <Image
                          src={getSafeImageUrl(product.image_url)}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1024px) 280px, 220px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-mono uppercase text-neutral-400">
                          BUBBLE BOOM
                        </div>
                      )}

                      {/* Genuine Discount Badge */}
                      {hasDiscount && (
                        <span className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">
                          -{discount}%
                        </span>
                      )}

                      {/* Stock Status Badge */}
                      {!product.in_stock && (
                        <span className="absolute top-2 right-2 bg-neutral-900/90 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Sold Out
                        </span>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex flex-col flex-1 justify-between min-w-0">
                      <div>
                        {product.category && (
                          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-0.5">
                            {product.category}
                          </span>
                        )}
                        <h4 className="text-xs sm:text-sm font-semibold text-black line-clamp-2 group-hover:underline">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-xs sm:text-sm font-bold text-black">
                          {formatPrice(product.selling_price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[11px] text-neutral-400 line-through">
                            {formatPrice(product.mrp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-16 text-center max-w-sm mx-auto flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-mono uppercase tracking-widest font-extrabold text-black mb-1.5">
                NO PRODUCTS FOUND
              </h4>
              <p className="text-xs text-neutral-500 mb-6">
                Try another search or explore our collections.
              </p>
              <div className="flex items-center gap-3">
                {query && (
                  <button
                    type="button"
                    onClick={handleClearQuery}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-black text-black hover:bg-neutral-100 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
                <Link
                  href="/shop"
                  onClick={closeSearch}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-neutral-800 transition-colors"
                >
                  Shop All
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Bottom Action Bar (Desktop) */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <Link
            href={viewAllHref}
            onClick={closeSearch}
            className="w-full bg-black text-white py-3.5 px-6 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors active:scale-[0.99]"
          >
            <span>{query.trim() ? 'VIEW ALL RESULTS' : 'VIEW ALL PRODUCTS'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </aside>

      {/* 2. MOBILE FULL-SCREEN SEARCH (< 768px): Dedicated Full-Screen Overlay */}
      <div
        className="md:hidden fixed inset-0 z-50 bg-white text-black flex flex-col h-[100dvh] overflow-hidden"
        aria-label="Mobile Search Interface"
      >
        {/* Sticky Mobile Search Header: [ ← ] [ Search Bubble Boom... × ] */}
        <div className="pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 px-4 border-b border-neutral-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="p-2 -ml-1 text-black hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Search Bubble Boom..."
                aria-label="Search Bubble Boom"
                className="w-full bg-neutral-100 rounded-full py-2.5 pl-4 pr-9 text-sm font-medium text-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                ) : query ? (
                  <button
                    type="button"
                    onClick={handleClearQuery}
                    aria-label="Clear query"
                    className="p-1 text-neutral-400 hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Horizontally Scrollable Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 border-b border-neutral-100 no-scrollbar bg-white shrink-0">
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
              category === 'all'
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            ALL
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                category === cat.slug
                  ? 'bg-black text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Scrollable Mobile Product Results Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
          {/* Section Heading */}
          <div className="mb-4">
            <h3 className="text-[11px] font-mono uppercase tracking-widest font-extrabold text-black">
              {query.trim()
                ? `SEARCH RESULTS ${products.length > 0 ? `(${totalCount})` : ''}`
                : 'TRENDING AT BUBBLE BOOM'}
            </h3>
          </div>

          {/* Loading Skeleton */}
          {loading && products.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="aspect-[3/4] bg-neutral-100 rounded-xl" />
                  <div className="h-3 bg-neutral-100 rounded-sm w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded-sm w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            /* 2-Column Mobile Product Grid */
            <div className="grid grid-cols-2 gap-3.5">
              {products.map((product) => {
                const discount = formatDiscount(product.mrp, product.selling_price)
                const hasDiscount = discount > 0 && product.mrp > product.selling_price

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={closeSearch}
                    className="group flex flex-col bg-white rounded-xl focus:outline-none"
                  >
                    {/* Portrait Photograph */}
                    <div className="relative aspect-[3/4] bg-neutral-100 rounded-xl overflow-hidden mb-2">
                      {product.image_url ? (
                        <Image
                          src={getSafeImageUrl(product.image_url)}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 200px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-mono uppercase text-neutral-400">
                          BOOM
                        </div>
                      )}

                      {/* Genuine Discount Badge */}
                      {hasDiscount && (
                        <span className="absolute top-1.5 left-1.5 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wider">
                          -{discount}%
                        </span>
                      )}

                      {/* Stock Status Badge */}
                      {!product.in_stock && (
                        <span className="absolute top-1.5 right-1.5 bg-neutral-900/90 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                          Sold Out
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      {product.category && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 block mb-0.5">
                          {product.category}
                        </span>
                      )}
                      <h4 className="text-xs font-semibold text-black line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-black">
                          {formatPrice(product.selling_price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-neutral-400 line-through">
                            {formatPrice(product.mrp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            /* Mobile Empty State */
            <div className="py-12 text-center max-w-xs mx-auto flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-3 text-neutral-400">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-mono uppercase tracking-widest font-extrabold text-black mb-1">
                NO PRODUCTS FOUND
              </h4>
              <p className="text-xs text-neutral-500 mb-5">
                Try another search or explore our collections.
              </p>
              <div className="flex items-center gap-2">
                {query && (
                  <button
                    type="button"
                    onClick={handleClearQuery}
                    className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider border border-black text-black"
                  >
                    Clear Search
                  </button>
                )}
                <Link
                  href="/shop"
                  onClick={closeSearch}
                  className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-black text-white"
                >
                  Shop All
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sticky Footer Action */}
        <div className="p-3 border-t border-neutral-200 bg-white shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <Link
            href={viewAllHref}
            onClick={closeSearch}
            className="w-full bg-black text-white py-3 px-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
          >
            <span>{query.trim() ? 'VIEW ALL RESULTS' : 'VIEW ALL PRODUCTS'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
