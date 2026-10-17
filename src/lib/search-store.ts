'use client'

import { create } from 'zustand'

export interface SearchState {
  isOpen: boolean
  query: string
  category: string
  openSearch: (initialQuery?: string, initialCategory?: string) => void
  closeSearch: () => void
  toggleSearch: () => void
  setQuery: (query: string) => void
  setCategory: (category: string) => void
  reset: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: '',
  category: 'all',
  openSearch: (initialQuery = '', initialCategory = 'all') =>
    set({
      isOpen: true,
      query: initialQuery,
      category: initialCategory,
    }),
  closeSearch: () => set({ isOpen: false }),
  toggleSearch: () => set((state) => ({ isOpen: !state.isOpen })),
  setQuery: (query: string) => set({ query }),
  setCategory: (category: string) => set({ category }),
  reset: () => set({ query: '', category: 'all' }),
}))
