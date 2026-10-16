'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface ShopFiltersProps {
  categories: Category[]
  isMobile?: boolean
}

export function ShopFilters({ categories, isMobile = false }: ShopFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const currentCategory = searchParams.get('category') || ''
  const currentSize = searchParams.get('size') || ''
  const currentColor = searchParams.get('color') || ''
  const currentSort = searchParams.get('sort') || 'newest'
  const inStock = searchParams.get('inStock') === 'true'

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '' || (key === 'category' && currentCategory === value)) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/shop?${params.toString()}`, { scroll: false })
  }

  const clearAllFilters = () => {
    router.push('/shop', { scroll: false })
    setMobileDrawerOpen(false)
  }

  const isFootwear = currentCategory.toLowerCase() === 'footwear'
  const sizes = isFootwear
    ? ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12']
    : ['S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', 'UK 7', 'UK 8', 'UK 9', 'UK 10']
  const colors = ['Black', 'White', 'Charcoal', 'Grey']

  const hasAnyActiveFilter = Boolean(currentCategory || currentSize || currentColor || inStock)

  const filterContent = (
    <div className="space-y-7 text-black">
      {/* Active Filter Chips with Red Styling */}
      {hasAnyActiveFilter && (
        <div className="space-y-2 pb-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-widest font-black text-neutral-500">
              Active Filters
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[10px] font-mono uppercase underline font-bold text-neutral-600 hover:text-[#DC2626] transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentCategory && (
              <button
                type="button"
                onClick={() => updateParam('category', null)}
                className="inline-flex items-center gap-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-mono px-2.5 py-1 font-bold transition-all shadow-xs"
              >
                <span>{categories.find((c) => c.slug === currentCategory)?.name || currentCategory}</span>
                <X size={12} />
              </button>
            )}
            {currentSize && (
              <button
                type="button"
                onClick={() => updateParam('size', null)}
                className="inline-flex items-center gap-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-mono px-2.5 py-1 font-bold transition-all shadow-xs"
              >
                <span>Size: {currentSize}</span>
                <X size={12} />
              </button>
            )}
            {currentColor && (
              <button
                type="button"
                onClick={() => updateParam('color', null)}
                className="inline-flex items-center gap-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-mono px-2.5 py-1 font-bold transition-all shadow-xs"
              >
                <span>Color: {currentColor}</span>
                <X size={12} />
              </button>
            )}
            {inStock && (
              <button
                type="button"
                onClick={() => updateParam('inStock', null)}
                className="inline-flex items-center gap-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-mono px-2.5 py-1 font-bold transition-all shadow-xs"
              >
                <span>In Stock</span>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort Section */}
      <div>
        <h4 className="text-xs uppercase tracking-widest font-extrabold mb-3">Sort By</h4>
        <select
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="w-full bg-white border border-neutral-300 text-xs px-3 py-2.5 font-medium focus:outline-none focus:border-black transition-colors"
        >
          <option value="newest">Newest Drops First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="best_selling">Best Selling</option>
        </select>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-xs uppercase tracking-widest font-extrabold mb-3">Category</h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateParam('category', null)}
            className={`block text-xs text-left w-full py-1.5 px-2 transition-all duration-150 rounded-xs ${
              !currentCategory
                ? 'bg-neutral-900 text-white font-extrabold'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = currentCategory.toLowerCase() === cat.slug.toLowerCase()
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateParam('category', cat.slug)}
                className={`block text-xs text-left w-full py-1.5 px-2 transition-all duration-150 rounded-xs ${
                  isSelected
                    ? 'bg-red-50 text-[#DC2626] font-extrabold border-l-2 border-[#DC2626]'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h4 className="text-xs uppercase tracking-widest font-extrabold mb-3">Size</h4>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => {
            const isSelected = currentSize.toLowerCase() === s.toLowerCase()
            return (
              <button
                key={s}
                type="button"
                onClick={() => updateParam('size', isSelected ? null : s)}
                className={`min-w-9 h-9 px-2 text-xs font-bold border transition-all duration-150 flex items-center justify-center select-none active:scale-95 ${
                  isSelected
                    ? 'bg-[#DC2626] text-white border-[#DC2626] font-black shadow-xs'
                    : 'bg-white text-black border-neutral-300 hover:border-black'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Color */}
      <div>
        <h4 className="text-xs uppercase tracking-widest font-extrabold mb-3">Color</h4>
        <div className="space-y-1">
          {colors.map((c) => {
            const isSelected = currentColor.toLowerCase() === c.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                onClick={() => updateParam('color', isSelected ? null : c)}
                className={`flex items-center text-xs w-full py-1.5 px-2 transition-all duration-150 rounded-xs ${
                  isSelected
                    ? 'bg-red-50 text-[#DC2626] font-extrabold border-l-2 border-[#DC2626]'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full mr-2 border border-neutral-400 shrink-0 ${
                    c === 'Black'
                      ? 'bg-black'
                      : c === 'White'
                      ? 'bg-white'
                      : c === 'Charcoal'
                      ? 'bg-neutral-800'
                      : 'bg-neutral-400'
                  }`}
                />
                <span>{c}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h4 className="text-xs uppercase tracking-widest font-extrabold mb-3">Availability</h4>
        <label className="flex items-center text-xs text-neutral-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
            className="w-4 h-4 text-[#DC2626] border-neutral-300 focus:ring-0 mr-2 accent-[#DC2626]"
          />
          <span className={inStock ? 'font-bold text-[#DC2626]' : ''}>In Stock Only</span>
        </label>
      </div>

      {/* Reset CTA */}
      {hasAnyActiveFilter && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="w-full text-xs uppercase tracking-widest font-bold border border-black py-2.5 hover:bg-black hover:text-white transition-colors"
        >
          Reset All Filters
        </button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className={`flex items-center text-xs uppercase tracking-wider font-bold border px-3.5 py-2 transition-colors ${
            hasAnyActiveFilter
              ? 'border-[#DC2626] bg-red-50/60 text-[#DC2626]'
              : 'border-neutral-300 hover:border-black text-black'
          }`}
        >
          <SlidersHorizontal size={14} className="mr-2" />
          Filter &amp; Sort
          {hasAnyActiveFilter && (
            <span className="ml-1.5 w-2 h-2 rounded-full bg-[#DC2626]" />
          )}
        </button>

        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-2xl p-6 overflow-y-auto z-10 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200">
                <span className="text-xs uppercase tracking-widest font-extrabold">Filter Catalog</span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 hover:bg-neutral-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              {filterContent}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="sticky top-28 border border-neutral-200 p-6 bg-white shadow-xs">
      {filterContent}
    </div>
  )
}
