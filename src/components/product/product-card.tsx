'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { formatPrice, formatDiscount } from '@/lib/utils'
import { useState } from 'react'
import { useCartStore } from '@/lib/cart-store'
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
      color: string
      size: string
      stock: number
    }>
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [imageError, setImageError] = useState(false)
  const incrementWishlist = useCartStore((state) => state.setWishlistCount)
  const currentWishlistCount = useCartStore((state) => state.wishlistCount)

  const firstImage = product.images?.[0]
  const secondImage = product.images?.[1]
  const discount = formatDiscount(product.mrp, product.selling_price)
  const hasDiscount = discount > 0

  // Unique colors
  const colors = Array.from(
    new Set((product.variants || []).map((v) => v.color).filter(Boolean))
  )

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nextState = !isWishlisted
    setIsWishlisted(nextState)
    if (nextState) {
      incrementWishlist(currentWishlistCount + 1)
      toast.success('Added to wishlist', {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
      })
    } else {
      incrementWishlist(Math.max(0, currentWishlistCount - 1))
      toast('Removed from wishlist', {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
      })
    }
  }

  return (
    <div className="group flex flex-col bg-white">
      {/* Product Image Area */}
      <Link href={`/products/${product.slug}`} className="relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-3">
        {firstImage && !imageError ? (
          <>
            <Image
              src={firstImage.image_url}
              alt={firstImage.alt_text || product.name}
              fill
              onError={() => setImageError(true)}
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {secondImage && (
              <Image
                src={secondImage.image_url}
                alt={secondImage.alt_text || product.name}
                fill
                className="object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 p-4">
            <span className="text-xs uppercase tracking-widest font-bold">BUBBLE BOOM</span>
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-black text-white text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 shadow-sm">
              {discount}% OFF
            </span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 z-10 p-2 bg-white/90 hover:bg-white text-black transition-all rounded-full shadow-sm hover:scale-110 focus:outline-none"
        >
          <Heart
            size={16}
            className={isWishlisted ? 'fill-black text-black' : 'text-black'}
          />
        </button>
      </Link>

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
  )
}
