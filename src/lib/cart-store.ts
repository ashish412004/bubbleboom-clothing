import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartStore {
  itemCount: number
  setItemCount: (count: number) => void
  incrementCount: (delta?: number) => void
  decrementCount: (delta?: number) => void
  wishlistCount: number
  wishlistProductIds: string[]
  wishlistVariantIds: string[]
  setWishlistCount: (count: number) => void
  decrementWishlist: (delta?: number) => void
  refreshCart: () => Promise<void>
  refreshWishlist: () => Promise<void>
  resetCartAndWishlist: () => void
  isItemWishlisted: (productId?: string, variantId?: string) => boolean
  toggleWishlistStore: (productId?: string, variantId?: string) => Promise<{ inWishlist: boolean }>
}

let lastCartRefreshTime = 0
let lastWishlistRefreshTime = 0
const REFRESH_THROTTLE_MS = 20000 // 20s throttle

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      itemCount: 0,
      setItemCount: (count) => set({ itemCount: Math.max(0, count) }),
      incrementCount: (delta = 1) => set((state) => ({ itemCount: state.itemCount + delta })),
      decrementCount: (delta = 1) =>
        set((state) => ({ itemCount: Math.max(0, state.itemCount - delta) })),
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
            const cartItems = data.items || data.cart?.items || []
            const total = cartItems.reduce(
              (sum: number, item: any) => sum + (item.quantity || 0),
              0
            )
            set({ itemCount: total })
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
          wishlistCount: 0,
          wishlistProductIds: [],
          wishlistVariantIds: [],
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
          const identifier = variantId || productId
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

          // Authoritative sync from server response
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
    }),
    {
      name: 'bubbleboom-cart-store',
    }
  )
)

