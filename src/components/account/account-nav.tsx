'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Package, MapPin, Heart, Shield, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/account', label: 'Overview', icon: User },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/addresses', label: 'Saved Addresses', icon: MapPin },
  { href: '/account/saved-drops', label: 'Saved Drops', icon: Heart },
  { href: '/account/profile', label: 'Profile & Security', icon: Shield },
]

export function AccountNav() {
  const pathname = usePathname()
  const router = useRouter()
  const resetCartAndWishlist = useCartStore((s) => s.resetCartAndWishlist)

  const handleSignOut = async () => {
    try {
      // 1. Supabase Auth signOut on client if configured
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
        } catch {}
      }

      // 2. Clear server session cookie
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })

      // 3. Clear client-side cached auth and cart/wishlist state
      const { useAuthStore } = await import('@/lib/auth-store')
      useAuthStore.getState().clearUser()
      resetCartAndWishlist()

      toast.success('Signed out successfully')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Failed to sign out. Please try again.')
    }
  }

  // Check if an item is active - ensures strictly ONE active item at a time
  const isItemActive = (href: string) => {
    if (href === '/account') {
      return pathname === '/account'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* 1. Mobile Navigation Tabs (< 768px): Compact Horizontally Scrollable Row */}
      <nav
        aria-label="Account Mobile Tabs"
        className="md:hidden flex items-center gap-2 overflow-x-auto py-2 px-1 mb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-neutral-200"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isItemActive(item.href)

          return (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-bold transition-colors whitespace-nowrap border ${
                active
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:border-black hover:text-black'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 bg-white border border-neutral-200 hover:text-black hover:border-black transition-colors whitespace-nowrap cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* 2. Desktop Navigation Sidebar (>= 768px): Vertical List with Sharp Monochrome Theme */}
      <nav aria-label="Account Desktop Navigation" className="hidden md:block border border-black bg-white p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isItemActive(item.href)

          return (
            <Link
              key={`desktop-${item.href}`}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider font-bold transition-colors ${
                active
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-white text-black hover:bg-neutral-100 hover:text-black border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-black'}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider font-bold text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors border-t border-neutral-200 mt-2 pt-3 text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0 text-neutral-500 hover:text-black" />
          <span>Sign Out</span>
        </button>
      </nav>
    </>
  )
}
