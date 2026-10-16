'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  name: string
  role?: string
}

interface AuthStore {
  user: AuthUser | null
  isLoading: boolean
  hasChecked: boolean
  setUser: (user: any) => void
  clearUser: () => void
  refreshUser: (force?: boolean) => Promise<void>
}

let lastAuthRefreshTime = 0
const AUTH_REFRESH_THROTTLE_MS = 30000 // 30s throttle

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      hasChecked: false,
      setUser: (rawUser) => {
        if (!rawUser) {
          set({ user: null, isLoading: false, hasChecked: true })
          return
        }
        const name =
          rawUser.full_name ||
          rawUser.user_metadata?.full_name ||
          rawUser.user_metadata?.name ||
          (rawUser.user_metadata?.given_name
            ? `${rawUser.user_metadata.given_name} ${rawUser.user_metadata?.family_name || ''}`.trim()
            : null) ||
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
          hasChecked: true,
        })
      },
      clearUser: () => {
        lastAuthRefreshTime = 0
        set({ user: null, isLoading: false, hasChecked: true })
      },
      refreshUser: async (force: boolean = false) => {
        if (!force && Date.now() - lastAuthRefreshTime < AUTH_REFRESH_THROTTLE_MS) return
        lastAuthRefreshTime = Date.now()

    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          const name =
            data.user.full_name ||
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            (data.user.user_metadata?.given_name
              ? `${data.user.user_metadata.given_name} ${data.user.user_metadata?.family_name || ''}`.trim()
              : null) ||
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
            hasChecked: true,
          })
          return
        }
      }
      set({ user: null, isLoading: false, hasChecked: true })
    } catch {
      set({ user: null, isLoading: false, hasChecked: true })
    }
  },
}),
    {
      name: 'bb_auth_store',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
