import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartStoreItem {
  id: string
  cart_id?: string
  variant_id: string
  quantity: number
  variant: {
    id: string
    product_id: string
    sku?: string
    color: string
    size: string
    stock: number
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
    }
  }
}

export interface CartStoreSummary {
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

interface CartStore {
  itemCount: number
  items: CartStoreItem[]
  summary: CartStoreSummary | null
  isCartDrawerOpen: boolean
  setItemCount: (count: number) => void
  incrementCount: (delta?: number) => void
  decrementCount: (delta?: number) => void
  openCartDrawer: () => void
  closeCartDrawer: () => void
  toggleCartDrawer: () => void
  isVariantInCart: (variantId?: string) => boolean
  isProductInCart: (productId?: string) => boolean
  getCartItemForVariant: (variantId?: string) => CartStoreItem | undefined
  wishlistCount: number
  wishlistProductIds: string[]
  wishlistVariantIds: string[]
  setWishlistCount: (count: number) => void
  decrementWishlist: (delta?: number) => void
  refreshCart: (force?: boolean) => Promise<void>
  refreshWishlist: (force?: boolean) => Promise<void>
  resetCartAndWishlist: () => void
  isItemWishlisted: (productId?: string, variantId?: string) => boolean
  toggleWishlistStore: (productId?: string, variantId?: string) => Promise<{ inWishlist: boolean }>
  addToCartWithDrawer: (
    variantId: string,
    quantity?: number,
    itemPreview?: { product: any; variant: any }
  ) => Promise<{ success: boolean; error?: string }>
  updateCartItemQuantityAction: (itemId: string, newQty: number) => Promise<{ success: boolean; error?: string }>
  removeCartItemAction: (itemId: string) => Promise<{ success: boolean; error?: string }>
}

let lastCartRefreshTime = 0
let lastWishlistRefreshTime = 0
const REFRESH_THROTTLE_MS = 15000 // 15s throttle for routine background checks

function computeSummaryFromItems(items: CartStoreItem[], prevSummary?: CartStoreSummary | null): CartStoreSummary {
  const thresholdPaise = prevSummary?.free_shipping_threshold_paise ?? 149900
  const shippingRatePaise = prevSummary?.shipping_paise ?? 9900

  const subtotal_paise = items.reduce((sum, item) => {
    const price = item.variant?.product?.selling_price || 0
    return sum + Math.round(price * 100) * (item.quantity || 1)
  }, 0)

  const shipping_paise =
    subtotal_paise >= thresholdPaise || items.length === 0 ? 0 : shippingRatePaise

  let coupon_discount_paise = prevSummary?.coupon_discount_paise ?? 0
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
    coupon_code: prevSummary?.coupon_code ?? null,
    coupon_discount_paise,
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      itemCount: 0,
      items: [],
      summary: null,
      isCartDrawerOpen: false,

      setItemCount: (count) => set({ itemCount: Math.max(0, count) }),
      incrementCount: (delta = 1) => set((state) => ({ itemCount: state.itemCount + delta })),
      decrementCount: (delta = 1) =>
        set((state) => ({ itemCount: Math.max(0, state.itemCount - delta) })),

      openCartDrawer: () => set({ isCartDrawerOpen: true }),
      closeCartDrawer: () => set({ isCartDrawerOpen: false }),
      toggleCartDrawer: () => set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),

      isVariantInCart: (variantId?: string) => {
        if (!variantId) return false
        return get().items.some((i) => i.variant_id === variantId || i.variant?.id === variantId)
      },

      isProductInCart: (productId?: string) => {
        if (!productId) return false
        return get().items.some(
          (i) => i.variant?.product?.id === productId || i.variant?.product_id === productId
        )
      },

      getCartItemForVariant: (variantId?: string) => {
        if (!variantId) return undefined
        return get().items.find((i) => i.variant_id === variantId || i.variant?.id === variantId)
      },

      wishlistCount: 0,
      wishlistProductIds: [],
      wishlistVariantIds: [],
      setWishlistCount: (count) => set({ wishlistCount: Math.max(0, count) }),
      decrementWishlist: (delta = 1) =>
        set((state) => ({ wishlistCount: Math.max(0, state.wishlistCount - delta) })),

