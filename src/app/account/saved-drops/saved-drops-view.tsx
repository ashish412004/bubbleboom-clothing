'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WishlistItemWithDetails } from '@/lib/wishlist'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { Heart, ShoppingBag, Eye, Trash2, ArrowRight } from 'lucide-react'
import { getSafeImageUrl, formatPrice, formatDiscount } from '@/lib/utils'

interface SavedDropsViewProps {
  initialItems: WishlistItemWithDetails[]
}

export function SavedDropsView({ initialItems }: SavedDropsViewProps) {
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
      toast.success('Removed from Saved Drops')
    } catch {
      toast.error('Could not remove item from Saved Drops')
    } finally {
      setLoadingVariantId(null)
    }
  }

  const handleAddToCart = async (item: WishlistItemWithDetails) => {
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

      await refreshCart()
      toast.success(`Added ${item.variant?.product?.name || 'item'} to bag!`)
    } catch (err: any) {
      toast.error(err.message || 'Could not add to bag')
    } finally {
      setLoadingVariantId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="pb-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black">
              SAVED DROPS
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Your wishlist &amp; curated drops
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full self-start sm:self-auto">
            0 Saved
          </span>
        </div>

        <div className="bg-[#F9F9FB] rounded-2xl p-12 border border-dashed border-neutral-300 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center mx-auto shadow-2xs">
            <Heart className="w-6 h-6 text-neutral-400" />
          </div>
          <h3 className="text-base uppercase tracking-tight font-black text-black">
            No Saved Drops Yet
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            You haven&apos;t saved any limited streetwear pieces or footwear drops to your vault yet.
          </p>
          <div className="pt-2">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors shadow-xs"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-black">
            SAVED DROPS
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {items.length} {items.length === 1 ? 'piece saved' : 'pieces saved'}
          </p>
        </div>
        <Link
          href="/shop"
          className="text-xs uppercase tracking-wider font-bold text-neutral-800 hover:text-black flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Explore Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid of Saved Drops */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              className="rounded-2xl border border-neutral-200/90 bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-black/50 transition-all"
            >
              {/* Product Image Box */}
              <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                <Link href={`/products/${product.slug}`} className="block w-full h-full">
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </Link>

                {/* Stock or Discount Badge */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                  {isOutOfStock ? (
                    <span className="bg-black text-white text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold">
                      Sold Out
                    </span>
                  ) : hasDiscount ? (
                    <span className="bg-white text-black border border-neutral-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs">
                      {discountPercent}% OFF
                    </span>
                  ) : null}
                </div>

                {/* Red Filled Wishlist Heart button (active state) */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.variant_id)}
                  disabled={isLoading}
                  aria-label="Remove from Saved Drops"
                  title="Remove from Saved Drops"
                  className="absolute top-2.5 right-2.5 z-10 bg-white/90 backdrop-blur-xs hover:bg-white p-2 rounded-full border border-neutral-200 shadow-xs cursor-pointer transition-transform hover:scale-110"
                >
                  <Heart className="w-4 h-4 fill-[#DC2626] text-[#DC2626]" />
                </button>
              </div>

              {/* Product Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="text-xs font-bold uppercase tracking-tight text-black line-clamp-1 hover:underline">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-[11px] text-neutral-500 font-mono mt-1">
                    Size: <span className="font-bold text-black">{variant.size}</span> | Color:{' '}
                    <span className="font-bold text-black">{variant.color}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-black text-black font-mono">
                      {formatPrice(product.selling_price)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-neutral-400 line-through font-mono">
                        {formatPrice(product.mrp)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    disabled={isLoading || isOutOfStock}
                    className="w-full bg-black text-white py-2 px-3 rounded-xl text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
                  </button>

                  <div className="flex gap-2">
                    <Link
                      href={`/products/${product.slug}`}
                      className="flex-1 border border-neutral-200 rounded-xl text-neutral-800 py-2 px-3 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.variant_id)}
                      disabled={isLoading}
                      className="border border-neutral-200 rounded-xl text-neutral-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 px-3 py-2 text-xs transition-colors flex items-center justify-center cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
