'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { User, Package, MapPin, Heart, Shield, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/account', label: 'Overview', icon: User },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/addresses', label: 'Saved Addresses', icon: MapPin },
  { href: '/wishlist', label: 'Saved Drops', icon: Heart },
  { href: '/account/profile', label: 'Profile & Security', icon: Shield },
]

export function AccountNav() {
  const pathname = usePathname()
  const router = useRouter()
  const resetCart = useCartStore((s) => s.refreshCart)

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      await resetCart()
      toast.success('Signed out')
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <nav className="border border-black bg-white p-2 space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider font-bold transition-colors ${
              isActive
                ? 'bg-black text-white'
                : 'text-neutral-700 hover:bg-neutral-100 hover:text-black'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}

      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider font-bold text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors border-t border-neutral-200 mt-2 pt-3 text-left"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>Sign Out</span>
      </button>
    </nav>
  )
}
