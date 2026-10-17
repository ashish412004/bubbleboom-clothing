import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Complete Customer Account UI/UX Redesign Suite', () => {
  const accountShellPath = path.join(process.cwd(), 'src', 'components', 'account', 'account-shell.tsx')
  const accountNavPath = path.join(process.cwd(), 'src', 'components', 'account', 'account-nav.tsx')
  const profileFormPath = path.join(process.cwd(), 'src', 'components', 'account', 'profile-details-form.tsx')
  const addressManagerPath = path.join(process.cwd(), 'src', 'app', 'account', 'addresses', 'address-manager.tsx')
  const ordersDrawerPath = path.join(process.cwd(), 'src', 'components', 'account', 'orders-view-with-drawer.tsx')
  const savedDropsViewPath = path.join(process.cwd(), 'src', 'app', 'account', 'saved-drops', 'saved-drops-view.tsx')
  const profileSecurityPath = path.join(process.cwd(), 'src', 'app', 'account', 'profile', 'profile-form.tsx')
  const accountPagePath = path.join(process.cwd(), 'src', 'app', 'account', 'page.tsx')
  const addressesPagePath = path.join(process.cwd(), 'src', 'app', 'account', 'addresses', 'page.tsx')
  const ordersPagePath = path.join(process.cwd(), 'src', 'app', 'account', 'orders', 'page.tsx')
  const savedDropsPagePath = path.join(process.cwd(), 'src', 'app', 'account', 'saved-drops', 'page.tsx')

  const shellContent = fs.readFileSync(accountShellPath, 'utf-8')
  const navContent = fs.readFileSync(accountNavPath, 'utf-8')
  const profileDetailsContent = fs.readFileSync(profileFormPath, 'utf-8')
  const addressManagerContent = fs.readFileSync(addressManagerPath, 'utf-8')
  const ordersDrawerContent = fs.readFileSync(ordersDrawerPath, 'utf-8')
  const savedDropsViewContent = fs.readFileSync(savedDropsViewPath, 'utf-8')
  const profileSecurityContent = fs.readFileSync(profileSecurityPath, 'utf-8')
  const accountPageContent = fs.readFileSync(accountPagePath, 'utf-8')
  const addressesPageContent = fs.readFileSync(addressesPagePath, 'utf-8')
  const ordersPageContent = fs.readFileSync(ordersPagePath, 'utf-8')
  const savedDropsPageContent = fs.readFileSync(savedDropsPagePath, 'utf-8')

  it('1. Enforces two-column layout, light-grey canvas (#F5F5F7), and white rounded panel', () => {
    // Canvas background
    expect(shellContent).toContain('bg-[#F5F5F7]')
    // Left sidebar width (280-290px)
    expect(shellContent).toContain('md:w-[280px]')
    // White rounded panel with 16-20px radius
    expect(shellContent).toContain('bg-white rounded-2xl md:rounded-[20px]')
  })

  it('2. Implements Left Profile Information Card with avatar initials, name, email and phone', () => {
    // Initial extraction helper
    expect(navContent).toContain('getCustomerInitials')
    // Circular black avatar with white text
    expect(navContent).toContain('rounded-full bg-black text-white')
    // Bold customer name
    expect(navContent).toContain('{displayName}')
    // Customer email
    expect(navContent).toContain('{email}')
    // Phone display if available
    expect(navContent).toContain('{phone}')
  })

  it('3. Renders clean sidebar navigation with strictly one active black pill state', () => {
    expect(navContent).toContain("href: '/account', label: 'My Profile'")
    expect(navContent).toContain("href: '/account/addresses', label: 'My Addresses'")
    expect(navContent).toContain("href: '/account/orders', label: 'My Orders'")
    expect(navContent).toContain("href: '/account/saved-drops', label: 'Saved Drops'")
    expect(navContent).toContain("href: '/account/profile', label: 'Profile & Security'")
    // Active styling: black bg, white text, rounded-xl
    expect(navContent).toContain('bg-black text-white shadow-xs')
    expect(navContent).toContain('rounded-xl')
    // Sign out button
    expect(navContent).toContain('Sign Out')
  })

  it('4. My Profile page provides two-column form for first/last name, phone, email, and address location', () => {
    expect(profileDetailsContent).toContain('Profile Details')
    expect(profileDetailsContent).toContain('First Name')
    expect(profileDetailsContent).toContain('Last Name')
    expect(profileDetailsContent).toContain('Phone Number')
    expect(profileDetailsContent).toContain('Email Address')
    expect(profileDetailsContent).toContain('Default Location')
    expect(profileDetailsContent).toContain('Delivery Pincode')
    // Save Changes button only on change
    expect(profileDetailsContent).toContain('hasChanges &&')
    expect(profileDetailsContent).toContain('Save Changes')
    expect(profileDetailsContent).toContain('Saving Changes...')
  })

  it('5. Phase 5 Default Delivery Address card provides DEFAULT badge and manage link', () => {
    expect(profileDetailsContent).toContain('Default Address')
    expect(profileDetailsContent).toContain('Default')
    expect(profileDetailsContent).toContain('MANAGE ALL ADDRESSES')
    expect(profileDetailsContent).toContain('/account/addresses')
  })

  it('6. My Addresses page features dashed ADD NEW ADDRESS card and rounded-2xl address cards', () => {
    // First card: Dashed button
    expect(addressManagerContent).toContain('border-2 border-dashed border-neutral-300')
    expect(addressManagerContent).toContain('ADD NEW ADDRESS')
    // Saved addresses header
    expect(addressManagerContent).toContain('MY ADDRESSES')
    expect(addressManagerContent).toContain('SAVED ADDRESSES')
    // Card actions
    expect(addressManagerContent).toContain('handleStartEdit')
    expect(addressManagerContent).toContain('handleDeleteAddress')
    expect(addressManagerContent).toContain('Set as Default')
    expect(addressManagerContent).toContain('handleSetDefault')
    // Validation
    expect(addressManagerContent).toContain('phoneRegex = /^[6-9]')
    expect(addressManagerContent).toContain('.test(editPhone)')
    expect(addressManagerContent).toContain('.test(editPinCode)')
  })

  it('7. My Orders page includes horizontal status filters and clean order cards with thumbnails', () => {
    expect(ordersDrawerContent).toContain('MY ORDERS')
    expect(ordersDrawerContent).toContain('manage all your orders')
    // Status filter tabs
    expect(ordersDrawerContent).toContain("'all'")
    expect(ordersDrawerContent).toContain("'processing'")
    expect(ordersDrawerContent).toContain("'delivered'")
    expect(ordersDrawerContent).toContain("'cancelled'")
    // Order card elements
    expect(ordersDrawerContent).toContain('VIEW DETAILS')
    expect(ordersDrawerContent).toContain('formatPrice(ord.total_amount)')
  })

  it('8. Right-side Order Details Drawer slides in with real order, payment, and courier details', () => {
    // Drawer panel fixed to right with 420-480px width
    expect(ordersDrawerContent).toContain('fixed inset-y-0 right-0 max-w-full w-full sm:w-[460px] md:w-[480px]')
    expect(ordersDrawerContent).toContain('bg-black/60 backdrop-blur-xs')
    // Close controls
    expect(ordersDrawerContent).toContain('closeDrawer')
    expect(ordersDrawerContent).toContain('Escape')
    // Order info sections
    expect(ordersDrawerContent).toContain('Order Details')
    expect(ordersDrawerContent).toContain('ITEMS (')
    expect(ordersDrawerContent).toContain('Shipping Address')
    expect(ordersDrawerContent).toContain('Payment')
    expect(ordersDrawerContent).toContain('Charges')
    expect(ordersDrawerContent).toContain('Invoice')
    expect(ordersDrawerContent).toContain('Return / Exchange')
  })

  it('9. Saved Drops, Profile & Security, and Account pages all share the unified AccountShell', () => {
    expect(accountPageContent).toContain('<AccountShell')
    expect(addressesPageContent).toContain('<AccountShell')
    expect(ordersPageContent).toContain('<AccountShell')
    expect(savedDropsPageContent).toContain('<AccountShell')
    expect(profileSecurityContent).toContain('PROFILE')
    expect(profileSecurityContent).toContain('SECURITY')
  })
})
