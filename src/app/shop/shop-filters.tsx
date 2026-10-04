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
    router.push(`/shop?${params.toString()}`)
  }

  const clearAllFilters = () => {
    router.push('/shop')
    setMobileDrawerOpen(false)
  }

  const sizes = ['S', 'M', 'L', 'XL', 'XXL', '30', '32', '34']
  const colors = ['Black', 'White', 'Charcoal', 'Grey']

  const filterContent = (
    <div className="space-y-8 text-black">
      {/* Sort Section */}
      <div>
        <h4 className="text-xs uppercase tracking-widest font-extrabold mb-3">Sort By</h4>
        <select
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="w-full bg-white border border-neutral-300 text-xs px-3 py-2.5 font-medium focus:outline-none focus:border-black"
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
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParam('category', null)}
            className={`block text-xs text-left w-full py-1 hover:text-black transition-colors ${
              !currentCategory ? 'font-bold underline' : 'text-neutral-500'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParam('category', cat.slug)}
              className={`block text-xs text-left w-full py-1 hover:text-black transition-colors ${
                currentCategory === cat.slug ? 'font-bold underline text-black' : 'text-neutral-500'
              }`}
            >
              {cat.name}
            </button>
          ))}
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
                className={`min-w-9 h-9 px-2 text-xs font-bold border transition-colors flex items-center justify-center ${
                  isSelected
                    ? 'bg-black text-white border-black'
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
        <div className="space-y-1.5">
          {colors.map((c) => {
            const isSelected = currentColor.toLowerCase() === c.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                onClick={() => updateParam('color', isSelected ? null : c)}
                className={`flex items-center text-xs w-full py-1 hover:text-black transition-colors ${
                  isSelected ? 'font-bold text-black' : 'text-neutral-500'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full mr-2 border border-neutral-400 ${
                    c === 'Black'
                      ? 'bg-black'
                      : c === 'White'
                      ? 'bg-white'
                      : c === 'Charcoal'
                      ? 'bg-neutral-800'
                      : 'bg-neutral-400'
                  }`}
                />
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h4 className="text-xs uppercase tracking-widest font-extrabold mb-3">Availability</h4>
        <label className="flex items-center text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
            className="w-4 h-4 text-black border-neutral-300 focus:ring-0 mr-2 accent-black"
          />
          In Stock Only
        </label>
      </div>

      {/* Clear Filters */}
      {(currentCategory || currentSize || currentColor || inStock) && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="w-full text-xs uppercase tracking-widest font-bold border border-black py-2.5 hover:bg-black hover:text-white transition-colors"
        >
          Reset Filters
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
          className="flex items-center text-xs uppercase tracking-wider font-bold border border-neutral-300 px-3.5 py-2 hover:border-black"
        >
          <SlidersHorizontal size={14} className="mr-2" />
          Filter &amp; Sort
        </button>

        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl p-6 overflow-y-auto z-10 animate-in slide-in-from-right">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200">
                <span className="text-xs uppercase tracking-widest font-extrabold">Filter Catalog</span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 hover:bg-neutral-100"
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
