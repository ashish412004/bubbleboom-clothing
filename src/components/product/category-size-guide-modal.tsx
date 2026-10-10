'use client'

import { useState, useEffect } from 'react'
import { X, Ruler, Footprints, Info } from 'lucide-react'

export type CategoryType = 'tops' | 'bottomwear' | 'footwear' | 'accessories'

export function getProductCategoryType(product: {
  category_id?: string | null
  category?: { name?: string; slug?: string } | null
  name?: string
  slug?: string
  tags?: string[] | null
} | string | null | undefined): CategoryType {
  if (!product) return 'tops'

  let catSlug = ''
  let catName = ''
  let prodSlug = ''
  let prodName = ''
  let tags: string[] = []

  if (typeof product === 'string') {
    catSlug = product.toLowerCase().trim()
    catName = catSlug
    prodName = catSlug
  } else {
    catSlug = (product.category?.slug || '').toLowerCase()
    catName = (product.category?.name || '').toLowerCase()
    prodSlug = (product.slug || '').toLowerCase()
    prodName = (product.name || '').toLowerCase()
    tags = (product.tags || []).map((t) => t.toLowerCase())
  }

  // 1. Footwear check
  if (
    catSlug === 'footwear' ||
    catSlug === 'shoes' ||
    catSlug === 'sneakers' ||
    catName.includes('footwear') ||
    catName.includes('shoe') ||
    catName.includes('sneaker') ||
    catName.includes('kicks') ||
    prodSlug.includes('sneaker') ||
    prodSlug.includes('shoe') ||
    prodSlug.includes('kicks') ||
    prodSlug.includes('slide') ||
    prodName.includes('sneaker') ||
    prodName.includes('shoe') ||
    prodName.includes('kicks') ||
    tags.includes('footwear') ||
    tags.includes('sneakers') ||
    tags.includes('shoes')
  ) {
    return 'footwear'
  }

  // 2. Bottomwear check
  if (
    catSlug === 'jeans' ||
    catSlug === 'cargos' ||
    catSlug === 'cargo-bottoms' ||
    catSlug === 'joggers' ||
    catSlug === 'shorts' ||
    catSlug === 'pants' ||
    catName.includes('jean') ||
    catName.includes('cargo') ||
    catName.includes('jogger') ||
    catName.includes('short') ||
    catName.includes('bottom') ||
    catName.includes('pant') ||
    prodSlug.includes('cargo') ||
    prodSlug.includes('jean') ||
    prodSlug.includes('jogger') ||
    prodSlug.includes('short') ||
    prodSlug.includes('pant') ||
    prodName.includes('cargo') ||
    prodName.includes('jean') ||
    prodName.includes('jogger') ||
    prodName.includes('short') ||
    prodName.includes('pant')
  ) {
    return 'bottomwear'
  }

  // 3. Accessories check
  if (
    catSlug === 'accessories' ||
    catSlug === 'jewelry' ||
    catName.includes('accessor') ||
    catName.includes('jewel') ||
    prodSlug.includes('cap') ||
    prodSlug.includes('beanie') ||
    prodSlug.includes('sock') ||
    prodSlug.includes('bag') ||
    prodSlug.includes('belt') ||
    prodSlug.includes('wallet')
  ) {
    return 'accessories'
  }

  // 4. Default to Tops (T-Shirts, Hoodies, Shirts, Sweatshirts, Outerwear)
  return 'tops'
}

interface CategorySizeGuideModalProps {
  isOpen: boolean
  onClose: () => void
  categoryType: CategoryType
}

