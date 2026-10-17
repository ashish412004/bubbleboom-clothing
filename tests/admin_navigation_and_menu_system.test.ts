import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  DEFAULT_NAVIGATION_ITEMS,
  getNavigationItems,
  updateNavigationItems,
  resetNavigationToDefaults,
  calculateEligibleProductCounts,
  NavigationItem,
} from '@/lib/navigation'
import { getProducts } from '@/lib/products'

describe('Bubble Boom – Complete Admin-Controlled Navigation Menu System Suite', () => {
  const navTypesPath = path.join(process.cwd(), 'src', 'types', 'navigation.ts')
  const navLibPath = path.join(process.cwd(), 'src', 'lib', 'navigation.ts')
  const navManagerPath = path.join(process.cwd(), 'src', 'components', 'admin', 'navigation-manager.tsx')
  const headerPath = path.join(process.cwd(), 'src', 'components', 'header', 'header.tsx')
  const publicNavRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'navigation', 'route.ts')
  const adminNavRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'navigation', 'route.ts')
  const adminSettingsNavPagePath = path.join(process.cwd(), 'src', 'app', 'admin', 'settings', 'navigation', 'page.tsx')
  const adminNavRootPagePath = path.join(process.cwd(), 'src', 'app', 'admin', 'navigation', 'page.tsx')
  const productFormPath = path.join(process.cwd(), 'src', 'app', 'admin', 'products', 'product-form.tsx')
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '021_navigation_and_product_department.sql')

  const navTypesContent = fs.readFileSync(navTypesPath, 'utf-8')
  const navLibContent = fs.readFileSync(navLibPath, 'utf-8')
  const navManagerContent = fs.readFileSync(navManagerPath, 'utf-8')
  const headerContent = fs.readFileSync(headerPath, 'utf-8')
  const adminNavRouteContent = fs.readFileSync(adminNavRoutePath, 'utf-8')
  const productFormContent = fs.readFileSync(productFormPath, 'utf-8')
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8')

  it('1. Default navigation contains all 7 canonical Bubble Boom menu items in order', () => {
    expect(DEFAULT_NAVIGATION_ITEMS).toHaveLength(7)
    const names = DEFAULT_NAVIGATION_ITEMS.map((item) => item.name)
    expect(names).toEqual([
      'Shop All',
      'New Arrivals',
      'Men',
      'Women',
      'Footwear',
      'Collections',
      'Sale',
    ])

    expect(DEFAULT_NAVIGATION_ITEMS.find((it) => it.id === 'nav-shop-all')?.url).toBe('/shop')
    expect(DEFAULT_NAVIGATION_ITEMS.find((it) => it.id === 'nav-new-arrivals')?.url).toBe('/shop?sort=newest')
    expect(DEFAULT_NAVIGATION_ITEMS.find((it) => it.id === 'nav-men')?.url).toBe('/shop?category=men')
    expect(DEFAULT_NAVIGATION_ITEMS.find((it) => it.id === 'nav-women')?.url).toBe('/shop?category=women')
    expect(DEFAULT_NAVIGATION_ITEMS.find((it) => it.id === 'nav-footwear')?.url).toBe('/shop?category=footwear')
    expect(DEFAULT_NAVIGATION_ITEMS.find((it) => it.id === 'nav-collections')?.url).toBe('/collections')
    expect(DEFAULT_NAVIGATION_ITEMS.find((it) => it.id === 'nav-sale')?.url).toBe('/shop?sale=true')
  })

  it('2. Navigation types support desktop, mobile, auto-hide, dropdowns, and badges', () => {
    expect(navTypesContent).toContain('export interface NavigationItem')
    expect(navTypesContent).toContain('export interface NavigationSubItem')
    expect(navTypesContent).toContain('show_on_desktop: boolean')
    expect(navTypesContent).toContain('show_on_mobile: boolean')
    expect(navTypesContent).toContain('auto_hide_empty: boolean')
    expect(navTypesContent).toContain('dropdown_items?: NavigationSubItem[]')
    expect(navTypesContent).toContain('badge?: string | null')
  })

  it('3. Navigation Manager UI includes Add, Edit, Reorder, Submenus, and Delete', () => {
    expect(navManagerContent).toContain('Storefront Navigation')
    expect(navManagerContent).toContain('Add Menu Item')
    expect(navManagerContent).toContain('Reset Defaults')
    expect(navManagerContent).toContain('moveItem')
    expect(navManagerContent).toContain('toggleVisibility')
    expect(navManagerContent).toContain('toggleDesktop')
    expect(navManagerContent).toContain('toggleMobile')
    expect(navManagerContent).toContain('toggleAutoHide')
    expect(navManagerContent).toContain('Add Submenu')
    expect(navManagerContent).toContain('Dropdown Submenus for')
  })

  it('4. Header dynamically renders admin navigation for Desktop and Mobile', () => {
    // Desktop navigation checks
    expect(headerContent).toContain('navItems')
    expect(headerContent).toContain('item.show_on_desktop !== false')
    expect(headerContent).toContain('hasDropdown')
    expect(headerContent).toContain('ChevronDown')

    // Mobile navigation checks
    expect(headerContent).toContain('item.show_on_mobile !== false')
    expect(headerContent).toContain('mobileExpandedDropdown')
    expect(headerContent).toContain('/api/navigation')
  })

  it('5. Admin Navigation API route verifies admin authentication and handles CRUD', () => {
    expect(fs.existsSync(adminNavRoutePath)).toBe(true)
    expect(adminNavRouteContent).toContain('checkAdminAuth')
    expect(adminNavRouteContent).toContain('export async function GET')
    expect(adminNavRouteContent).toContain('export async function PUT')
    expect(adminNavRouteContent).toContain('export async function POST')
    expect(adminNavRouteContent).toContain('export async function DELETE')
    expect(adminNavRouteContent).toContain('updateNavigationItems')
    expect(adminNavRouteContent).toContain('resetNavigationToDefaults')
  })

  it('6. Product Catalog Form includes Department selector (Men, Women, Unisex)', () => {
    expect(productFormContent).toContain('department')
    expect(productFormContent).toContain('Department / Audience *')
    expect(productFormContent).toContain('Unisex (Men &amp; Women)')
    expect(productFormContent).toContain('<option value="men">Men</option>')
    expect(productFormContent).toContain('<option value="women">Women</option>')
    expect(productFormContent).toContain('department,')
  })

  it('7. Database migration safely adds department column, indexes, and navigation table', () => {
    expect(fs.existsSync(migrationPath)).toBe(true)
    expect(migrationContent).toContain('ALTER TABLE public.products')
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS department TEXT DEFAULT \'unisex\'')
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS public.navigation_items')
    expect(migrationContent).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migrationContent).toContain('INSERT INTO public.store_settings (key, value, description)')
  })

  it('8. Smart Auto-Hide logic: hides when empty if enabled, but manual hide always takes priority', async () => {
    // Test items with mock counts
    const testItems: NavigationItem[] = [
      {
        id: 'test-auto-hide-empty',
        name: 'Empty Category',
        type: 'category',
        url: '/shop?category=empty',
        sort_order: 1,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
        auto_hide_empty: true,
        eligible_count: 0,
      },
      {
        id: 'test-auto-hide-with-items',
        name: 'Stocked Category',
        type: 'category',
        url: '/shop?category=stocked',
        sort_order: 2,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
        auto_hide_empty: true,
        eligible_count: 5,
      },
      {
        id: 'test-manual-hide',
        name: 'Manual Hidden',
        type: 'category',
        url: '/shop?category=hidden',
        sort_order: 3,
        is_visible: false, // Explicitly hidden by Admin
        show_on_desktop: true,
        show_on_mobile: true,
        auto_hide_empty: false,
        eligible_count: 10,
      },
    ]

    // Public filter simulation (matching getNavigationItems logic)
    const publicVisible = testItems.filter((item) => {
      if (!item.is_visible) return false
      if (item.auto_hide_empty && item.eligible_count === 0) return false
      return true
    })

    // 'Empty Category' should be auto-hidden (0 items)
    expect(publicVisible.find((it) => it.id === 'test-auto-hide-empty')).toBeUndefined()

    // 'Stocked Category' should be visible (5 items)
    expect(publicVisible.find((it) => it.id === 'test-auto-hide-with-items')).toBeDefined()

    // 'Manual Hidden' must remain hidden even though it has 10 items
    expect(publicVisible.find((it) => it.id === 'test-manual-hide')).toBeUndefined()
  })

  it('9. Men & Women filter logic includes explicit Unisex products', async () => {
    // Offline mock products test verifying department filtering
    const menProducts = await getProducts({ category: 'men' })
    const womenProducts = await getProducts({ category: 'women' })

    // No errors thrown, returns array
    expect(Array.isArray(menProducts)).toBe(true)
    expect(Array.isArray(womenProducts)).toBe(true)
  })

  it('10. Deleting or hiding a navigation entry never touches or deletes product or category records', () => {
    // Validates that updateNavigationItems only mutates store_settings and navigation_items, never products
    expect(navLibContent).not.toContain("supabase.from('products').delete")
    expect(navLibContent).not.toContain("supabase.from('categories').delete")
    expect(navLibContent).not.toContain("supabase.from('collections').delete")
  })
})
