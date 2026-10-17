import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Final Mobile Sidebar Update with Sign Out', () => {
  const headerPath = path.join(process.cwd(), 'src', 'components', 'header', 'header.tsx')
  const headerContent = fs.readFileSync(headerPath, 'utf-8')

  describe('1. MY ACCOUNT Item Requirements', () => {
    it('always displays exactly "MY ACCOUNT" with no customer name, "(BUBBLE)", or email', () => {
      // Must contain exactly <span>MY ACCOUNT</span>
      expect(headerContent).toContain('<span>MY ACCOUNT</span>')

      // Must not contain any interpolation of authUser.name in the mobile footer
      expect(headerContent).not.toMatch(/<span>\s*\{\s*mounted\s*&&\s*authUser\s*\?\s*`My Account/i)
      expect(headerContent).not.toContain('(BUBBLE)')
    })

    it('links to login with redirect to /account when logged out, and /account when logged in', () => {
      expect(headerContent).toContain(
        "href={mounted && authUser ? '/account' : '/login?next=/account'}"
      )
    })

    it('closes the mobile sidebar when clicked', () => {
      // Both the drawer container and account link close the sidebar
      const accountLinkSection = headerContent.slice(
        headerContent.indexOf("href={mounted && authUser ? '/account' : '/login?next=/account'}"),
        headerContent.indexOf("<span>MY ACCOUNT</span>")
      )
      expect(accountLinkSection).toContain('onClick={() => setMobileMenuOpen(false)}')
    })
  })

  describe('2. HELP & SUPPORT Item Requirements', () => {
    it('is placed below Track Order and uses matching Headset icon', () => {
      const trackOrderIndex = headerContent.indexOf('Track Order')
      const helpSupportIndex = headerContent.indexOf('HELP & SUPPORT')

      expect(trackOrderIndex).toBeGreaterThan(-1)
      expect(helpSupportIndex).toBeGreaterThan(-1)
      expect(helpSupportIndex).toBeGreaterThan(trackOrderIndex)

      // Verified headset icon from lucide-react
      expect(headerContent).toContain('<Headset size={16} className="mr-3 shrink-0" />')
    })

    it('links to the existing /contact page and maintains monochrome styling', () => {
      const contactSection = headerContent.slice(
        headerContent.indexOf('href="/contact"'),
        headerContent.indexOf('<span>HELP & SUPPORT</span>')
      )
      expect(contactSection).toContain('text-black hover:text-neutral-600')
      expect(contactSection).toContain('onClick={() => setMobileMenuOpen(false)}')
    })
  })

  describe('3. Coloured Instagram Icon Requirements', () => {
    it('displays "FOLLOW US ON INSTAGRAM" linking to official profile in a new tab', () => {
      expect(headerContent).toContain('FOLLOW US ON INSTAGRAM')
      expect(headerContent).toContain('href="https://www.instagram.com/bubbleboomstore/"')
      expect(headerContent).toContain('target="_blank"')
      expect(headerContent).toContain('rel="noopener noreferrer"')
    })

    it('features 26-30px rounded-square with purple, pink, magenta, orange, and yellow gradient', () => {
      // 28px: w-7 h-7, rounded-[7px]
      expect(headerContent).toContain('w-7 h-7 rounded-[7px]')
      expect(headerContent).toContain(
        'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)'
      )
    })

    it('contains white Instagram camera symbol while label text remains black', () => {
      expect(headerContent).toContain('<InstagramIcon size={15} className="text-white" />')
      expect(headerContent).toContain('text-black')
    })
  })

  describe('4. SIGN OUT Item & Functionality Requirements', () => {
    it('is positioned below HELP & SUPPORT', () => {
      const helpIndex = headerContent.indexOf('HELP & SUPPORT')
      const signOutIndex = headerContent.indexOf('SIGN OUT')

      expect(helpIndex).toBeGreaterThan(-1)
      expect(signOutIndex).toBeGreaterThan(-1)
      expect(signOutIndex).toBeGreaterThan(helpIndex)
    })

    it('is conditionally rendered only for logged-in users', () => {
      expect(headerContent).toContain('{mounted && authUser && (')
      const signOutSection = headerContent.slice(
        headerContent.indexOf('{mounted && authUser && ('),
        headerContent.indexOf('<span>{signingOut ? \'SIGNING OUT...\' : \'SIGN OUT\'}</span>')
      )
      expect(signOutSection).toContain('onClick={handleSignOut}')
      expect(signOutSection).toContain('disabled={signingOut}')
      expect(signOutSection).toContain('<LogOut size={16} className="mr-3 shrink-0" />')
    })

    it('implements complete sign-out flow: client Supabase signOut, server session clear, cache clear, redirect, and loading state', () => {
      expect(headerContent).toContain('const handleSignOut = async () =>')
      // 1. Client Supabase signOut
      expect(headerContent).toContain('await supabase.auth.signOut()')
      // 2. Server session invalidation
      expect(headerContent).toContain("fetch('/api/auth/session'")
      expect(headerContent).toContain("action: 'logout'")
      // 3. Clear auth store
      expect(headerContent).toContain('useAuthStore.getState().clearUser()')
      // 4. Close mobile menu
      expect(headerContent).toContain('setMobileMenuOpen(false)')
      // 5. Redirect to homepage
      expect(headerContent).toContain("router.push('/')")
      expect(headerContent).toContain('router.refresh()')
      // 6. Loading state & error handling
      expect(headerContent).toContain('setSigningOut(true)')
      expect(headerContent).toContain('setSigningOut(false)')
      expect(headerContent).toContain("toast.error('Failed to sign out. Please try again.')")
    })
  })

  describe('5. Preservation of Existing Features', () => {
    it('preserves mobile logo, hamburger, search and cart button dimensions', () => {
      expect(headerContent).toContain('grid grid-cols-3 items-center h-[60px]')
      expect(headerContent).toContain('relative w-[80px] h-[44px]')
      expect(headerContent).toContain('<Menu size={24} />')
      expect(headerContent).toContain('<Search size={20} strokeWidth={2} />')
      expect(headerContent).toContain('<ShoppingBag size={20} strokeWidth={2} />')
    })

    it('preserves Wishlist and Track Order in mobile drawer', () => {
      expect(headerContent).toContain('href="/wishlist"')
      expect(headerContent).toContain('href="/track-order"')
    })

    it('preserves desktop navbar completely', () => {
      expect(headerContent).toContain('hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8')
      expect(headerContent).toContain('flex items-center justify-between h-20')
    })
  })
})