export function CategorySizeGuideModal({
  isOpen,
  onClose,
  categoryType,
}: CategorySizeGuideModalProps) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in')

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || categoryType === 'accessories') return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-black max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
                Fit Guide
              </span>
              <span className="text-xs font-mono uppercase text-neutral-500">
                {categoryType === 'footwear'
                  ? 'Footwear & Kicks Matrix'
                  : categoryType === 'bottomwear'
                  ? 'Bottomwear & Pant Sizing'
                  : 'Tops & Silhouette Cut'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg uppercase tracking-tight font-black mt-1">
              {categoryType === 'footwear'
                ? 'Footwear Size Chart & Conversions'
                : categoryType === 'bottomwear'
                ? 'Bottomwear Size Guide'
                : 'Tops Size Guide'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 border border-transparent hover:border-black transition-colors"
            aria-label="Close size guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Footwear Specific Guide */}
        {categoryType === 'footwear' && (
          <div className="space-y-5">
            <p className="text-xs text-neutral-600 font-mono leading-relaxed">
              Standard unisex streetwear shoe size conversion chart. Bubble Boom sneakers feature sculpted outsoles and comfortable padded interiors.
            </p>

            <div className="border border-black overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-[#F8F8F6] border-b border-black">
                  <tr>
                    <th className="p-2.5 font-black uppercase">UK / India</th>
                    <th className="p-2.5 font-black uppercase">EU</th>
                    <th className="p-2.5 font-black uppercase">US Men</th>
                    <th className="p-2.5 font-black uppercase">US Women</th>
                    <th className="p-2.5 font-black uppercase">Foot Length (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">UK 6</td>
                    <td className="p-2.5">40</td>
                    <td className="p-2.5">7</td>
                    <td className="p-2.5">8.5</td>
                    <td className="p-2.5 font-bold">25.0 cm</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">UK 7</td>
                    <td className="p-2.5">41</td>
                    <td className="p-2.5">8</td>
                    <td className="p-2.5">9.5</td>
                    <td className="p-2.5 font-bold">25.8 cm</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">UK 8</td>
                    <td className="p-2.5">42</td>
                    <td className="p-2.5">9</td>
                    <td className="p-2.5">10.5</td>
                    <td className="p-2.5 font-bold">26.6 cm</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">UK 9</td>
                    <td className="p-2.5">43</td>
                    <td className="p-2.5">10</td>
                    <td className="p-2.5">11.5</td>
                    <td className="p-2.5 font-bold">27.5 cm</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">UK 10</td>
                    <td className="p-2.5">44</td>
                    <td className="p-2.5">11</td>
                    <td className="p-2.5">12.5</td>
                    <td className="p-2.5 font-bold">28.3 cm</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">UK 11</td>
                    <td className="p-2.5">45</td>
                    <td className="p-2.5">12</td>
                    <td className="p-2.5">13.5</td>
                    <td className="p-2.5 font-bold">29.2 cm</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">UK 12</td>
                    <td className="p-2.5">46</td>
                    <td className="p-2.5">13</td>
                    <td className="p-2.5">14.5</td>
                    <td className="p-2.5 font-bold">30.0 cm</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* How to Measure Foot Length */}
            <div className="bg-[#F8F8F6] border border-black p-4 space-y-2">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight">
                <Footprints size={16} />
                <span>How to Measure Your Foot Length</span>
              </div>
              <ol className="text-xs text-neutral-600 font-mono space-y-1.5 list-decimal pl-4">
                <li>Place a sheet of paper on the floor against a flat wall.</li>
                <li>Stand on the paper with your heel firmly touching the wall.</li>
                <li>Mark the furthest point of your longest toe with a pencil.</li>
                <li>Measure the distance from the edge of the paper/heel to the mark in centimetres using a ruler.</li>
                <li>
                  Compare with the table above. If you are between sizes or prefer extra toe room with streetwear socks, we recommend choosing the next size up.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Bottomwear Specific Guide */}
        {categoryType === 'bottomwear' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-600 font-mono">
                Relaxed streetwear cuts for utility cargos, denim jeans, joggers, and fleece shorts.
              </p>
              <div className="flex items-center border border-black p-0.5 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={`px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${
                    unit === 'in' ? 'bg-black text-white' : 'text-neutral-600'
                  }`}
                >
                  Inches (&quot;)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${
                    unit === 'cm' ? 'bg-black text-white' : 'text-neutral-600'
                  }`}
                >
                  CM
                </button>
              </div>
            </div>

            <div className="border border-black overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-[#F8F8F6] border-b border-black">
                  <tr>
                    <th className="p-2.5 font-black uppercase">Size</th>
                    <th className="p-2.5 font-black uppercase">Waist</th>
                    <th className="p-2.5 font-black uppercase">Hip</th>
                    <th className="p-2.5 font-black uppercase">Inseam</th>
                    <th className="p-2.5 font-black uppercase">Outseam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">30 (S)</td>
                    <td className="p-2.5">{unit === 'in' ? '30" - 32"' : '76.2 - 81.3 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '40"' : '101.6 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '30"' : '76.2 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '41"' : '104.1 cm'}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">32 (M)</td>
                    <td className="p-2.5">{unit === 'in' ? '32" - 34"' : '81.3 - 86.4 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '42"' : '106.7 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '30.5"' : '77.5 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '41.5"' : '105.4 cm'}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">34 (L)</td>
                    <td className="p-2.5">{unit === 'in' ? '34" - 36"' : '86.4 - 91.4 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '44"' : '111.8 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '31"' : '78.7 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '42"' : '106.7 cm'}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">36 (XL)</td>
                    <td className="p-2.5">{unit === 'in' ? '36" - 38"' : '91.4 - 96.5 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '46"' : '116.8 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '31.5"' : '80.0 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '42.5"' : '108.0 cm'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-2 bg-[#F8F8F6] border border-black p-3 text-xs text-neutral-600 font-mono">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>
                Cargos and joggers feature elastic drawstrings and belt loops for an adjustable waist fit.
              </span>
            </div>
          </div>
        )}

        {/* Tops Specific Guide */}
        {categoryType === 'tops' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-600 font-mono">
                Crafted with signature drop shoulders and relaxed chest widths.
              </p>
              <div className="flex items-center border border-black p-0.5 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={`px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${
                    unit === 'in' ? 'bg-black text-white' : 'text-neutral-600'
                  }`}
                >
                  Inches (&quot;)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${
                    unit === 'cm' ? 'bg-black text-white' : 'text-neutral-600'
                  }`}
                >
                  CM
                </button>
              </div>
            </div>

            <div className="border border-black overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-[#F8F8F6] border-b border-black">
                  <tr>
                    <th className="p-2.5 font-black uppercase">Size</th>
                    <th className="p-2.5 font-black uppercase">Chest</th>
                    <th className="p-2.5 font-black uppercase">Length</th>
                    <th className="p-2.5 font-black uppercase">Shoulder</th>
                    <th className="p-2.5 font-black uppercase">Sleeve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">S</td>
                    <td className="p-2.5">{unit === 'in' ? '42"' : '106.7 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '28"' : '71.1 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '20.5"' : '52.1 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '8.5"' : '21.6 cm'}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">M</td>
                    <td className="p-2.5">{unit === 'in' ? '44"' : '111.8 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '29"' : '73.7 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '21.5"' : '54.6 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '9.0"' : '22.9 cm'}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">L</td>
                    <td className="p-2.5">{unit === 'in' ? '46"' : '116.8 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '30"' : '76.2 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '22.5"' : '57.2 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '9.5"' : '24.1 cm'}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">XL</td>
                    <td className="p-2.5">{unit === 'in' ? '48"' : '121.9 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '31"' : '78.7 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '23.5"' : '59.7 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '10.0"' : '25.4 cm'}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold">XXL</td>
                    <td className="p-2.5">{unit === 'in' ? '50"' : '127.0 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '32"' : '81.3 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '24.5"' : '62.2 cm'}</td>
                    <td className="p-2.5">{unit === 'in' ? '10.5"' : '26.7 cm'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-2 bg-[#F8F8F6] border border-black p-3 text-xs text-neutral-600 font-mono">
              <Ruler size={16} className="shrink-0 mt-0.5" />
              <span>
                For true-to-oversized streetwear style, select your standard size. For a standard fitted look, order one size down.
              </span>
            </div>
          </div>
        )}

        {/* Footer Close */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-black hover:bg-neutral-800 transition-colors"
          >
            Close Fit Guide
          </button>
        </div>
      </div>
    </div>
  )
}