      refreshCart: async (force: boolean = false) => {
        if (!force && Date.now() - lastCartRefreshTime < REFRESH_THROTTLE_MS) {
          return
        }
        lastCartRefreshTime = Date.now()
        try {
          const res = await fetch('/api/cart')
          if (res.ok) {
            const data = await res.json()
            const cartItems: CartStoreItem[] = data.items || data.cart?.items || []
            const total = cartItems.reduce(
              (sum: number, item: any) => sum + (item.quantity || 0),
              0
            )
            set({
              items: cartItems,
              itemCount: total,
              summary: data.summary || computeSummaryFromItems(cartItems, get().summary),
            })
          }
        } catch {
          // Ignore network errors in background cart count refresh
        }
      },

      refreshWishlist: async (force: boolean = false) => {
        if (!force && Date.now() - lastWishlistRefreshTime < REFRESH_THROTTLE_MS) {
          return
        }
        lastWishlistRefreshTime = Date.now()
        try {
          const res = await fetch('/api/wishlist')
          if (res.ok) {
            const data = await res.json()
            if (data.success) {
              set({
                wishlistCount: typeof data.count === 'number' ? data.count : (data.items?.length || 0),
                wishlistProductIds: Array.isArray(data.productIds) ? data.productIds : [],
                wishlistVariantIds: Array.isArray(data.variantIds) ? data.variantIds : [],
              })
            }
          }
        } catch {
          // Ignore network errors in background wishlist refresh
        }
      },

      resetCartAndWishlist: () => {
        set({
          itemCount: 0,
          items: [],
          summary: null,
          wishlistCount: 0,
          wishlistProductIds: [],
          wishlistVariantIds: [],
          isCartDrawerOpen: false,
        })
      },

      isItemWishlisted: (productId?: string, variantId?: string) => {
        const { wishlistProductIds, wishlistVariantIds } = get()
        if (productId && wishlistProductIds.includes(productId)) return true
        if (variantId && wishlistVariantIds.includes(variantId)) return true
        return false
      },

