'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Layers,
  Archive,
  Ticket,
  Sliders,
  RotateCcw,
  Megaphone,
  Settings,
  History,
  Store,
  ExternalLink,
  Mail,
  Menu,
  X,
} from 'lucide-react'

const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders & Shipments', icon: Package },
  { href: '/admin/products', label: 'Product Catalog', icon: Layers },
  { href: '/admin/inventory', label: 'Stock & Inventory', icon: Archive },
  { href: '/admin/categories', label: 'Categories', icon: Sliders },
  { href: '/admin/collections', label: 'Capsule Drops', icon: Layers },
  { href: '/admin/coupons', label: 'Coupons & Promos', icon: Ticket },
  { href: '/admin/subscribers', label: 'Newsletter Squad', icon: Mail },
  { href: '/admin/returns', label: 'Returns Inspection', icon: RotateCcw },
  { href: '/admin/banners', label: 'Announcement Bars', icon: Megaphone },
  { href: '/admin/settings', label: 'Store Settings', icon: Settings },
  { href: '/admin/audit-logs', label: 'Audit Trail', icon: History },
]

function AdminNavLinks({
  pathname,
  onLinkClick,
}: {
  pathname: string
  onLinkClick?: () => void
}) {
  return (
    <>
      {ADMIN_LINKS.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-mono tracking-wider transition-colors min-h-[44px] ${
              isActive
                ? 'bg-white text-black font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}

interface AdminShellProps {
  children: React.ReactNode
  userEmail: string
}

export function AdminShell({ children, userEmail }: AdminShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const handleClose = useCallback(() => {
    setIsMobileOpen(false)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Close drawer on Escape key and lock body scroll while open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose()
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen, handleClose])

  return (
    <div className="flex min-h-screen bg-[#F8F8F6] text-black w-full overflow-x-hidden">
      {/* 1. Desktop Sidebar (Only on large screens: >= 1024px / lg) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col min-h-screen border-r border-neutral-800 bg-black text-white">
        {/* Brand Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative invert">
              <Image
                src="/images/brand/bubble-boom-icon.png"
                alt="Bubble Boom Monogram"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight uppercase">BUBBLE BOOM</div>
              <span className="text-[10px] font-mono tracking-widest text-neutral-400 block uppercase">
                Admin Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <AdminNavLinks pathname={pathname} />
        </nav>

        {/* Live Storefront Link */}
        <div className="p-4 border-t border-neutral-800">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              <span>Live Storefront</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* 2. Mobile Navigation Drawer & Backdrop (< 1024px / lg) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin Navigation Menu">
          {/* Dimmed Backdrop */}
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-black text-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 relative invert">
                  <Image
                    src="/images/brand/bubble-boom-icon.png"
                    alt="Bubble Boom Monogram"
                    fill
                    sizes="28px"
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="text-xs font-black tracking-tight uppercase">BUBBLE BOOM</div>
                  <span className="text-[9px] font-mono tracking-widest text-neutral-400 block uppercase">
                    Admin Terminal
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close navigation menu"
                className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <AdminNavLinks pathname={pathname} onLinkClick={handleClose} />
            </nav>

            {/* Mobile Footer */}
            <div className="p-3 border-t border-neutral-800">
              <Link
                href="/"
                target="_blank"
                onClick={handleClose}
                className="flex items-center justify-between px-3 py-2.5 text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>Live Storefront</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Responsive Header */}
        <header className="bg-white border-b border-black px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button (< 1024px) */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-expanded={isMobileOpen}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 text-black hover:bg-neutral-100 border border-black min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Branding & Sub-labels */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono font-black uppercase tracking-wider truncate sm:hidden">
                BUBBLE BOOM
              </span>
              <span className="hidden sm:inline-block text-xs uppercase font-mono tracking-widest text-neutral-500 font-bold">
                Bubble Boom Ops System
              </span>
              <span className="hidden sm:inline-block text-xs font-mono bg-black text-white px-2 py-0.5 font-bold shrink-0">
                v1.0.0
              </span>
            </div>
          </div>

          {/* User Email Pill */}
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <span className="hidden md:inline-block text-neutral-500">Admin:</span>
            <span className="bg-neutral-100 border border-neutral-300 px-2 py-1 text-[11px] font-mono font-bold max-w-[150px] sm:max-w-[220px] truncate" title={userEmail}>
              {userEmail}
            </span>
          </div>
        </header>

        {/* Page Content: 16px mobile padding (p-4), scaling to sm:p-6 lg:p-8 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
