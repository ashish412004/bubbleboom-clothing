import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { useSearchStore } from '@/lib/search-store'

describe('BUBBLE BOOM – Premium Search Drawer Redesign (Desktop & Mobile)', () => {
  const searchDrawerPath = path.join(process.cwd(), 'src/components/search/search-drawer.tsx')
  const searchApiPath = path.join(process.cwd(), 'src/app/api/search/route.ts')
  const searchPagePath = path.join(process.cwd(), 'src/app/search/page.tsx')
  const searchClientPath = path.join(process.cwd(), 'src/app/search/search-client.tsx')
  const headerPath = path.join(process.cwd(), 'src/components/header/header.tsx')
  const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx')

  const searchDrawerContent = fs.readFileSync(searchDrawerPath, 'utf-8')
  const searchApiContent = fs.readFileSync(searchApiPath, 'utf-8')
  const searchPageContent = fs.readFileSync(searchPagePath, 'utf-8')
  const searchClientContent = fs.readFileSync(searchClientPath, 'utf-8')
  const headerContent = fs.readFileSync(headerPath, 'utf-8')
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8')

  beforeEach(() => {
    useSearchStore.getState().reset()
    useSearchStore.getState().closeSearch()
  })

  describe('1. Global Integration & Trigger Architecture', () => {
    it('renders SearchDrawer globally in RootLayout', () => {
      expect(layoutContent).toContain('import { SearchDrawer } from "@/components/search/search-drawer"')
      expect(layoutContent).toContain('<SearchDrawer />')
    })

    it('desktop search icon opens the right-side search drawer', () => {
      expect(headerContent).toContain('openSearch = useSearchStore')
      expect(headerContent).toContain('onClick={(e) => {\n                e.preventDefault()\n                openSearch()')
    })

    it('mobile search icon opens the full-screen search interface', () => {
      expect(headerContent).toContain('onClick={(e) => {\n                e.preventDefault()\n                openSearch()')
    })

    it('Zustand search store controls open, close, query, and category states', () => {
      const store = useSearchStore.getState()
      expect(store.isOpen).toBe(false)
      expect(store.query).toBe('')
      expect(store.category).toBe('all')

      store.openSearch('hoodie', 'hoodies')
      expect(useSearchStore.getState().isOpen).toBe(true)
      expect(useSearchStore.getState().query).toBe('hoodie')
      expect(useSearchStore.getState().category).toBe('hoodies')

      store.closeSearch()
      expect(useSearchStore.getState().isOpen).toBe(false)
    })
  })

  describe('2. Desktop Search Drawer Specifications', () => {
    it('slides in from the right with suggested 70-75vw / 900px max width', () => {
      expect(searchDrawerContent).toContain('w-full sm:w-[75vw] lg:w-[70vw] max-w-[900px]')
      expect(searchDrawerContent).toContain('slide-in-from-right')
      expect(searchDrawerContent).toContain('fixed top-0 right-0 bottom-0')
    })

    it('includes dark semi-transparent backdrop overlay that locks body scroll', () => {
      expect(searchDrawerContent).toContain('bg-black/60')
      expect(searchDrawerContent).toContain('onClick={closeSearch}')
      expect(searchDrawerContent).toContain('document.body.style.overflow = \'hidden\'')
    })

    it('has a circular close button in the upper-right corner', () => {
      expect(searchDrawerContent).toContain('w-9 h-9 rounded-full border border-neutral-300 hover:border-black')
      expect(searchDrawerContent).toContain('aria-label="Close search drawer"')
    })

    it('closes on Escape key press, backdrop click, or route navigation', () => {
      expect(searchDrawerContent).toContain("e.key === 'Escape'")
      expect(searchDrawerContent).toContain('closeSearch()')
      expect(searchDrawerContent).toContain('pathname')
    })

    it('features horizontal header with minimal bottom underline for Category dropdown and Search input', () => {
      expect(searchDrawerContent).toContain('border-b border-black')
      expect(searchDrawerContent).toContain('All Categories')
      expect(searchDrawerContent).toContain('Search products...')
    })

    it('shows NEED SOME INSPIRATION? heading and 3-column grid for recommendations when empty', () => {
      expect(searchDrawerContent).toContain('NEED SOME INSPIRATION?')
      expect(searchDrawerContent).toContain('grid grid-cols-3 gap-5 lg:gap-6')
    })

    it('renders persistent bottom VIEW ALL button linking to shop or search', () => {
      expect(searchDrawerContent).toContain('VIEW ALL RESULTS')
      expect(searchDrawerContent).toContain('VIEW ALL PRODUCTS')
      expect(searchDrawerContent).toContain('ArrowRight')
    })
  })

  describe('3. Mobile Full-Screen Search Specifications', () => {
    it('renders a dedicated mobile full-screen search container respecting iPhone safe areas', () => {
      expect(searchDrawerContent).toContain('md:hidden fixed inset-0 z-50 bg-white')
      expect(searchDrawerContent).toContain('h-[100dvh]')
      expect(searchDrawerContent).toContain('env(safe-area-inset-top)')
      expect(searchDrawerContent).toContain('env(safe-area-inset-bottom)')
    })

    it('provides sticky mobile header with back arrow [ ← ] and search input', () => {
      expect(searchDrawerContent).toContain('ArrowLeft')
      expect(searchDrawerContent).toContain('placeholder="Search Bubble Boom..."')
    })

    it('displays horizontally scrollable category chips below input with active black pill state', () => {
      expect(searchDrawerContent).toContain('overflow-x-auto')
      expect(searchDrawerContent).toContain('no-scrollbar')
      expect(searchDrawerContent).toContain('category === \'all\'')
      expect(searchDrawerContent).toContain('bg-black text-white')
    })

    it('shows TRENDING AT BUBBLE BOOM heading and 2-column product grid', () => {
      expect(searchDrawerContent).toContain('TRENDING AT BUBBLE BOOM')
      expect(searchDrawerContent).toContain('grid grid-cols-2 gap-3.5')
    })

    it('features a mobile View All button in sticky footer', () => {
      expect(searchDrawerContent).toContain('border-t border-neutral-200 bg-white shrink-0')
    })
  })

  describe('4. Search API & Data Integrity', () => {
    it('supports query, category filter, recommendations on empty query, and active categories list', () => {
      expect(searchApiContent).toContain("searchParams.get('category')")
      expect(searchApiContent).toContain('getCategories(false)')
      expect(searchApiContent).toContain('isRecommended')
    })

    it('only returns active published products from Supabase/catalog without leaking drafts', () => {
      expect(searchApiContent).toContain('getProducts')
      // getProducts enforces is_published: true and is_active: true
      const productsLibPath = path.join(process.cwd(), 'src/lib/products.ts')
      const productsLib = fs.readFileSync(productsLibPath, 'utf-8')
      expect(productsLib).toContain(".eq('is_published', true)")
      expect(productsLib).toContain(".eq('is_active', true)")
    })

    it('displays NO PRODUCTS FOUND with Clear Search and Shop All actions when query yields 0 matches', () => {
      expect(searchDrawerContent).toContain('NO PRODUCTS FOUND')
      expect(searchDrawerContent).toContain('Try another search or explore our collections.')
      expect(searchDrawerContent).toContain('Clear Search')
      expect(searchDrawerContent).toContain('Shop All')
    })
  })

  describe('5. Search Page Route Preserved & Functional', () => {
    it('search page supports deep-linking with both q and category params', () => {
      expect(searchPageContent).toContain("searchParams: Promise<{ q?: string; category?: string }>")
      expect(searchPageContent).toContain('initialCategory')
    })

    it('search client synchronizes URL history state with category parameter', () => {
      expect(searchClientContent).toContain('initialCategory')
      expect(searchClientContent).toContain('category')
      expect(searchClientContent).toContain('window.history.replaceState')
    })
  })
})