      toggleWishlistStore: async (productId?: string, variantId?: string) => {
        const currentInWishlist = get().isItemWishlisted(productId, variantId)
        const nextInWishlist = !currentInWishlist

        // Optimistic UI update
        const prevCount = get().wishlistCount
        const prevProducts = [...get().wishlistProductIds]
        const prevVariants = [...get().wishlistVariantIds]

        let updatedProducts = [...prevProducts]
        let updatedVariants = [...prevVariants]

        if (nextInWishlist) {
          if (productId && !updatedProducts.includes(productId)) updatedProducts.push(productId)
          if (variantId && !updatedVariants.includes(variantId)) updatedVariants.push(variantId)
        } else {
          if (productId) updatedProducts = updatedProducts.filter((id) => id !== productId)
          if (variantId) updatedVariants = updatedVariants.filter((id) => id !== variantId)
        }

        set({
          wishlistCount: Math.max(0, prevCount + (nextInWishlist ? 1 : -1)),
          wishlistProductIds: updatedProducts,
          wishlistVariantIds: updatedVariants,
        })

        try {
          const res = await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              variantId,
              productId,
              action: nextInWishlist ? 'add' : 'toggle',
            }),
          })

          const data = await res.json()
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Failed to update wishlist')
          }

          set({
            wishlistCount: typeof data.count === 'number' ? data.count : updatedProducts.length,
            wishlistProductIds: Array.isArray(data.productIds) ? data.productIds : updatedProducts,
            wishlistVariantIds: Array.isArray(data.variantIds) ? data.variantIds : updatedVariants,
          })

          return { inWishlist: Boolean(data.inWishlist ?? nextInWishlist) }
        } catch (err) {
          // Rollback on failure
          set({
            wishlistCount: prevCount,
            wishlistProductIds: prevProducts,
            wishlistVariantIds: prevVariants,
          })
          throw err
        }
      },

      addToCartWithDrawer: async (variantId, quantity = 1, itemPreview) => {
        const prevItems = [...get().items]
        const prevCount = get().itemCount

        // 1. Check if already in cart
        const existingIdx = prevItems.findIndex(
          (i) => i.variant_id === variantId || i.variant?.id === variantId
        )

        let nextItems: CartStoreItem[] = []
        if (existingIdx >= 0) {
          nextItems = prevItems.map((item, idx) =>
            idx === existingIdx
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        } else if (itemPreview) {
          const optimisticItem: CartStoreItem = {
            id: `temp_${Date.now()}`,
            variant_id: variantId,
            quantity,
            variant: {
              id: variantId,
              product_id: itemPreview.product?.id || '',
              color: itemPreview.variant?.color || '',
              size: itemPreview.variant?.size || '',
              stock: itemPreview.variant?.stock || 99,
              product: {
                id: itemPreview.product?.id || '',
                name: itemPreview.product?.name || 'Streetwear Item',
                slug: itemPreview.product?.slug || '',
                mrp: itemPreview.product?.mrp || 0,
                selling_price: itemPreview.product?.selling_price || 0,
                images: itemPreview.product?.images || [],
              },
            },
          }
          nextItems = [optimisticItem, ...prevItems]
        } else {
          nextItems = prevItems
        }

        const nextCount = prevCount + quantity
        const nextSummary = computeSummaryFromItems(nextItems, get().summary)

        // Optimistically apply state and open drawer
        set({
          items: nextItems,
          itemCount: nextCount,
          summary: nextSummary,
          isCartDrawerOpen: true,
        })

        try {
          const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variant_id: variantId, quantity }),
          })

          const data = await res.json()
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Failed to add item to bag')
          }

          // Authoritative sync
          await get().refreshCart(true)
          return { success: true }
        } catch (err: any) {
          // Rollback on server error
          set({
            items: prevItems,
            itemCount: prevCount,
            summary: get().summary,
          })
          return { success: false, error: err.message || 'Failed to add to bag' }
        }
      },

      updateCartItemQuantityAction: async (itemId, newQty) => {
        const prevItems = [...get().items]
        const prevCount = get().itemCount

        if (newQty <= 0) {
          return get().removeCartItemAction(itemId)
        }

        const nextItems = prevItems.map((item) =>
          item.id === itemId ? { ...item, quantity: newQty } : item
        )
        const nextCount = nextItems.reduce((sum, item) => sum + item.quantity, 0)
        const nextSummary = computeSummaryFromItems(nextItems, get().summary)

        set({
          items: nextItems,
          itemCount: nextCount,
          summary: nextSummary,
        })

        try {
          const res = await fetch('/api/cart', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId, quantity: newQty }),
          })

          const data = await res.json()
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Failed to update quantity')
          }

          await get().refreshCart(true)
          return { success: true }
        } catch (err: any) {
          set({ items: prevItems, itemCount: prevCount, summary: get().summary })
          return { success: false, error: err.message || 'Failed to update quantity' }
        }
      },

      removeCartItemAction: async (itemId) => {
        const prevItems = [...get().items]
        const prevCount = get().itemCount

        const nextItems = prevItems.filter((item) => item.id !== itemId)
        const nextCount = nextItems.reduce((sum, item) => sum + item.quantity, 0)
        const nextSummary = computeSummaryFromItems(nextItems, get().summary)

        set({
          items: nextItems,
          itemCount: nextCount,
          summary: nextSummary,
        })

        try {
          const res = await fetch(`/api/cart?item_id=${encodeURIComponent(itemId)}`, {
            method: 'DELETE',
          })

          const data = await res.json()
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Failed to remove item')
          }

          await get().refreshCart(true)
          return { success: true }
        } catch (err: any) {
          set({ items: prevItems, itemCount: prevCount, summary: get().summary })
          return { success: false, error: err.message || 'Failed to remove item' }
        }
      },
    }),
    {
      name: 'bubbleboom-cart-store',
      partialize: (state) => ({
        itemCount: state.itemCount,
        items: state.items,
        wishlistCount: state.wishlistCount,
        wishlistProductIds: state.wishlistProductIds,
        wishlistVariantIds: state.wishlistVariantIds,
      }),
    }
  )
)
