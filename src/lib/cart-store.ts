import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartStore {
  itemCount: number
  setItemCount: (count: number) => void
  incrementCount: (delta?: number) => void
  decrementCount: (delta?: number) => void
  wishlistCount: number
  setWishlistCount: (count: number) => void
  decrementWishlist: (delta?: number) => void
  refreshCart: () => Promise<void>
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      itemCount: 0,
      setItemCount: (count) => set({ itemCount: Math.max(0, count) }),
      incrementCount: (delta = 1) => set((state) => ({ itemCount: state.itemCount + delta })),
      decrementCount: (delta = 1) =>
        set((state) => ({ itemCount: Math.max(0, state.itemCount - delta) })),
      wishlistCount: 0,
      setWishlistCount: (count) => set({ wishlistCount: Math.max(0, count) }),
      decrementWishlist: (delta = 1) =>
        set((state) => ({ wishlistCount: Math.max(0, state.wishlistCount - delta) })),
      refreshCart: async () => {
        try {
          const res = await fetch('/api/cart')
          if (res.ok) {
            const data = await res.json()
            if (data.cart?.items) {
              const total = data.cart.items.reduce(
                (sum: number, item: any) => sum + item.quantity,
                0
              )
              set({ itemCount: total })
            }
          }
        } catch {
          // Ignore network errors in background cart count refresh
        }
      },
    }),
    {
      name: 'bubbleboom-cart-store',
    }
  )
)
