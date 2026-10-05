'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, ShoppingBag, Truck, Ruler, Check, X, Shield, RefreshCw } from 'lucide-react'
import { formatPrice, formatDiscount, getSafeImageUrl } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { DeliveryExchangeCard } from '@/components/product/delivery-exchange-card'
import type { StoreShippingSettings, StoreExchangeSettings } from '@/types/settings'

interface ProductVariant {
  id: string
  sku: string
  color: string
  size: string
  stock: number
  is_active: boolean
}

interface ProductImage {
  id: string
  image_url: string
  alt_text: string | null
  sort_order: number
}

interface ProductDetails {
  id: string
  name: string
  slug: string
  description: string
  mrp: number
  selling_price: number
  material: string | null
  fit: string | null
  wash_care: string | null
  images: ProductImage[]
  variants: ProductVariant[]
  tags?: string[] | null
  category_id?: string | null
}

export function ProductInteractive({
  product,
  shippingSettings,
  exchangeSettings,
}: {
  product: ProductDetails
  shippingSettings?: StoreShippingSettings
  exchangeSettings?: StoreExchangeSettings
}) {
  const router = useRouter()
  const incrementCart = useCartStore((state) => state.incrementCount)
  const setWishlist = useCartStore((state) => state.setWishlistCount)
  const wishlistCount = useCartStore((state) => state.wishlistCount)

  // Images
  const images = (product.images?.length > 0 ? product.images : []).map((img) => ({
    ...img,
    image_url: getSafeImageUrl(img.image_url),
  }))
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Extract distinct colors and sizes
  const colors = Array.from(new Set(product.variants.map((v) => v.color)))
  const [selectedColor, setSelectedColor] = useState(colors[0] || '')

  // Available sizes for the chosen color
  const sizesForColor = product.variants
    .filter((v) => v.color === selectedColor && v.is_active)
    .map((v) => v.size)

  const inStockSizesForColor = product.variants
    .filter((v) => v.color === (colors[0] || '') && v.is_active && v.stock > 0)
    .map((v) => v.size)

  const [selectedSize, setSelectedSize] = useState(inStockSizesForColor[0] || sizesForColor[0] || '')
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)

  // Active accordion tabs
  const [openAccordion, setOpenAccordion] = useState<string | null>('description')

  // Find currently active variant based on color and size
  const activeVariant = product.variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize && v.is_active
  )

  const isOutOfStock = !activeVariant || activeVariant.stock <= 0
  const maxStock = activeVariant?.stock || 0

  const discount = formatDiscount(product.mrp, product.selling_price)
  const hasDiscount = discount > 0

  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    const newSizes = product.variants
      .filter((v) => v.color === color && v.is_active)
      .map((v) => v.size)
    const inStockNewSizes = product.variants
      .filter((v) => v.color === color && v.is_active && v.stock > 0)
      .map((v) => v.size)

    const currentVariant = product.variants.find(
      (v) => v.color === color && v.size === selectedSize && v.is_active && v.stock > 0
    )
    if (!currentVariant) {
      setSelectedSize(inStockNewSizes[0] || newSizes[0] || '')
    }
    setQuantity(1)
  }

  const handleAddToCart = async (redirectToCheckout = false) => {
    if (!activeVariant) {
      toast.error('Please select an available size and color.')
      return
    }

    if (isOutOfStock) {
      toast.error('Selected variant is out of stock.')
      return
    }

    setIsAdding(true)
    try {
      // In guest or customer mode, persist to cart API
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: activeVariant.id,
          quantity,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        incrementCart(quantity)
        toast.success(`Added ${product.name} (${selectedSize}) to bag!`, {
          style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
        })
        if (redirectToCheckout) {
          router.push('/checkout')
        }
      } else {
        toast.error(data.error || 'Failed to add to bag')
      }
    } catch {
      toast.error('Could not connect to cart service.')
    } finally {
      setIsAdding(false)
    }
  }

  const toggleWishlist = () => {
    const nextState = !isWishlisted
    setIsWishlisted(nextState)
    setWishlist(nextState ? wishlistCount + 1 : Math.max(0, wishlistCount - 1))
    toast(nextState ? 'Saved to wishlist' : 'Removed from wishlist', {
      style: { background: '#000000', color: '#FFFFFF', borderRadius: '0px' },
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
      {/* 1. Image Gallery */}
      <div className="lg:col-span-7 space-y-4">
        {/* Main Display Image */}
        <div className="relative aspect-[3/4] bg-neutral-100 border border-neutral-200 overflow-hidden">
          {images.length > 0 ? (
            <Image
              src={images[selectedImageIndex]?.image_url || images[0].image_url}
              alt={images[selectedImageIndex]?.alt_text || product.name}
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 font-bold uppercase tracking-widest text-xs">
              BUBBLE BOOM
            </div>
          )}

          {hasDiscount && (
            <div className="absolute top-4 left-4">
              <span className="bg-black text-white text-xs uppercase tracking-widest font-extrabold px-3 py-1">
                {discount}% OFF
              </span>
            </div>
          )}
        </div>

        {/* Thumbnail Row */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative aspect-[3/4] bg-neutral-100 border overflow-hidden transition-all ${
                  selectedImageIndex === idx
                    ? 'border-black ring-1 ring-black'
                    : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={img.image_url}
                  alt={img.alt_text || `View ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="100px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Product Information & Actions */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1.5">
            BUBBLE BOOM ORIGINALS
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase leading-tight">
            {product.name}
          </h1>

          {/* Pricing */}
          <div className="flex items-baseline space-x-3 mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
              {formatPrice(product.selling_price)}
            </span>
            {hasDiscount && (
              <span className="text-base text-neutral-400 line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
              (Incl. of all taxes)
            </span>
          </div>
        </div>

        <hr className="border-neutral-200" />

        {/* Color Selector */}
        {colors.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-widest font-bold">Color</span>
              <span className="text-xs font-semibold text-neutral-600">{selectedColor}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorChange(c)}
                  className={`text-xs uppercase tracking-wider font-bold px-4 py-2 border transition-all ${
                    selectedColor === c
                      ? 'bg-black text-white border-black ring-1 ring-black'
                      : 'bg-white text-black border-neutral-300 hover:border-black'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Size Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest font-bold">Select Size</span>
            <button
              type="button"
              onClick={() => setShowSizeGuide(true)}
              className="text-xs font-semibold underline text-neutral-600 hover:text-black flex items-center"
            >
              <Ruler size={13} className="mr-1" />
              Size Guide
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {['S', 'M', 'L', 'XL', 'XXL', '30', '32', '34'].map((sizeOption) => {
              const variantOption = product.variants.find(
                (v) => v.color === selectedColor && v.size === sizeOption && v.is_active
              )
              const exists = Boolean(variantOption)
              const hasStock = exists && (variantOption?.stock || 0) > 0
              const isSelected = selectedSize === sizeOption

              if (!exists) return null

              return (
                <button
                  key={sizeOption}
                  type="button"
                  disabled={!hasStock}
                  onClick={() => {
                    if (!hasStock) {
                      toast.error(`Size ${sizeOption} is out of stock.`)
                      return
                    }
                    setSelectedSize(sizeOption)
                    setQuantity(1)
                  }}
                  className={`h-11 border text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                    !hasStock
                      ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-40 select-none'
                      : isSelected
                      ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-black border-neutral-300 hover:border-black'
                  }`}
                  title={!hasStock ? `Size ${sizeOption} is out of stock` : `Select Size ${sizeOption}`}
                >
                  <span className={!hasStock ? 'line-through' : ''}>{sizeOption}</span>
                  {!hasStock && (
                    <span className="text-[8px] uppercase tracking-tighter text-red-600 font-extrabold leading-none mt-0.5">
                      Sold Out
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Stock Notice */}
          <div className="mt-2 text-xs font-medium">
            {isOutOfStock ? (
              <span className="text-neutral-500 font-bold uppercase tracking-wider flex items-center">
                <X size={14} className="mr-1" /> Sold Out in {selectedSize}
              </span>
            ) : maxStock <= 5 ? (
              <span className="text-neutral-700 font-semibold">
                Low Stock ({maxStock} remaining)
              </span>
            ) : (
              <span className="text-black font-semibold flex items-center">
                <Check size={14} className="mr-1" /> In Stock &amp; Ready to Ship
              </span>
            )}
          </div>
        </div>

        {/* Quantity Selector */}
        {!isOutOfStock && (
          <div>
            <span className="block text-xs uppercase tracking-widest font-bold mb-2">Quantity</span>
            <div className="inline-flex items-center border border-neutral-300">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 text-base font-bold disabled:opacity-30"
              >
                -
              </button>
              <span className="w-12 text-center text-xs font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                disabled={quantity >= maxStock}
                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 text-base font-bold disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="space-y-3 pt-2">
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isOutOfStock || isAdding}
              onClick={() => handleAddToCart(false)}
              className="flex-1 bg-black text-white hover:bg-neutral-800 h-13 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={16} className="mr-2" />
              {isAdding ? 'Adding...' : isOutOfStock ? 'Sold Out' : 'Add to Cart'}
            </button>

            <button
              type="button"
              onClick={toggleWishlist}
              className={`w-13 h-13 border border-neutral-300 flex items-center justify-center hover:border-black transition-colors ${
                isWishlisted ? 'bg-neutral-100' : 'bg-white'
              }`}
              aria-label="Wishlist"
            >
              <Heart size={18} className={isWishlisted ? 'fill-black text-black' : 'text-black'} />
            </button>
          </div>

          {!isOutOfStock && (
            <button
              type="button"
              disabled={isAdding}
              onClick={() => handleAddToCart(true)}
              className="w-full bg-[#F8F8F6] border border-black text-black hover:bg-black hover:text-white h-13 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all"
            >
              Buy It Now
            </button>
          )}
        </div>

        {/* Delivery & Exchange Section */}
        <DeliveryExchangeCard
          product={product}
          initialShipping={shippingSettings}
          initialExchange={exchangeSettings}
        />

        {/* Product Details Accordions */}
        <div className="border-t border-neutral-200 divide-y divide-neutral-200 pt-2">
          {/* Description */}
          <div>
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === 'description' ? null : 'description')}
              className="w-full py-3.5 flex items-center justify-between text-left text-xs uppercase tracking-widest font-bold hover:text-neutral-600"
            >
              <span>Product Description</span>
              <span>{openAccordion === 'description' ? '—' : '+'}</span>
            </button>
            {openAccordion === 'description' && (
              <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-2">
                <p>{product.description}</p>
                {activeVariant && (
                  <p className="text-[11px] font-mono text-neutral-500">
                    SKU: {activeVariant.sku}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Material & Fit */}
          <div>
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === 'material' ? null : 'material')}
              className="w-full py-3.5 flex items-center justify-between text-left text-xs uppercase tracking-widest font-bold hover:text-neutral-600"
            >
              <span>Material &amp; Fit</span>
              <span>{openAccordion === 'material' ? '—' : '+'}</span>
            </button>
            {openAccordion === 'material' && (
              <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-1.5">
                <p><strong>Fabric:</strong> {product.material || '100% Combed Cotton (240 GSM)'}</p>
                <p><strong>Fit:</strong> {product.fit || 'Relaxed Boxy Drop-Shoulder'}</p>
                <p><strong>Origin:</strong> Designed &amp; Crafted in India</p>
              </div>
            )}
          </div>

          {/* Wash Care */}
          <div>
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === 'wash_care' ? null : 'wash_care')}
              className="w-full py-3.5 flex items-center justify-between text-left text-xs uppercase tracking-widest font-bold hover:text-neutral-600"
            >
              <span>Wash &amp; Care</span>
              <span>{openAccordion === 'wash_care' ? '—' : '+'}</span>
            </button>
            {openAccordion === 'wash_care' && (
              <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-1">
                <p>{product.wash_care || 'Machine wash cold inside out with like darks. Do not iron directly on graphics. Tumble dry low or line dry in shade.'}</p>
              </div>
            )}
          </div>

          {/* Shipping & Exchange Policy */}
          <div>
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === 'shipping' ? null : 'shipping')}
              className="w-full py-3.5 flex items-center justify-between text-left text-xs uppercase tracking-widest font-bold hover:text-neutral-600"
            >
              <span>Shipping &amp; Exchange Policy</span>
              <span>{openAccordion === 'shipping' ? '—' : '+'}</span>
            </button>
            {openAccordion === 'shipping' && (
              <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-1.5">
                <p>• Free shipping on orders above ₹{Math.round((shippingSettings?.free_shipping_threshold_paise || 149900) / 100).toLocaleString('en-IN')}.</p>
                <p>• Fast and secure dispatch across serviceable Indian PIN codes.</p>
                <p>• Size exchange and reverse pickup as per our configured store policy.</p>
                <div className="pt-1.5 flex gap-3 text-[11px] font-mono font-bold">
                  <a href="/shipping-policy" className="underline hover:text-black">Shipping Policy</a>
                  <span>•</span>
                  <a href="/returns-refunds" className="underline hover:text-black">Returns &amp; Exchange Policy</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm uppercase tracking-widest font-extrabold">Bubble Boom Size Guide</h3>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="p-1 hover:bg-neutral-100"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Our streetwear silhouettes are intentionally crafted with drop shoulders and relaxed body measurements. All dimensions are in inches.
            </p>
            <div className="border border-neutral-200 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8F8F6] border-b border-neutral-200">
                  <tr>
                    <th className="p-2 font-bold uppercase">Size</th>
                    <th className="p-2 font-bold uppercase">Chest</th>
                    <th className="p-2 font-bold uppercase">Length</th>
                    <th className="p-2 font-bold uppercase">Shoulder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr><td className="p-2 font-bold">S</td><td className="p-2">42&quot;</td><td className="p-2">28&quot;</td><td className="p-2">21&quot;</td></tr>
                  <tr><td className="p-2 font-bold">M</td><td className="p-2">44&quot;</td><td className="p-2">29&quot;</td><td className="p-2">22&quot;</td></tr>
                  <tr><td className="p-2 font-bold">L</td><td className="p-2">46&quot;</td><td className="p-2">30&quot;</td><td className="p-2">23&quot;</td></tr>
                  <tr><td className="p-2 font-bold">XL</td><td className="p-2">48&quot;</td><td className="p-2">31&quot;</td><td className="p-2">24&quot;</td></tr>
                  <tr><td className="p-2 font-bold">XXL</td><td className="p-2">50&quot;</td><td className="p-2">32&quot;</td><td className="p-2">25&quot;</td></tr>
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setShowSizeGuide(false)}
              className="w-full bg-black text-white py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
            >
              Close Size Guide
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
