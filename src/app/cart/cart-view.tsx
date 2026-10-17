'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ShoppingBag, ArrowRight, Tag, Truck } from 'lucide-react'
import { formatPrice, getSafeImageUrl, findImageForVariantColor } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import { CartQuantityControl } from '@/components/cart/cart-quantity-control'
import toast from 'react-hot-toast'

interface CartItemData {
  id: string
  cart_id: string
  variant_id: string
  quantity: number
  variant: {
    id: string
    product_id: string
    sku: string
    color: string
    size: string
    stock: number
    product: {
      id: string
      name: string
      slug: string
      mrp: number
      selling_price: number
      images: Array<{
        image_url: string
        alt_text: string | null
      }>
    }
  }
}

interface CartSummaryData {
  subtotal_paise: number
  discount_paise: number
  shipping_paise: number
  cod_fee_paise: number
  total_paise: number
  free_shipping_threshold_paise: number
  free_shipping_remaining_paise: number
  coupon_code: string | null
  coupon_discount_paise: number
}

function computeOptimisticSummary(
  items: CartItemData[],
  thresholdPaise: number,
  shippingRatePaise: number,
  couponCode: string | null
): CartSummaryData {
  const subtotal_paise = items.reduce((sum, item) => {
    const price = item.variant?.product?.selling_price || 0
    return sum + Math.round(price * 100) * item.quantity
  }, 0)

  const shipping_paise =
    subtotal_paise >= thresholdPaise || items.length === 0 ? 0 : shippingRatePaise

  let coupon_discount_paise = 0
  const normalizedCoupon = (couponCode || '').toUpperCase().trim()
  if (normalizedCoupon === 'BOOM10') {
    coupon_discount_paise = Math.round(subtotal_paise * 0.1)
  } else if (normalizedCoupon === 'FIRSTBOOM' && subtotal_paise >= 149900) {
    coupon_discount_paise = 20000
  }

  const discount_paise = Math.min(subtotal_paise, coupon_discount_paise)
  const total_paise = Math.max(0, subtotal_paise - discount_paise + shipping_paise)
  const free_shipping_remaining_paise = Math.max(0, thresholdPaise - subtotal_paise)

  return {
    subtotal_paise,
    discount_paise,
    shipping_paise,
    cod_fee_paise: 0,
    total_paise,
    free_shipping_threshold_paise: thresholdPaise,
    free_shipping_remaining_paise,
    coupon_code: couponCode,
    coupon_discount_paise,
  }
}

