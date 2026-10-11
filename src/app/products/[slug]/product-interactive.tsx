'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart,
  ShoppingBag,
  Truck,
  Ruler,
  Check,
  X,
  Shield,
  RefreshCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react'
import { formatPrice, formatDiscount, getSafeImageUrl, normalizeColor, parseProductImage, type ParsedProductImage } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { DeliveryExchangeCard } from '@/components/product/delivery-exchange-card'
import type { StoreShippingSettings, StoreExchangeSettings } from '@/types/settings'
import { CategorySizeGuideModal, getProductCategoryType } from '@/components/product/category-size-guide-modal'

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
  color?: string | null
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
  const isWishlistedInStore = useCartStore((state) => state.isItemWishlisted)
  const toggleWishlistStore = useCartStore((state) => state.toggleWishlistStore)

  const categoryType = getProductCategoryType(product as any)

  // Images sorted by sort_order and parsed for color tags
  const allImages = (product.images?.length > 0 ? product.images : [])
    .map(parseProductImage)
    .filter((img): img is ParsedProductImage => Boolean(img))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  // Extract distinct colors and sizes
  const colors = Array.from(
    new Set(product.variants.map((v) => v.color?.trim()).filter(Boolean))
  ) as string[]
  const [selectedColor, setSelectedColor] = useState(colors[0] || '')

  // Images mapped specifically to selected colour
  const hasAnyColorAssigned = allImages.some((img) => Boolean(img.color))
  const activeColorLower = normalizeColor(selectedColor)
  // If product has colour-assigned images, show ONLY the images for that colour.
  // If a colour has no photos, activeColorImages will be empty and display the clear neutral fallback.
  // If a legacy product has no colours assigned on any images at all, display general gallery.
  const activeColorImages = hasAnyColorAssigned
    ? allImages.filter((img) => img.color && normalizeColor(img.color) === activeColorLower)
    : allImages

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  // Streetwear standard sizing sort order
  const standardSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '28', '30', '32', '34', '36', '38']
  const sortSizes = (arr: string[]) =>
    [...arr].sort((a, b) => {
      const idxA = standardSizeOrder.indexOf(a.toUpperCase())
      const idxB = standardSizeOrder.indexOf(b.toUpperCase())
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })

  // Available sizes for the chosen color
  const variantsForColor = product.variants.filter(
    (v) => normalizeColor(v.color) === activeColorLower && v.is_active
  )
  const sizesForColor = sortSizes(Array.from(new Set(variantsForColor.map((v) => v.size))))
  const inStockSizesForColor = variantsForColor.filter((v) => v.stock > 0).map((v) => v.size)

  const [selectedSize, setSelectedSize] = useState(
    inStockSizesForColor[0] || sizesForColor[0] || ''
  )
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)

  // Active accordion tabs
  const [openAccordion, setOpenAccordion] = useState<string | null>('description')

  // Find currently active variant based on color and size
  const activeVariant = product.variants.find(
    (v) =>
      normalizeColor(v.color) === activeColorLower &&
      v.size === selectedSize &&
      v.is_active
  )

  const isWishlisted = isWishlistedInStore(product.id, activeVariant?.id)

  const isOutOfStock = Boolean(selectedSize) && (!activeVariant || activeVariant.stock <= 0)
  const maxStock = activeVariant?.stock || 0

  const discount = formatDiscount(product.mrp, product.selling_price)
  const hasDiscount = discount > 0

  // Zoom lightbox keyboard navigation and scroll lock
  useEffect(() => {
    if (!isZoomOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoomOpen(false)
      } else if (e.key === 'ArrowLeft' && activeColorImages.length > 1) {
        setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : activeColorImages.length - 1))
      } else if (e.key === 'ArrowRight' && activeColorImages.length > 1) {
        setSelectedImageIndex((prev) => (prev < activeColorImages.length - 1 ? prev + 1 : 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isZoomOpen, activeColorImages.length])

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor)
    // Always reset active image index to 0 when colour changes
    setSelectedImageIndex(0)

    const newColorNorm = normalizeColor(newColor)
    const newVariants = product.variants.filter(
      (v) => normalizeColor(v.color) === newColorNorm && v.is_active
    )

    // Keep the currently selected size only if available in the new colour; otherwise require selecting a size
    const matchingVariant = newVariants.find((v) => v.size === selectedSize)
    if (selectedSize && matchingVariant && matchingVariant.stock > 0) {
      // Current size exists and is in stock
    } else if (selectedSize && matchingVariant) {
      // Current size exists (will display as sold out)
    } else {
      // Size does not exist in new colour -> require selecting a size
      setSelectedSize('')
    }
    setQuantity(1)
  }

  const handleAddToCart = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (isAdding || isBuyingNow) return

    if (!selectedColor) {
      toast.error('Please select a colour first.')
      return
    }

    if (!selectedSize) {
      toast.error('Please select a size first.')
      return
    }

    if (!activeVariant) {
      toast.error('Please select an available size and colour.')
      return
    }

    if (isOutOfStock || activeVariant.stock <= 0) {
      toast.error(`Size ${selectedSize} is currently out of stock.`)
      return
    }

    if (quantity < 1 || quantity > activeVariant.stock) {
      toast.error(`Please select a valid quantity (1 to ${activeVariant.stock}).`)
      return
    }

    setIsAdding(true)
    try {
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
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 3000)

        // Show "Added to Bag" toast with "View Bag" action
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-black text-white shadow-2xl pointer-events-auto flex items-center justify-between p-4 border border-neutral-700`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                  <Check size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Added to Bag</p>
                  <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                    {product.name} ({selectedColor} / {selectedSize} &times; {quantity})
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 pl-3 border-l border-neutral-800">
                <Link
                  href="/cart"
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-white text-black hover:bg-neutral-200 text-[10px] uppercase tracking-widest font-extrabold px-3 py-2 transition-colors shrink-0"
                >
                  View Bag
                </Link>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ),
          { duration: 4500, position: 'top-right' }
        )
      } else {
        toast.error(data.error || 'Failed to add to bag')
      }
    } catch {
      toast.error('Could not connect to cart service.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleBuyNow = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (isBuyingNow || isAdding) return

    if (!selectedColor) {
      toast.error('Please select a colour first.')
      return
    }

    if (!selectedSize) {
      toast.error('Please select a size first.')
      return
    }

    if (!activeVariant) {
      toast.error('Selected variant is unavailable.')
      return
    }

    if (isOutOfStock || activeVariant.stock <= 0) {
      toast.error(`Size ${selectedSize} is currently out of stock.`)
      return
    }

    if (quantity < 1 || quantity > activeVariant.stock) {
      toast.error(`Please select a valid quantity (1 to ${activeVariant.stock}).`)
      return
    }

    setIsBuyingNow(true)

    // Directly open checkout for that selected variant and quantity without touching persistent cart
    router.push(`/checkout?variant_id=${encodeURIComponent(activeVariant.id)}&quantity=${quantity}`)
  }


  const toggleWishlist = async () => {
    try {
      const res = await toggleWishlistStore(product.id, activeVariant?.id)
      if (res.inWishlist) {
        toast.success('Saved to wishlist', {
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

  const currentDisplayImage = activeColorImages[selectedImageIndex] || activeColorImages[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
      {/* 1. Image Gallery */}
      <div className="lg:col-span-7 space-y-4">
        {/* Main Display Image */}
        <div className="relative aspect-[3/4] bg-neutral-100 border border-neutral-200 overflow-hidden">
          {activeColorImages.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="w-full h-full relative cursor-zoom-in group text-left block"
              title="Click to zoom image"
            >
              <Image
                src={currentDisplayImage?.image_url || activeColorImages[0].image_url}
                alt={currentDisplayImage?.alt_text || `${product.name} - ${selectedColor}`}
                fill
                priority
                className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute bottom-3 right-3 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={16} />
              </div>
            </button>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-neutral-100">
              <div className="w-12 h-12 rounded-full border border-neutral-300 bg-white flex items-center justify-center mb-3 shadow-sm">
                <ImageIcon className="w-6 h-6 text-neutral-400 stroke-[1.5]" />
              </div>
              <p className="text-xs uppercase font-mono font-bold tracking-widest text-neutral-800">
                Image Unavailable
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-[220px]">
                No photos uploaded yet for {selectedColor}.
              </p>
            </div>
          )}

          {hasDiscount && (
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-black text-white text-xs uppercase tracking-widest font-extrabold px-3 py-1">
                {discount}% OFF
              </span>
            </div>
          )}
        </div>

        {/* Thumbnail Row for Selected Colour */}
        {activeColorImages.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {activeColorImages.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative aspect-[3/4] bg-neutral-100 border overflow-hidden transition-all ${
                  selectedImageIndex === idx
                    ? 'border-black ring-1 ring-black'
                    : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                }`}
                title={`View photo ${idx + 1} of ${selectedColor}`}
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

        {/* Other Colours Quick Preview Thumbnails */}
        {colors.length > 1 && (
          <div className="pt-1">
            <span className="text-[10px] uppercase font-mono font-bold text-neutral-500 block mb-1.5">
              Available Colours ({colors.length}):
            </span>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => {
                const cNorm = normalizeColor(c)
                const isCurrent = cNorm === activeColorLower
                const cPrimaryImg = allImages.find(
                  (img) => img.color && normalizeColor(img.color) === cNorm
                ) || (hasAnyColorAssigned ? null : allImages[0])

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(c)}
                    className={`group flex items-center gap-2 border p-1 pr-2.5 text-xs transition-all ${
                      isCurrent
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-200 bg-white text-neutral-800 hover:border-black'
                    }`}
                    title={`Switch to ${c}`}
                  >
                    <div className="relative w-8 aspect-[3/4] bg-neutral-100 overflow-hidden shrink-0">
                      {cPrimaryImg ? (
                        <Image
                          src={cPrimaryImg.image_url}
                          alt={c}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] uppercase font-mono text-neutral-400">
                          N/A
                        </div>
                      )}
                    </div>
                    <span className="font-bold uppercase tracking-wider text-[11px]">{c}</span>
                  </button>
                )
              })}
            </div>
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
              {colors.map((c) => {
                const cNorm = normalizeColor(c)
                const isSelected = activeColorLower === cNorm
                const cPrimaryImg = allImages.find(
                  (img) => img.color && normalizeColor(img.color) === cNorm
                )
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(c)}
                    className={`text-xs uppercase tracking-wider font-bold px-3 py-2 border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-black text-white border-black ring-1 ring-black shadow-sm'
                        : 'bg-white text-black border-neutral-300 hover:border-black'
                    }`}
                  >
                    {cPrimaryImg && (
                      <div className="relative w-4 h-4 rounded-full overflow-hidden border border-neutral-300 shrink-0">
                        <Image
                          src={cPrimaryImg.image_url}
                          alt={c}
                          fill
                          className="object-cover"
                          sizes="16px"
                        />
                      </div>
                    )}
                    <span>{c}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Size Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest font-bold">Select Size</span>
            {categoryType !== 'accessories' && (
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-xs font-semibold underline text-neutral-600 hover:text-black flex items-center"
              >
                <Ruler size={13} className="mr-1" />
                Size Guide
              </button>
            )}
          </div>

          {sizesForColor.length === 0 ? (
            <p className="text-xs text-neutral-500 italic py-2">
              No sizes configured for {selectedColor}.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {sizesForColor.map((sizeOption) => {
                const variantOption = variantsForColor.find((v) => v.size === sizeOption)
                const exists = Boolean(variantOption)
                const hasStock = exists && (variantOption?.stock || 0) > 0
                const isSelected = selectedSize === sizeOption

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
          )}

          {/* Stock Notice */}
          <div className="mt-2 text-xs font-medium">
            {!selectedSize ? (
              <span className="text-neutral-500 font-medium">
                Please select a size to check stock.
              </span>
            ) : isOutOfStock ? (
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
        {selectedSize && !isOutOfStock && (
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
              disabled={!selectedSize || isOutOfStock || isAdding || isBuyingNow}
              onClick={handleAddToCart}
              className={`flex-1 h-13 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-colors ${
                isAdding
                  ? 'bg-black text-white cursor-wait'
                  : !selectedSize || isOutOfStock
                  ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-neutral-800 cursor-pointer'
              }`}
            >
              {isAdding ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin text-white" />
                  Adding to Bag...
                </>
              ) : justAdded ? (
                <>
                  <Check size={16} className="mr-2" />
                  Added to Bag ✓
                </>
              ) : !selectedSize ? (
                'Select a Size'
              ) : isOutOfStock ? (
                'Sold Out'
              ) : (
                <>
                  <ShoppingBag size={16} className="mr-2" />
                  Add to Cart
                </>
              )}
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
              disabled={!selectedSize || isBuyingNow}
              onClick={handleBuyNow}
              className={`w-full h-13 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all ${
                isBuyingNow
                  ? 'bg-black text-white border border-black cursor-wait shadow-none'
                  : isAdding
                  ? 'bg-[#F8F8F6] border border-black text-black opacity-60 pointer-events-none'
                  : !selectedSize
                  ? 'bg-neutral-200 border-neutral-300 text-neutral-400 cursor-not-allowed shadow-none'
                  : 'bg-[#F8F8F6] border border-black text-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none cursor-pointer'
              }`}
            >
              {isBuyingNow ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin text-white" />
                  Opening Checkout...
                </>
              ) : !selectedSize ? (
                'Select a Size to Buy'
              ) : (
                'Buy It Now'
              )}
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

      {/* Category-Based Size Guide Modal */}
      <CategorySizeGuideModal
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        categoryType={categoryType}
      />

      {/* Zoom / Lightbox Modal */}
      {isZoomOpen && activeColorImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 animate-in fade-in"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 z-20 p-2 text-white/80 hover:text-white bg-black/60 rounded-full hover:bg-black transition-colors"
            aria-label="Close zoom"
          >
            <X size={24} />
          </button>

          {/* Navigation Arrows */}
          {activeColorImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedImageIndex((prev) =>
                    prev > 0 ? prev - 1 : activeColorImages.length - 1
                  )
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white/80 hover:text-white bg-black/60 rounded-full hover:bg-black transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedImageIndex((prev) =>
                    prev < activeColorImages.length - 1 ? prev + 1 : 0
                  )
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white/80 hover:text-white bg-black/60 rounded-full hover:bg-black transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          {/* Image Container */}
          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[80vh]">
              <Image
                src={currentDisplayImage?.image_url || activeColorImages[0].image_url}
                alt={currentDisplayImage?.alt_text || `${product.name} - ${selectedColor}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Gallery indicators */}
            {activeColorImages.length > 1 && (
              <div className="flex items-center gap-2 mt-4">
                {activeColorImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`h-2 transition-all rounded-full ${
                      selectedImageIndex === idx
                        ? 'w-6 bg-white'
                        : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
