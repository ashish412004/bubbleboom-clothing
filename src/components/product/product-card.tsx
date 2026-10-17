'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, Eye } from 'lucide-react'
import { formatPrice, formatDiscount, getSafeImageUrl } from '@/lib/utils'
import { useState } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { QuickViewModal } from './quick-view-modal'
import toast from 'react-hot-toast'

export interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    mrp: number
    selling_price: number
    images?: Array<{
      image_url: string
      alt_text: string | null
    }>
    variants?: Array<{
      id: string
      color: string
      size: string
      stock: number
    }>
  }
  priority?: boolean
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const isWishlisted = useCartStore((state) => state.isItemWishlisted(product.id))
  const toggleWishlistStore = useCartStore((state) => state.toggleWishlistStore)

  const firstImage = product.images?.[0]
  const secondImage = product.images?.[1]
  const discount = formatDiscount(product.mrp, product.selling_price)
  const hasDiscount = discount > 0

  // Unique colors
  const colors = Array.from(
    new Set((product.variants || []).map((v) => v.color).filter(Boolean))
  )

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await toggleWishlistStore(product.id)
      if (res.inWishlist) {
        toast.success('Added to wishlist', {
          style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
        })
      } else {
        toast('Removed from wishlist', {
          style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
        })
      }
    } catch {
      toast.error('Failed to update wishlist', {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
      })
    }
  }

  return (
    <>
      <div className="group flex flex-col bg-white">
        {/* Product Image Area: Rounded [20px] to match Shop By Category cards */}
        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden rounded-[20px] mb-3 shadow-2xs group-hover:shadow-md transition-all duration-300">
          <Link href={`/products/${product.slug}`} className="absolute inset-0">
            {firstImage && !imageError ? (
              <>
                <Image
                  src={getSafeImageUrl(firstImage.image_url)}
                  alt={firstImage.alt_text || product.name}
                  fill
                  priority={priority}
                  onError={() => setImageError(true)}
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {secondImage && (
                  <div className="hidden sm:block absolute inset-0">
                    <Image
                      src={getSafeImageUrl(secondImage.image_url)}
                      alt={secondImage.alt_text || product.name}
                      fill
                      loading="lazy"
                      className="object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 p-4">
                <span className="text-xs uppercase tracking-widest font-bold">BUBBLE BOOM</span>
              </div>
            )}
          </Link>

          {/* Discount Badge: Rounded pill inside rounded-[20px] container */}
          {hasDiscount && (
            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <span className="bg-black text-white text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md shadow-sm">
                {discount}% OFF
              </span>
            </div>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={handleWishlistToggle}
            className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-200 shadow-sm active:scale-90 focus:outline-none ${
              isWishlisted
                ? 'bg-red-50 text-[#DC2626] border border-[#DC2626]/30'
                : 'bg-white/90 hover:bg-white text-black hover:scale-110'
            }`}
          >
            <Heart
              size={16}
              className={`transition-all duration-200 ${
                isWishlisted ? 'fill-[#DC2626] text-[#DC2626] scale-110' : 'text-black'
              }`}
            />
          </button>

          {/* Desktop Quick View Overlay Button */}
          <div className="hidden sm:block absolute inset-x-3 bottom-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-250">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setQuickViewOpen(true)
              }}
              className="w-full py-2.5 bg-white/95 hover:bg-black text-black hover:text-white border border-black text-[10px] uppercase font-mono tracking-widest font-black rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-98"
            >
              <Eye size={13} />
              <span>Quick View</span>
            </button>
          </div>
        </div>

        {/* Product Information */}
        <div className="flex flex-col flex-grow">
          {/* Colors available */}
          {colors.length > 0 && (
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">
              {colors.length === 1 ? colors[0] : `${colors.length} Colors`}
            </p>
          )}

          <Link href={`/products/${product.slug}`} className="group-hover:underline">
            <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-black line-clamp-1 mb-1.5">
              {product.name}
            </h3>
          </Link>

          {/* Pricing */}
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-sm sm:text-base font-bold text-black tracking-tight">
              {formatPrice(product.selling_price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product as any}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  )
}
