import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Customer Account Dashboard UX Upgrade Suite', () => {
  const accountPagePath = path.join(process.cwd(), 'src', 'app', 'account', 'page.tsx')
  const accountNavPath = path.join(process.cwd(), 'src', 'components', 'account', 'account-nav.tsx')
  const addressManagerPath = path.join(process.cwd(), 'src', 'app', 'account', 'addresses', 'address-manager.tsx')
  const addressRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'addresses', 'route.ts')
  const savedDropsPagePath = path.join(process.cwd(), 'src', 'app', 'account', 'saved-drops', 'page.tsx')
  const savedDropsViewPath = path.join(process.cwd(), 'src', 'app', 'account', 'saved-drops', 'saved-drops-view.tsx')
  const wishlistPagePath = path.join(process.cwd(), 'src', 'app', 'wishlist', 'page.tsx')
  const ordersLibPath = path.join(process.cwd(), 'src', 'lib', 'orders.ts')

  const accountPageContent = fs.readFileSync(accountPagePath, 'utf-8')
  const accountNavContent = fs.readFileSync(accountNavPath, 'utf-8')
  const addressManagerContent = fs.readFileSync(addressManagerPath, 'utf-8')
  const addressRouteContent = fs.readFileSync(addressRoutePath, 'utf-8')
  const savedDropsPageContent = fs.readFileSync(savedDropsPagePath, 'utf-8')
  const savedDropsViewContent = fs.readFileSync(savedDropsViewPath, 'utf-8')
  const wishlistPageContent = fs.readFileSync(wishlistPagePath, 'utf-8')
  const ordersLibContent = fs.readFileSync(ordersLibPath, 'utf-8')

  it('1. Removes unnecessary statistics cards from Account Overview', () => {
    // Verified: TOTAL ORDERS, VERIFIED CUSTOMER, FREE DELIVERY cards are removed
    expect(accountPageContent).not.toContain('Total Orders</span>')
    expect(accountPageContent).not.toContain('Verified Customer</p>')
    expect(accountPageContent).not.toContain('Free Delivery</span>')
    expect(accountPageContent).not.toContain('Orders &gt; ₹1,499')
  })

  it('2. Recent Orders shows at most 2 orders and includes VIEW ALL ORDERS link', () => {
    // getOrdersByUserId called with limit 2
    expect(accountPageContent).toContain('getOrdersByUserId(user.id, 2)')
    // Header includes View All Orders link
    expect(accountPageContent).toContain('View All Orders')
    expect(accountPageContent).toContain('href="/account/orders"')
    // Lib function supports optional limit parameter
    expect(ordersLibContent).toContain('export async function getOrdersByUserId(userId: string, limit?: number): Promise<Order[]>')
  })

  it('3. Saved Drops is integrated directly inside the Account Dashboard layout', () => {
    // Dedicated in-account page with AccountNav
    expect(savedDropsPageContent).toContain('<AccountNav />')
    expect(savedDropsPageContent).toContain('<SavedDropsView initialItems={items} />')
    // AccountNav links to /account/saved-drops
    expect(accountNavContent).toContain("href: '/account/saved-drops', label: 'Saved Drops'")
    // Standalone /wishlist redirects authenticated users to /account/saved-drops
    expect(wishlistPageContent).toContain("redirect('/account/saved-drops')")
  })

  it('4. Saved Drops View renders actual product details, active red heart, and move-to-bag action', () => {
    expect(savedDropsViewContent).toContain('Saved Drops')
    expect(savedDropsViewContent).toContain('fill-[#DC2626] text-[#DC2626]')
    expect(savedDropsViewContent).toContain('formatPrice(product.selling_price)')
    expect(savedDropsViewContent).toContain('Size: <span className="font-bold text-black">{variant.size}</span>')
    expect(savedDropsViewContent).toContain('Color:')
    expect(savedDropsViewContent).toContain('Sold Out')
    expect(savedDropsViewContent).toContain('Add to Bag')
    expect(savedDropsViewContent).toContain('View')
    expect(savedDropsViewContent).toContain('No Saved Drops Yet')
  })

  it('5. Address Manager adds Edit Address action and prefilled edit form', () => {
    // Address card has Edit button
    expect(addressManagerContent).toContain('Edit</span>')
    // Edit state and handlers
    expect(addressManagerContent).toContain('editingAddress')
    expect(addressManagerContent).toContain('handleStartEdit')
    expect(addressManagerContent).toContain('handleSaveEdit')
    expect(addressManagerContent).toContain('handleCancelEdit')
    expect(addressManagerContent).toContain('Saving Changes...')
    // PUT request to /api/addresses
    expect(addressManagerContent).toContain("method: 'PUT'")
  })

  it('6. Supports changing default delivery address with single-default enforcement', () => {
    // AddressManager has Set as Default button
    expect(addressManagerContent).toContain('Set as Default')
    expect(addressManagerContent).toContain('handleSetDefault')
    expect(addressManagerContent).toContain('set_default_only: true')
    // Backend API has PUT/PATCH endpoint handling default status
    expect(addressRouteContent).toContain('export async function PUT')
    expect(addressRouteContent).toContain('export const PATCH = PUT')
    expect(addressRouteContent).toContain('.update({ is_default: false })')
    expect(addressRouteContent).toContain(".eq('user_id', user.id)")
    // Deleting default address promotes remaining address
    expect(addressRouteContent).toContain('wasDefault')
  })

  it('7. Account Overview renders clean 5-part layout without empty stat cards', () => {
    // Welcome back with customer first name
    expect(accountPageContent).toContain('Welcome back, <span className="font-bold text-black">{firstName}</span>')
    // Recent Orders section
    expect(accountPageContent).toContain('Recent Orders')
    // Saved Drops preview section
    expect(accountPageContent).toContain('Saved Drops')
    expect(accountPageContent).toContain('View All Saved Drops')
    // Default Address preview section
    expect(accountPageContent).toContain('Default Address')
    expect(accountPageContent).toContain('Manage Addresses')
    // Personal Information section
    expect(accountPageContent).toContain('Personal Info')
    expect(accountPageContent).toContain('Edit Profile')
  })

  it('8. Account Nav supports desktop single-active highlight and mobile scrollable tabs', () => {
    // Mobile navigation tabs
    expect(accountNavContent).toContain('Account Mobile Tabs')
    expect(accountNavContent).toContain('md:hidden')
    expect(accountNavContent).toContain('overflow-x-auto')
    // Desktop navigation sidebar
    expect(accountNavContent).toContain('Account Desktop Navigation')
    expect(accountNavContent).toContain('hidden md:block')
    // Exact active check prevents multiple simultaneous highlights
    expect(accountNavContent).toContain("if (href === '/account')")
    expect(accountNavContent).toContain("return pathname === '/account'")
  })

  it('9. Secure Sign Out clears Supabase Auth, session cookie, and local store state', () => {
    expect(accountNavContent).toContain('supabase.auth.signOut()')
    expect(accountNavContent).toContain("action: 'logout'")
    expect(accountNavContent).toContain('useAuthStore.getState().clearUser()')
    expect(accountNavContent).toContain('resetCartAndWishlist()')
    expect(accountNavContent).toContain("router.push('/')")
  })
})
