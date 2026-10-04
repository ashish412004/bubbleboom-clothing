'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ShoppingBag, ArrowRight, Tag, Truck } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
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
  const [loading, setLoading] = useState(false)
  const setStoreCount = useCartStore((state) => state.setItemCount)

  useEffect(() => {
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
    setStoreCount(totalCount)
  }, [items, setStoreCount])

  const refreshCart = async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setSummary(data.summary || initialSummary)
      }
    } catch {
      // silently fallback
    }
  }

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, quantity: newQty }),
      })
      const data = await res.json()
      if (res.ok) {
        await refreshCart()
      } else {
        toast.error(data.error || 'Failed to update quantity')
      }
    } catch {
      toast.error('Network error updating cart')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cart?item_id=${itemId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await refreshCart()
        toast('Item removed', {
          style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
        })
      }
    } catch {
      toast.error('Failed to remove item')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setCouponError('')
    setCouponSuccess('')

    if (!couponCode.trim()) return

    const trimmed = couponCode.trim().toUpperCase()
    // Test coupon code validity against standard promotional codes
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
        <div className="lg:col-span-8 divide-y divide-neutral-200 border-t border-b border-neutral-200">
          {items.map((item) => {
            const prod = item.variant.product
            const img = prod.images?.[0]
            const lineSubtotal = Math.round(prod.selling_price * item.quantity)

            return (
              <div key={item.id} className="py-6 flex gap-4 sm:gap-6">
                {/* Thumbnail */}
                <div className="relative w-24 sm:w-28 aspect-[3/4] bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden">
                  {img ? (
                    <Image
                      src={img.image_url}
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
                <div className="flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <Link
                        href={`/products/${prod.slug}`}
                        className="text-xs sm:text-sm font-bold uppercase tracking-tight text-black hover:underline"
                      >
                        {prod.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={loading}
                        className="text-neutral-400 hover:text-black p-1 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
                      Color: {item.variant.color} | Size: {item.variant.size}
                    </p>
                    <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                      SKU: {item.variant.sku}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    {/* Quantity Selector */}
                    <div className="inline-flex items-center border border-neutral-300">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={loading || item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 text-sm font-bold disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={loading || item.quantity >= item.variant.stock}
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 text-sm font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>

                    {/* Line Total */}
                    <span className="text-sm font-bold tracking-tight text-black">
                      {formatPrice(lineSubtotal)}
                    </span>
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
                  placeholder="Coupon Code (e.g. BOOM10)"
                  className="bg-white border border-neutral-300 px-3 py-2 text-xs flex-grow font-semibold focus:outline-none focus:border-black uppercase"
                />
                <button
                  type="submit"
                  className="bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="text-[11px] text-neutral-500 font-semibold">{couponError}</p>}
              {couponSuccess && (
                <p className="text-[11px] text-black font-semibold flex items-center">
                  <Tag size={12} className="mr-1" /> {couponSuccess}
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
