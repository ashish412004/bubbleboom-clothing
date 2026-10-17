'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WishlistItemWithDetails } from '@/lib/wishlist'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { Trash2, ShoppingBag, ArrowRight, Eye } from 'lucide-react'
import { getSafeImageUrl, formatPrice, formatDiscount } from '@/lib/utils'

interface WishlistViewProps {
  initialItems: WishlistItemWithDetails[]
}

export function WishlistView({ initialItems }: WishlistViewProps) {
  const [items, setItems] = useState<WishlistItemWithDetails[]>(initialItems)
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null)
  const refreshCart = useCartStore((s) => s.refreshCart)
  const refreshWishlist = useCartStore((s) => s.refreshWishlist)

  const handleRemove = async (variantId: string) => {
    try {
      setLoadingVariantId(variantId)
      const res = await fetch(`/api/wishlist?variantId=${encodeURIComponent(variantId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove item')

      setItems((prev) => prev.filter((item) => item.variant_id !== variantId))
      await refreshWishlist()
      toast.success('Removed from wishlist', {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
      })
    } catch {
      toast.error('Could not remove item from wishlist', {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
      })
    } finally {
      setLoadingVariantId(null)
    }
  }

  const handleMoveToCart = async (item: WishlistItemWithDetails) => {
    try {
      setLoadingVariantId(item.variant_id)

      // 1. Add to cart
      const cartRes = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: item.variant_id, quantity: 1 }),
      })

      if (!cartRes.ok) {
        const errorData = await cartRes.json()
        throw new Error(errorData.error || 'Failed to add to cart')
      }

      // 2. Remove from wishlist
      await fetch(`/api/wishlist?variantId=${encodeURIComponent(item.variant_id)}`, {
        method: 'DELETE',
      })

      setItems((prev) => prev.filter((i) => i.variant_id !== item.variant_id))
      await Promise.all([refreshCart(), refreshWishlist()])
      toast.success('Moved to bag!', {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
      })
    } catch (err: any) {
      toast.error(err.message || 'Could not move item to bag', {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
      })
    } finally {
      setLoadingVariantId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center border border-dashed border-neutral-300 max-w-2xl mx-auto my-12 p-8">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-black">
          <ShoppingBag className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-xl uppercase tracking-widest font-black mb-2">Your Wishlist is Empty</h2>
        <p className="text-xs text-neutral-600 mb-6 max-w-sm mx-auto">
          Save your favourite streetwear drops and limited editions here to keep track of sizing and stock.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-black text-white px-8 py-3.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
        >
          <span>Explore Drops</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-8">
      {items.map((item) => {
        const product = item.variant?.product
        const variant = item.variant
        if (!product || !variant) return null

        const mainImage = getSafeImageUrl(product.images?.[0]?.image_url)
        const discountPercent = formatDiscount(product.mrp, product.selling_price)
        const hasDiscount = discountPercent > 0
        const isOutOfStock = variant.stock <= 0
        const isLoading = loadingVariantId === item.variant_id

        return (
          <div
            key={item.id}
            className="group flex flex-col border border-black bg-white overflow-hidden rounded-[20px] shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Image Box */}
            <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
              <Link href={`/products/${product.slug}`} className="block w-full h-full">
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </Link>

              {/* Status Badge */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                {isOutOfStock ? (
                  <span className="bg-black text-white text-[10px] font-mono uppercase px-2 py-0.5 border border-white">
                    Sold Out
                  </span>
                ) : hasDiscount ? (
                  <span className="bg-white text-black border border-black text-[10px] font-mono font-bold px-2 py-0.5 shadow-sm">
                    {discountPercent}% OFF
                  </span>
                ) : null}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(item.variant_id)}
                disabled={isLoading}
                aria-label="Remove from wishlist"
                title="Remove from wishlist"
                className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-black hover:text-white text-black p-2 border border-black transition-colors rounded-full shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Details */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <Link href={`/products/${product.slug}`}>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-black line-clamp-1 hover:underline">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-xs text-neutral-500 font-mono mt-1">
                  Size: {variant.size} | Color: {variant.color}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-black text-black">
                    {formatPrice(product.selling_price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs text-neutral-400 line-through">
                      {formatPrice(product.mrp)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => handleMoveToCart(item)}
                  disabled={isLoading || isOutOfStock}
                  className="w-full bg-black text-white py-2.5 px-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Sold Out' : 'Move to Bag'}</span>
                </button>

                <Link
                  href={`/products/${product.slug}`}
                  className="w-full border border-black text-black py-2 px-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Product</span>
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

