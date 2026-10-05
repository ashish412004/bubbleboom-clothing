'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WishlistItemWithDetails } from '@/lib/wishlist'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { getSafeImageUrl } from '@/lib/utils'

interface WishlistViewProps {
  initialItems: WishlistItemWithDetails[]
}

export function WishlistView({ initialItems }: WishlistViewProps) {
  const [items, setItems] = useState<WishlistItemWithDetails[]>(initialItems)
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null)
  const refreshCart = useCartStore((s) => s.refreshCart)
  const decrementWishlist = useCartStore((s) => s.decrementWishlist)

  const handleRemove = async (variantId: string) => {
    try {
      setLoadingVariantId(variantId)
      const res = await fetch(`/api/wishlist?variantId=${encodeURIComponent(variantId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove item')
      
      setItems((prev) => prev.filter((item) => item.variant_id !== variantId))
      decrementWishlist()
      toast.success('Removed from wishlist')
    } catch {
      toast.error('Could not remove item from wishlist')
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
        body: JSON.stringify({ variantId: item.variant_id, quantity: 1 }),
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
      decrementWishlist()
      await refreshCart()
      toast.success('Moved to bag!')
    } catch (err: any) {
      toast.error(err.message || 'Could not move item to bag')
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
          className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
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
        const hasDiscount = product.mrp > product.selling_price
        const discountPercent = hasDiscount
          ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
          : 0
        const isOutOfStock = variant.stock <= 0
        const isLoading = loadingVariantId === item.variant_id

        return (
          <div
            key={item.id}
            className="group flex flex-col border border-black bg-white overflow-hidden"
          >
            {/* Image Box */}
            <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
              <Link href={`/products/${product.slug}`}>
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </Link>

              {/* Status Badge */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {isOutOfStock ? (
                  <span className="bg-black text-white text-[10px] font-mono uppercase px-2 py-0.5 border border-white">
                    Sold Out
                  </span>
                ) : hasDiscount ? (
                  <span className="bg-white text-black border border-black text-[10px] font-mono font-bold px-2 py-0.5">
                    {discountPercent}% OFF
                  </span>
                ) : null}
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(item.variant_id)}
                disabled={isLoading}
                aria-label="Remove from wishlist"
                className="absolute top-2 right-2 bg-white hover:bg-black hover:text-white text-black p-2 border border-black transition-colors"
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
                    ₹{(product.selling_price / 100).toLocaleString('en-IN')}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs text-neutral-400 line-through">
                      ₹{(product.mrp / 100).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Move to bag button */}
              <button
                onClick={() => handleMoveToCart(item)}
                disabled={isLoading || isOutOfStock}
                className="mt-4 w-full bg-black text-white py-2.5 px-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isOutOfStock ? 'Out of Stock' : 'Move to Bag'}</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
