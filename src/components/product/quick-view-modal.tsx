'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, Heart, ShoppingBag, Check, ArrowRight } from 'lucide-react'
import { formatPrice, formatDiscount, getSafeImageUrl, normalizeColor, parseProductImage } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'

export interface QuickViewProduct {
  id: string
  name: string
  slug: string
  mrp: number
  selling_price: number
  description?: string
  images?: Array<{
    image_url: string
    alt_text: string | null
    sort_order?: number
    color?: string | null
  }>
  variants?: Array<{
    id: string
    sku?: string
    color: string
    size: string
    stock: number
    is_active?: boolean
  }>
}

interface QuickViewModalProps {
  product: QuickViewProduct | null
  isOpen: boolean
  onClose: () => void
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const router = useRouter()
  const authUser = useAuthStore((state) => state.user)
  const isWishlisted = useCartStore((state) => (product ? state.isItemWishlisted(product.id) : false))
  const toggleWishlistStore = useCartStore((state) => state.toggleWishlistStore)
  const isVariantInCart = useCartStore((state) => state.isVariantInCart)
  const addToCartWithDrawer = useCartStore((state) => state.addToCartWithDrawer)
  const openCartDrawer = useCartStore((state) => state.openCartDrawer)

  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isAdding, setIsAdding] = useState(false)

  // Initialize selected color and size whenever product changes
  useEffect(() => {
    if (product) {
      const colors = Array.from(
        new Set((product.variants || []).map((v) => v.color?.trim()).filter(Boolean))
      )
      const firstColor = colors[0] || ''
      setSelectedColor(firstColor)

      const variantsForColor = (product.variants || []).filter(
        (v) => normalizeColor(v.color) === normalizeColor(firstColor) && (v.is_active ?? true) && v.stock > 0
      )
      setSelectedSize(variantsForColor[0]?.size || '')
      setSelectedImageIndex(0)
    }
  }, [product])

  // Close on ESC and lock background scroll
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  const allImages = (product.images || [])
    .map(parseProductImage)
    .filter(Boolean)

  const activeColorLower = normalizeColor(selectedColor)
  const hasColorImages = allImages.some((img: any) => Boolean(img.color))
  const colorImages = hasColorImages
    ? allImages.filter((img: any) => img.color && normalizeColor(img.color) === activeColorLower)
    : allImages

  const displayImages = colorImages.length > 0 ? colorImages : allImages
  const currentImage = displayImages[selectedImageIndex] || displayImages[0]

  const colors = Array.from(
    new Set((product.variants || []).map((v) => v.color?.trim()).filter(Boolean))
  )

  const variantsForColor = (product.variants || []).filter(
    (v) => normalizeColor(v.color) === activeColorLower && (v.is_active ?? true)
  )

  const standardSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12']
  const sizesForColor = Array.from(new Set(variantsForColor.map((v) => v.size))).sort((a, b) => {
    const idxA = standardSizeOrder.indexOf(a.toUpperCase())
    const idxB = standardSizeOrder.indexOf(b.toUpperCase())
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  const activeVariant = variantsForColor.find((v) => v.size === selectedSize)
  const isOutOfStock = !activeVariant || activeVariant.stock <= 0
  const isVariantAdded = Boolean(activeVariant && isVariantInCart(activeVariant.id))
  const discount = formatDiscount(product.mrp, product.selling_price)

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor)
    setSelectedImageIndex(0)
    const newNorm = normalizeColor(newColor)
    const newVariants = (product.variants || []).filter(
      (v) => normalizeColor(v.color) === newNorm && (v.is_active ?? true)
    )
    const matching = newVariants.find((v) => v.size === selectedSize && v.stock > 0)
    if (!matching) {
      const firstInStock = newVariants.find((v) => v.stock > 0)
      setSelectedSize(firstInStock?.size || '')
    }
  }

  const handleAddToCart = async () => {
    if (!activeVariant) {
      toast.error('Please select a size first.')
      return
    }
    if (isOutOfStock) {
      toast.error('This size is currently out of stock.')
      return
    }

    setIsAdding(true)
    const res = await addToCartWithDrawer(activeVariant.id, 1, {
      product,
      variant: activeVariant,
    })
    setIsAdding(false)

    if (res.success) {
      onClose()
    } else {
      toast.error(res.error || 'Failed to add to bag')
    }
  }

  const handleWishlistToggle = async () => {
    if (!product) return

    if (!authUser) {
      onClose()
      const returnUrl = `/products/${product.slug}?action=wishlist${activeVariant?.id ? `&variantId=${encodeURIComponent(activeVariant.id)}` : ''}`
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`)
      return
    }

    try {
      const res = await toggleWishlistStore(product.id, activeVariant?.id)
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
      toast.error('Failed to update wishlist')
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick View: ${product.name}`}
        className="relative bg-white text-black w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl z-10 border border-neutral-300 rounded-[20px] transition-all duration-200 animate-in fade-in zoom-in-95"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3.5 right-3.5 z-20 p-2 bg-white/90 hover:bg-black hover:text-white rounded-full text-black transition-colors shadow-sm focus:outline-none"
        >
          <X size={18} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Left: Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[3/4] bg-neutral-100 border border-neutral-200 overflow-hidden rounded-[20px]">
              {currentImage?.image_url ? (
                <Image
                  src={getSafeImageUrl(currentImage.image_url)}
                  alt={currentImage.alt_text || product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-mono text-neutral-400">
                  NO IMAGE
                </div>
              )}

              {discount > 0 && (
                <div className="absolute top-3 left-3 bg-black text-white text-[10px] font-mono font-extrabold px-2 py-1 uppercase tracking-wider">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {displayImages.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-14 h-18 bg-neutral-100 border shrink-0 transition-all ${
                      selectedImageIndex === idx ? 'border-black ring-1 ring-black' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <Image
                      src={getSafeImageUrl(img.image_url)}
                      alt="Thumbnail"
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info & Selectors */}
          <div className="flex flex-col justify-between space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono text-neutral-500 font-bold mb-1">
                Quick View
              </p>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
                {product.name}
              </h2>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl font-black tracking-tight text-black">
                  {formatPrice(product.selling_price)}
                </span>
                {discount > 0 && (
                  <span className="text-xs text-neutral-400 line-through">
                    {formatPrice(product.mrp)}
                  </span>
                )}
              </div>
            </div>

            {/* Colours */}
            {colors.length > 0 && (
              <div>
                <span className="text-xs uppercase font-mono tracking-widest font-bold block mb-2">
                  Colour: <strong className="text-black font-extrabold">{selectedColor}</strong>
                </span>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const isSelected = activeColorLower === normalizeColor(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleColorChange(c)}
                        className={`text-xs uppercase tracking-wider font-bold px-3 py-1.5 border transition-all duration-150 select-none active:scale-95 ${
                          isSelected
                            ? 'bg-black text-white border-black ring-2 ring-[#DC2626] ring-offset-2'
                            : 'bg-white text-black border-neutral-300 hover:border-black'
                        }`}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div>
              <span className="text-xs uppercase font-mono tracking-widest font-bold block mb-2">
                Select Size
              </span>
              <div className="grid grid-cols-4 gap-2">
                {sizesForColor.map((s) => {
                  const variantOpt = variantsForColor.find((v) => v.size === s)
                  const hasStock = Boolean(variantOpt && variantOpt.stock > 0)
                  const isSelected = selectedSize === s

                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!hasStock}
                      onClick={() => setSelectedSize(s)}
                      className={`h-10 text-xs font-bold border transition-all duration-150 relative flex flex-col items-center justify-center select-none active:scale-95 ${
                        !hasStock
                          ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-40 select-none line-through'
                          : isSelected
                          ? 'border-2 border-[#DC2626] bg-red-50/70 text-black font-black shadow-xs'
                          : 'bg-white text-black border-neutral-300 hover:border-black'
                      }`}
                    >
                      <span>{s}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                {isVariantAdded ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      openCartDrawer()
                    }}
                    className="flex-1 h-12 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all duration-200 bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm cursor-pointer active:scale-98"
                  >
                    <Check size={16} className="mr-1.5 stroke-[3]" />
                    ✓ ADDED TO CART
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!selectedSize || isOutOfStock || isAdding}
                    onClick={handleAddToCart}
                    className="flex-1 h-12 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all duration-200 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed cursor-pointer active:scale-98"
                  >
                    <ShoppingBag size={15} className="mr-2" />
                    {!selectedSize ? 'Select Size' : isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleWishlistToggle}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`w-12 h-12 border flex items-center justify-center transition-all duration-150 active:scale-90 ${
                    isWishlisted ? 'bg-red-50/60 border-[#DC2626] text-[#DC2626]' : 'border-neutral-300 text-black hover:border-black'
                  }`}
                >
                  <Heart
                    size={18}
                    className={`transition-all duration-150 ${
                      isWishlisted ? 'fill-[#DC2626] text-[#DC2626] scale-110' : 'text-black'
                    }`}
                  />
                </button>
              </div>

              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="w-full py-2.5 text-center text-xs uppercase tracking-widest font-mono font-bold text-neutral-600 hover:text-black flex items-center justify-center gap-1 group"
              >
                <span>View Full Details</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