export function CartView({
  initialItems,
  initialSummary,
}: {
  initialItems: CartItemData[]
  initialSummary: CartSummaryData
}) {
  const router = useRouter()
  const [items, setItems] = useState<CartItemData[]>(initialItems)
  const [summary, setSummary] = useState<CartSummaryData>(initialSummary)
  const [couponCode, setCouponCode] = useState(initialSummary.coupon_code || '')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set())
  const [removingItemIds, setRemovingItemIds] = useState<Set<string>>(new Set())
  const setStoreCount = useCartStore((state) => state.setItemCount)
  const syncStore = useCartStore((state) => state.syncCartState)

  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
    setStoreCount(totalCount)
    syncStore(items as any, summary as any)
  }, [items, summary, setStoreCount, syncStore])

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    const targetItem = items.find((i) => i.id === itemId)
    if (!targetItem) return

    if (newQty < 1) {
      handleRemoveItem(itemId)
      return
    }

    if (newQty > targetItem.variant.stock) {
      toast.error(`Only ${targetItem.variant.stock} item(s) available in stock.`, {
        id: `stock-${itemId}`,
        style: { background: '#000', color: '#fff', fontSize: '12px', fontFamily: 'monospace' },
      })
      return
    }

    // Save snapshot for rollback
    const prevItems = [...items]
    const prevSummary = { ...summary }

    // Instant optimistic update
    const nextItems = items.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
    setItems(nextItems)
    const nextSummary = computeOptimisticSummary(
      nextItems,
      summary.free_shipping_threshold_paise,
      summary.shipping_paise || 9900,
      couponCode
    )
    setSummary(nextSummary)

    // Debounce network dispatch to prevent rapid-click race conditions
    if (debounceTimersRef.current[itemId]) {
      clearTimeout(debounceTimersRef.current[itemId])
    }

    debounceTimersRef.current[itemId] = setTimeout(async () => {
      setPendingItemIds((prev) => new Set(prev).add(itemId))
      try {
        const res = await fetch('/api/cart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: itemId, quantity: newQty }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setItems(prevItems)
          setSummary(prevSummary)
          toast.error(data.error || 'Failed to update quantity')
        }
      } catch {
        setItems(prevItems)
        setSummary(prevSummary)
        toast.error('Network error updating cart')
      } finally {
        setPendingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        delete debounceTimersRef.current[itemId]
      }
    }, 200)
  }

  const handleRemoveItem = async (itemId: string) => {
    if (removingItemIds.has(itemId)) return

    const targetItem = items.find((i) => i.id === itemId)
    if (!targetItem) return

    // Clear any pending debounce timer for this item
    if (debounceTimersRef.current[itemId]) {
      clearTimeout(debounceTimersRef.current[itemId])
      delete debounceTimersRef.current[itemId]
    }

    const prevItems = [...items]
    const prevSummary = { ...summary }

    // 1. Mark as removing (initiates CSS slide & height collapse animation)
    setRemovingItemIds((prev) => new Set(prev).add(itemId))

    // 2. Immediately calculate optimistic totals without this item
    const remainingItems = items.filter((i) => i.id !== itemId)
    const nextSummary = computeOptimisticSummary(
      remainingItems,
      summary.free_shipping_threshold_paise,
      summary.shipping_paise || 9900,
      couponCode
    )
    setSummary(nextSummary)
    setStoreCount(remainingItems.reduce((sum, it) => sum + it.quantity, 0))

    // 3. Show lightweight "Item removed — Undo" toast
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
              Removed <strong className="font-bold text-white">{targetItem.variant?.product?.name}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id)
              await handleUndoRemoval(targetItem)
            }}
            className="shrink-0 bg-white text-black hover:bg-neutral-200 active:scale-95 px-3 py-1 font-mono uppercase text-[10px] font-black tracking-wider transition-all"
          >
            Undo
          </button>
        </div>
      ),
      { id: `undo-${itemId}`, duration: 5000 }
    )

    // 4. After 280ms animation duration, remove item from state array
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      setRemovingItemIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }, 280)

    // 5. Asynchronous backend persistence
    try {
      const res = await fetch(`/api/cart?item_id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        // Rollback on failure
        setItems(prevItems)
        setSummary(prevSummary)
        toast.dismiss(`undo-${itemId}`)
        toast.error(data.error || 'Failed to remove item. Restored to bag.')
      }
    } catch {
      setItems(prevItems)
      setSummary(prevSummary)
      toast.dismiss(`undo-${itemId}`)
      toast.error('Network error. Restored item to bag.')
    }
  }

  const handleUndoRemoval = async (itemToRestore: CartItemData) => {
    // Validate stock
    if (itemToRestore.quantity > itemToRestore.variant.stock) {
      toast.error('Sorry, product is no longer available in the requested quantity.', {
        style: { background: '#000', color: '#fff', fontSize: '12px' },
      })
      return
    }

    const prevItems = [...items]
    const prevSummary = { ...summary }

    // Optimistically restore
    const restoredItems = [itemToRestore, ...items]
    setItems(restoredItems)
    const nextSummary = computeOptimisticSummary(
      restoredItems,
      summary.free_shipping_threshold_paise,
      summary.shipping_paise || 9900,
      couponCode
    )
    setSummary(nextSummary)

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: itemToRestore.variant_id,
          quantity: itemToRestore.quantity,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setItems(prevItems)
        setSummary(prevSummary)
        toast.error(data.error || 'Failed to restore item')
        return
      }

      toast.success(`Restored ${itemToRestore.variant?.product?.name} to bag`, {
        style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px', fontSize: '12px' },
      })
    } catch {
      setItems(prevItems)
      setSummary(prevSummary)
      toast.error('Network error restoring item')
    }
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setCouponError('')
    setCouponSuccess('')

    if (!couponCode.trim()) return

    const trimmed = couponCode.trim().toUpperCase()
    if (trimmed === 'BOOM10') {
      const disc = Math.round(summary.subtotal_paise * 0.1)
      setSummary((s) => ({
        ...s,
        coupon_code: 'BOOM10',
        coupon_discount_paise: disc,
        discount_paise: disc,
        total_paise: Math.max(0, s.subtotal_paise - disc + s.shipping_paise),
      }))
      setCouponSuccess('Coupon BOOM10 applied (10% OFF)!')
    } else if (trimmed === 'FIRSTBOOM') {
      if (summary.subtotal_paise < 149900) {
        setCouponError('FIRSTBOOM requires a minimum spend of ₹1,499')
        return
      }
      const disc = 20000 // ₹200
      setSummary((s) => ({
        ...s,
        coupon_code: 'FIRSTBOOM',
        coupon_discount_paise: disc,
        discount_paise: disc,
        total_paise: Math.max(0, s.subtotal_paise - disc + s.shipping_paise),
      }))
      setCouponSuccess('Coupon FIRSTBOOM applied (₹200 OFF)!')
    } else {
      setCouponError('Invalid or expired coupon code')
    }
  }

  const freeShippingProgress = Math.min(
    100,
    Math.round((summary.subtotal_paise / summary.free_shipping_threshold_paise) * 100)
  )

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-[#F8F8F6] border border-neutral-300 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={28} className="text-black" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight mb-3">
          Your Shopping Bag is Empty
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto mb-8 leading-relaxed">
          Looks like you haven&apos;t added any Bubble Boom heat to your cart yet. Explore our latest drop now.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center bg-black text-white hover:bg-neutral-800 px-8 py-4 text-xs uppercase tracking-widest font-extrabold transition-all"
        >
          Explore Collection <ArrowRight size={14} className="ml-2" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-8">
        Shopping Bag ({items.length})
      </h1>

      {/* Free Shipping Progress Bar */}
      <div className="bg-[#F8F8F6] border border-neutral-200 p-4 mb-8">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider font-bold mb-2">
          <span className="flex items-center">
            <Truck size={14} className="mr-2" />
            {summary.free_shipping_remaining_paise === 0
              ? 'You unlocked FREE standard shipping!'
              : `Add ₹${Math.round(
                  summary.free_shipping_remaining_paise / 100
                )} more to unlock FREE shipping`}
          </span>
          <span>{freeShippingProgress}%</span>
        </div>
        <div className="w-full bg-neutral-200 h-1.5 overflow-hidden">
          <div
            className="bg-black h-full transition-all duration-500 ease-out"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cart Line Items */}
        <div className="lg:col-span-8 border-t border-neutral-200">
          {items.map((item) => {
            const prod = item.variant?.product
            if (!prod) return null
            const img = findImageForVariantColor(prod.images, item.variant?.color)
            const lineSubtotal = Math.round(prod.selling_price * item.quantity)
            const isRemoving = removingItemIds.has(item.id)
            const isPending = pendingItemIds.has(item.id)

            return (
              <div
                key={item.id}
                className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                  isRemoving
                    ? 'grid-rows-[0fr] opacity-0 -translate-x-6 pointer-events-none'
                    : 'grid-rows-[1fr] opacity-100 translate-x-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="py-6 flex gap-4 sm:gap-6 border-b border-neutral-200">
                    {/* Thumbnail */}
                    <div className="relative w-24 sm:w-28 aspect-[3/4] bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden">
                      {img ? (
                        <Image
                          src={getSafeImageUrl(img.image_url)}
                          alt={img.alt_text || prod.name}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] uppercase font-bold text-neutral-400">
                          BB
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col justify-between flex-grow min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <Link
                            href={`/products/${prod.slug}`}
                            className="text-xs sm:text-sm font-bold uppercase tracking-tight text-black hover:underline truncate"
                          >
                            {prod.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isPending || isRemoving}
                            className="group/del p-2 text-neutral-400 hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90 transition-all rounded-xs flex items-center justify-center min-w-[36px] min-h-[36px] touch-manipulation disabled:opacity-30"
                            aria-label={`Remove ${prod.name} (${item.variant.color}, Size ${item.variant.size}) from bag`}
                            title="Remove item"
                          >
                            <Trash2 size={16} className="transition-transform group-hover/del:scale-110" />
                          </button>
                        </div>

                        <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
                          Color: {item.variant.color} | Size: {item.variant.size}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                          SKU: {item.variant.sku}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-1">
                        {/* Redesigned Animated Quantity Selector */}
                        <CartQuantityControl
                          quantity={item.quantity}
                          maxStock={item.variant.stock}
                          size="md"
                          itemTitle={prod.name}
                          disabled={isPending || isRemoving}
                          onIncrease={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          onDecrease={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        />

                        {/* Line Total */}
                        <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-black">
                          {formatPrice(lineSubtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#F8F8F6] border border-neutral-200 p-6 space-y-5">
            <h3 className="text-xs uppercase tracking-widest font-extrabold pb-3 border-b border-neutral-200">
              Order Summary
            </h3>

            {/* Coupon Code Input */}
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="bg-white border border-neutral-300 px-3 py-2 text-xs flex-grow font-semibold focus:outline-none focus:border-black uppercase"
                />
                <button
                  type="submit"
                  className="bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="text-[11px] text-[#DC2626] font-bold flex items-center gap-1.5 pt-0.5">
                  <span className="inline-block w-3.5 h-3.5 rounded-full bg-red-100 text-[#DC2626] text-[10px] text-center leading-3.5 font-black">✕</span>
                  <span>{couponError}</span>
                </p>
              )}
              {couponSuccess && (
                <p className="text-[11px] text-black font-bold flex items-center gap-1.5 pt-0.5">
                  <span className="inline-block w-3.5 h-3.5 rounded-full bg-black text-white text-[10px] text-center leading-3.5 font-black">✓</span>
                  <span>{couponSuccess}</span>
                </p>
              )}
            </form>

            {/* Price Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Bag Subtotal</span>
                <span>{formatPrice(Math.round(summary.subtotal_paise / 100))}</span>
              </div>

              {summary.discount_paise > 0 && (
                <div className="flex justify-between text-black font-bold">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(Math.round(summary.discount_paise / 100))}</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-600">
                <span>Standard Delivery</span>
                <span>
                  {summary.shipping_paise === 0 ? (
                    <span className="font-bold text-black uppercase">FREE</span>
                  ) : (
                    formatPrice(Math.round(summary.shipping_paise / 100))
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-between text-sm sm:text-base font-extrabold text-black">
                <span>Total Amount</span>
                <span>{formatPrice(Math.round(summary.total_paise / 100))}</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Taxes calculated at source. COD options available at checkout.
              </p>
            </div>

            {/* Checkout CTA */}
            <button
              type="button"
              onClick={() => router.push('/checkout')}
              className="w-full bg-black text-white hover:bg-neutral-800 h-13 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all hover:scale-[1.01]"
            >
              Proceed to Checkout
              <ArrowRight size={16} className="ml-2" />
            </button>

            <Link
              href="/shop"
              className="block text-center text-xs uppercase tracking-wider font-semibold text-neutral-600 hover:text-black hover:underline pt-2"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
