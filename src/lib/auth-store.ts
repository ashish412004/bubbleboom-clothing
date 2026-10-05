'use client'

import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  role?: string
}

interface AuthStore {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: any) => void
  clearUser: () => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (rawUser) => {
    if (!rawUser) {
      set({ user: null, isLoading: false })
      return
    }
    const name =
      rawUser.user_metadata?.full_name ||
      rawUser.full_name ||
      rawUser.name ||
      rawUser.email?.split('@')[0] ||
      'Member'

    set({
      user: {
        id: rawUser.id,
        email: rawUser.email || '',
        name,
        role: rawUser.role || 'customer',
      },
      isLoading: false,
    })
  },
  clearUser: () => set({ user: null, isLoading: false }),
  refreshUser: async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          const name =
            data.user.user_metadata?.full_name ||
            data.user.full_name ||
            data.user.name ||
            data.user.email?.split('@')[0] ||
            'Member'

          set({
            user: {
              id: data.user.id,
              email: data.user.email || '',
              name,
              role: data.user.role || 'customer',
            },
            isLoading: false,
          })
          return
        }
      }
      set({ user: null, isLoading: false })
    } catch {
      set({ user: null, isLoading: false })
    }
  },
}))
