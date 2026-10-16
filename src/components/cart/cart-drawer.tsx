'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCartStore, CartStoreItem } from '@/lib/cart-store'
import { CartQuantityControl } from './cart-quantity-control'
import { formatPrice, getSafeImageUrl, findImageForVariantColor } from '@/lib/utils'
import toast from 'react-hot-toast'

export function CartDrawer() {
  const router = useRouter()
  const isOpen = useCartStore((state) => state.isCartDrawerOpen)
  const closeCart = useCartStore((state) => state.closeCartDrawer)
  const items = useCartStore((state) => state.items)
  const summary = useCartStore((state) => state.summary)
  const itemCount = useCartStore((state) => state.itemCount)
  const updateQuantity = useCartStore((state) => state.updateCartItemQuantityAction)
  const removeItem = useCartStore((state) => state.removeCartItemAction)
  const restoreItem = useCartStore((state) => state.restoreCartItemAction)

  const [removingItemIds, setRemovingItemIds] = useState<Set<string>>(new Set())
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on ESC key and prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeCart])

  const subtotalPaise = summary?.subtotal_paise ?? items.reduce((sum, item) => {
    const price = item.variant?.product?.selling_price || 0
    return sum + Math.round(price * 100) * (item.quantity || 1)
  }, 0)

  const thresholdPaise = summary?.free_shipping_threshold_paise ?? 149900
  const freeShippingRemaining = Math.max(0, thresholdPaise - subtotalPaise)
  const freeShippingProgress = Math.min(100, Math.round((subtotalPaise / thresholdPaise) * 100))

  const handleRemoveDrawerItem = (item: CartStoreItem) => {
    if (removingItemIds.has(item.id)) return

    // 1. Mark as removing (initiates CSS collapse)
    setRemovingItemIds((prev) => new Set(prev).add(item.id))

    // 2. Show lightweight Undo toast
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
          } transition-all duration-200 max-w-sm w-full bg-black text-white px-4 py-3 shadow-2xl border border-neutral-800 flex items-center justify-between gap-3 text-xs`}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
            <span className="truncate">
              Removed <strong className="font-bold text-white">{item.variant?.product?.name}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id)
              const res = await restoreItem(item)
              if (res.success) {
                toast.success(`Restored ${item.variant?.product?.name} to bag`, {
                  style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px', fontSize: '12px' },
                })
              } else {
                toast.error(res.error || 'Failed to restore item')
              }
            }}
            className="shrink-0 bg-white text-black hover:bg-neutral-200 active:scale-95 px-3 py-1 font-mono uppercase text-[10px] font-black tracking-wider transition-all"
          >
            Undo
          </button>
        </div>
      ),
      { id: `undo-drawer-${item.id}`, duration: 5000 }
    )

    // 3. After 280ms collapse animation, remove from store
    setTimeout(() => {
      removeItem(item.id)
      setRemovingItemIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }, 280)
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-out Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your Shopping Bag"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] max-w-full bg-white text-black shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-black" />
            <h2 className="text-xs font-mono uppercase tracking-widest font-extrabold text-black">
              Shopping Bag ({itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close bag drawer"
            className="p-1.5 text-neutral-500 hover:text-black transition-colors rounded-full hover:bg-neutral-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="px-5 py-3 bg-[#F8F8F6] border-b border-neutral-200 text-xs">
          {freeShippingRemaining > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono text-neutral-600">
                Add <strong className="text-black font-bold">{formatPrice(Math.round(freeShippingRemaining / 100))}</strong> more for <span className="font-bold text-[#DC2626]">FREE SHIPPING</span>
              </p>
              <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-300 ease-out"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-[11px] font-mono font-bold text-black flex items-center gap-1.5">
              <Truck size={14} className="text-black" />
              <span>You unlocked <strong>FREE STANDARD DELIVERY!</strong></span>
            </p>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                <ShoppingBag size={22} className="text-neutral-400" />
              </div>
              <h3 className="text-xs uppercase font-mono tracking-widest font-black text-black mb-1">
                Your bag is empty
              </h3>
              <p className="text-xs text-neutral-500 mb-6 max-w-xs font-mono">
                Explore our heavyweight street drops and add items to your wardrobe.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCart()
                  router.push('/shop')
                }}
                className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors active:scale-95"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            items.map((item) => {
              const product = item.variant?.product
              const variant = item.variant
              const image = findImageForVariantColor(product?.images || [], variant?.color) || product?.images?.[0]
              const sellingPrice = product?.selling_price || 0
              const itemTotal = sellingPrice * item.quantity
              const isRemoving = removingItemIds.has(item.id)

              return (
                <div
                  key={item.id}
                  className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                    isRemoving
                      ? 'grid-rows-[0fr] opacity-0 -translate-x-4 pointer-events-none'
                      : 'grid-rows-[1fr] opacity-100 translate-x-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="py-4 flex gap-4 border-b border-neutral-100">
                      {/* Thumbnail */}
                      <Link
                        href={`/products/${product?.slug || ''}`}
                        onClick={closeCart}
                        className="relative w-20 h-24 bg-neutral-100 shrink-0 overflow-hidden border border-neutral-200"
                      >
                        {image?.image_url ? (
                          <Image
                            src={getSafeImageUrl(image.image_url)}
                            alt={product?.name || 'Garment'}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] font-mono uppercase text-neutral-400">
                            BOOM
                          </div>
                        )}
                      </Link>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/products/${product?.slug || ''}`}
                              onClick={closeCart}
                              className="text-xs font-bold uppercase tracking-tight text-black hover:underline truncate"
                            >
                              {product?.name || 'Product'}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemoveDrawerItem(item)}
                              disabled={isRemoving}
                              aria-label={`Remove ${product?.name} (${variant?.color}, Size ${variant?.size}) from bag`}
                              title="Remove item"
                              className="group/del text-neutral-400 hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90 transition-all p-1.5 rounded-xs shrink-0"
                            >
                              <Trash2 size={15} className="transition-transform group-hover/del:scale-110" />
                            </button>
                          </div>

                          <div className="text-[11px] font-mono text-neutral-500 mt-1 space-x-2">
                            <span>{variant?.color || 'Original'}</span>
                            <span>&bull;</span>
                            <span className="font-bold text-black uppercase">Size: {variant?.size || 'Free'}</span>
                          </div>
                        </div>

                        {/* Quantity Stepper & Price */}
                        <div className="flex items-center justify-between mt-3 pt-1">
                          <CartQuantityControl
                            quantity={item.quantity}
                            maxStock={variant?.stock ?? 99}
                            size="sm"
                            itemTitle={product?.name || 'Product'}
                            disabled={isRemoving}
                            onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                            onDecrease={() => {
                              if (item.quantity <= 1) {
                                handleRemoveDrawerItem(item)
                              } else {
                                updateQuantity(item.id, item.quantity - 1)
                              }
                            }}
                          />

                          <span className="text-xs font-mono font-extrabold text-black">
                            {formatPrice(itemTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Drawer Footer with Subtotal & CTAs */}
        {items.length > 0 && (
          <div className="p-5 border-t border-neutral-200 bg-[#F8F8F6] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="uppercase text-neutral-600 font-bold tracking-wider">Subtotal</span>
              <span className="text-sm font-black text-black">
                {formatPrice(Math.round(subtotalPaise / 100))}
              </span>
            </div>

            <p className="text-[10px] font-mono text-neutral-500">
              Shipping &amp; coupons calculated at checkout.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  closeCart()
                  router.push('/checkout')
                }}
                className="w-full h-12 bg-black text-white hover:bg-neutral-800 text-xs uppercase tracking-widest font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Checkout</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => {
                  closeCart()
                  router.push('/cart')
                }}
                className="w-full h-11 border border-black bg-white text-black hover:bg-neutral-100 text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer"
              >
                View Full Bag
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
