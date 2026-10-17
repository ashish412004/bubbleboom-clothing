'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Package, MapPin, Heart, Shield, LogOut, Phone } from 'lucide-react'

export interface UserProfileSummary {
  id?: string
  name?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
}

interface AccountNavProps {
  user?: UserProfileSummary | null
}

const NAV_ITEMS = [
  { href: '/account', label: 'My Profile', icon: User },
  { href: '/account/addresses', label: 'My Addresses', icon: MapPin },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/saved-drops', label: 'Saved Drops', icon: Heart },
  { href: '/account/profile', label: 'Profile & Security', icon: Shield },
]

export function getCustomerInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'BB'
}

export function AccountNav({ user: propUser }: AccountNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const resetCartAndWishlist = useCartStore((s) => s.resetCartAndWishlist)
  const authStoreUser = useAuthStore((s) => s.user)

  const [activeUser, setActiveUser] = useState<UserProfileSummary | null>(propUser || null)

  useEffect(() => {
    if (propUser) {
      setActiveUser(propUser)
      return
    }

    if (authStoreUser) {
      setActiveUser({
        id: authStoreUser.id,
        name: authStoreUser.name || (authStoreUser as any).full_name,
        email: authStoreUser.email,
        phone: (authStoreUser as any).phone,
      })
      return
    }

    // Client-side session fetch fallback
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setActiveUser({
              id: data.user.id,
              name: data.user.full_name || data.user.name,
              email: data.user.email,
              phone: data.user.phone,
            })
          }
        }
      } catch {}
    }
    fetchSession()
  }, [propUser, authStoreUser])

  const displayName = activeUser?.name || activeUser?.full_name || (activeUser?.email ? activeUser.email.split('@')[0] : 'Bubble Boom Member')
  const email = activeUser?.email || ''
  const phone = activeUser?.phone || null
  const initials = getCustomerInitials(displayName, email)

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
    <div className="w-full space-y-4">
      {/* 1. Mobile View (< 768px): Header Card + Scrollable Tabs */}
      <div className="md:hidden space-y-3">
        {/* Mobile Customer Profile Card */}
        <div className="bg-white rounded-xl p-3.5 border border-neutral-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs text-black truncate leading-tight">
              {displayName}
            </h3>
            {email && (
              <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                {email}
              </p>
            )}
            {phone && (
              <p className="text-[10px] text-neutral-600 truncate mt-0.5 flex items-center gap-1 font-mono">
                <Phone className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                <span>{phone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tabs */}
        <nav
          aria-label="Account Mobile Tabs"
          className="md:hidden flex items-center gap-2 overflow-x-auto py-2 px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-neutral-200/80"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item.href)

            return (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap rounded-xl border ${
                  active
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-neutral-800 border-neutral-200 hover:border-black hover:text-black'
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
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 bg-white border border-neutral-200 hover:text-black hover:border-black transition-all whitespace-nowrap rounded-xl cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>

      {/* 2. Desktop View (>= 768px): Profile Card + Vertical Nav */}
      <div className="hidden md:block space-y-4">
        {/* Phase 2: Left Profile Information Card */}
        <div className="bg-white rounded-xl p-4 border border-neutral-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm tracking-wider shrink-0 shadow-xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-black truncate leading-tight" title={displayName}>
              {displayName}
            </h3>
            {email && (
              <p className="text-xs text-neutral-500 truncate mt-0.5" title={email}>
                {email}
              </p>
            )}
            {phone && (
              <p className="text-[11px] font-mono text-neutral-600 truncate mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>{phone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Phase 3: Desktop Navigation Sidebar */}
        <nav
          aria-label="Account Desktop Navigation"
          className="hidden md:block bg-white rounded-xl border border-neutral-200/80 p-2 space-y-1 shadow-2xs"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item.href)

            return (
              <Link
                key={`desktop-${item.href}`}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider font-bold rounded-xl transition-all ${
                  active
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-neutral-800 hover:bg-neutral-100 hover:text-black'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-neutral-700'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <div className="pt-2 mt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider font-bold text-neutral-500 hover:bg-neutral-100 hover:text-black rounded-xl transition-all text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0 text-neutral-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
