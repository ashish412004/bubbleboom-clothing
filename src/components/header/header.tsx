'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search, User, Heart, ShoppingBag, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import { useSearchStore } from '@/lib/search-store'

interface HeaderProps {
  announcementText?: string
  announcementLink?: string
}

export function Header({
  announcementText = 'FREE SHIPPING ON ALL ORDERS ABOVE ₹1,499 | WEAR THE BOOM',
  announcementLink = '/shop',
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const itemCount = useCartStore((state) => state.itemCount)
  const wishlistCount = useCartStore((state) => state.wishlistCount)
  const openCartDrawer = useCartStore((state) => state.openCartDrawer)
  const openSearch = useSearchStore((state) => state.openSearch)
  const authUser = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const refreshWishlist = useCartStore((state) => state.refreshWishlist)
  const refreshCart = useCartStore((state) => state.refreshCart)

  useEffect(() => {
    setMounted(true)
    refreshUser()
    refreshWishlist()
    refreshCart()
  }, [refreshUser, refreshWishlist, refreshCart])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
      {/* Informational Announcement Bar (Non-clickable, informational display only) */}
      {announcementText && (
        <div className="bg-black text-white text-xs sm:text-sm font-medium tracking-wider text-center uppercase select-none cursor-default overflow-hidden h-[30px] md:h-auto md:py-2 px-4 flex items-center justify-center relative group"
          role="region"
          aria-label="Announcement"
        >
          {/* Accessible single announcement for screen readers */}
          <p className="sr-only" aria-live="polite">
            {announcementText}
          </p>

          {/* Visual Presentation */}
          <div aria-hidden="true" className="w-full flex items-center justify-center overflow-hidden">
            {/* Desktop / tablet display (>= 640px): Centered static single line */}
            <div className="hidden sm:flex items-center justify-center w-full">
              <p className="m-0 leading-normal text-xs sm:text-sm font-medium tracking-wider text-center uppercase whitespace-nowrap">
                {announcementText}
              </p>
            </div>

            {/* Mobile display (< 640px): Slim 30px bar with seamless ticker marquee */}
            <div className="sm:hidden flex items-center w-full overflow-hidden">
              <div className="announcement-ticker-track flex items-center whitespace-nowrap group-hover:[animation-play-state:paused]">
                <div className="announcement-ticker-item flex items-center shrink-0">
                  <span className="inline-block px-6 text-[11px] tracking-wider leading-none">
                    {announcementText}
                  </span>
                </div>
                <div className="announcement-ticker-item flex items-center shrink-0">
                  <span className="inline-block px-6 text-[11px] tracking-wider leading-none">
                    {announcementText}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      {/* 1. Mobile Navigation Bar (< 768px): 60px height, centered 80px logo, 3-column grid */}
      <div className="md:hidden max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-3 items-center h-[60px]">
          {/* LEFT: Hamburger Menu */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              className="w-11 h-11 -ml-2 flex items-center justify-center text-black hover:bg-neutral-100 transition-colors rounded-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={24} />
            </button>
          </div>

          {/* CENTER: Bubble Boom Logo (80px width, mathematically centered in viewport) */}
          <div className="flex items-center justify-center">
            <Link href="/" className="flex items-center justify-center py-1 group" aria-label="Bubble Boom Home">
              <div className="relative w-[80px] h-[44px] transition-transform group-hover:scale-[1.02]">
                <Image
                  src="/images/brand/bubble-boom-logo-black.png"
                  alt="BUBBLE BOOM"
                  fill
                  priority
                  className="object-contain object-center"
                  sizes="80px"
                />
              </div>
            </Link>
          </div>

          {/* RIGHT: Search & Cart */}
          <div className="flex items-center justify-end space-x-1">
            <Link
              href="/search"
              className="w-11 h-11 flex items-center justify-center text-black hover:bg-neutral-100 transition-colors rounded-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                openSearch()
              }}
              aria-label="Search catalog"
            >
              <Search size={20} strokeWidth={2} />
            </Link>

            <button
              type="button"
              onClick={openCartDrawer}
              className="w-11 h-11 flex items-center justify-center text-black hover:bg-neutral-100 transition-colors rounded-sm relative focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              aria-label="View shopping bag"
            >
              <ShoppingBag size={20} strokeWidth={2} />
              {mounted && itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#DC2626] text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center ring-2 ring-white pointer-events-none">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Desktop Navigation Bar (>= 768px): Completely preserved height, logo, links, & icons */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile/Tablet Menu Trigger for intermediate tablet screens (< lg) */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              className="p-2 -ml-2 text-black hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-1 focus:ring-black"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Bubble Boom Logo linking Home */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center py-1 group" aria-label="Bubble Boom Home">
              <div className="relative h-11 w-44 transition-transform group-hover:scale-[1.02]">
                <Image
                  src="/images/brand/bubble-boom-logo-black.png"
                  alt="BUBBLE BOOM"
                  fill
                  priority
                  className="object-contain object-left"
                  sizes="180px"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-7" aria-label="Main Navigation">
            <Link
              href="/shop"
              className="text-xs uppercase tracking-widest font-semibold text-black hover:text-neutral-500 transition-colors py-2 border-b-2 border-transparent hover:border-black"
            >
              Shop All
            </Link>
            <Link
              href="/shop?sort=newest"
              className="text-xs uppercase tracking-widest font-semibold text-black hover:text-neutral-500 transition-colors py-2 border-b-2 border-transparent hover:border-black"
            >
              New Arrivals
            </Link>
            <Link
              href="/shop?category=men"
              className="text-xs uppercase tracking-widest font-semibold text-black hover:text-neutral-500 transition-colors py-2 border-b-2 border-transparent hover:border-black"
            >
              Men
            </Link>
            <Link
              href="/shop?category=women"
              className="text-xs uppercase tracking-widest font-semibold text-black hover:text-neutral-500 transition-colors py-2 border-b-2 border-transparent hover:border-black"
            >
              Women
            </Link>
            <Link
              href="/shop?category=footwear"
              className="text-xs uppercase tracking-widest font-semibold text-black hover:text-neutral-500 transition-colors py-2 border-b-2 border-transparent hover:border-black"
            >
              Footwear
            </Link>
            <Link
              href="/collections"
              className="text-xs uppercase tracking-widest font-semibold text-black hover:text-neutral-500 transition-colors py-2 border-b-2 border-transparent hover:border-black"
            >
              Collections
            </Link>
            <Link
              href="/shop?sale=true"
              className="text-xs uppercase tracking-widest font-bold text-black hover:text-neutral-500 transition-colors py-2 border-b-2 border-transparent hover:border-black"
            >
              Sale
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/search"
              onClick={(e) => {
                e.preventDefault()
                openSearch()
              }}
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              aria-label="Search catalog"
            >
              <Search size={20} strokeWidth={2} />
            </Link>

            <Link
              href={mounted && authUser ? '/account' : '/login'}
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm focus:outline-none focus:ring-1 focus:ring-black inline-flex items-center gap-1.5"
              aria-label={mounted && authUser ? `Account (${authUser.name})` : 'Customer account'}
            >
              <div className="relative flex items-center justify-center">
                <User size={20} strokeWidth={2} />
                {mounted && authUser && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black rounded-full ring-2 ring-white" />
                )}
              </div>
              {mounted && authUser && (
                <span className="text-[11px] uppercase tracking-wider font-extrabold max-w-[85px] truncate hidden md:inline">
                  {authUser.name ? authUser.name.split(' ')[0] : 'Account'}
                </span>
              )}
            </Link>

            <Link
              href="/wishlist"
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm relative focus:outline-none focus:ring-1 focus:ring-black inline-flex"
              aria-label="View wishlist"
            >
              <Heart size={20} strokeWidth={2} className={mounted && wishlistCount > 0 ? 'text-[#DC2626]' : 'text-black'} />
              {mounted && wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#DC2626] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-1 ring-white">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={openCartDrawer}
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm relative focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              aria-label="View shopping bag"
            >
              <ShoppingBag size={20} strokeWidth={2} />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl flex flex-col justify-between z-10 p-6 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
                <div className="relative h-8 w-32">
                  <Image
                    src="/images/brand/bubble-boom-logo-black.png"
                    alt="BUBBLE BOOM"
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <button
                  type="button"
                  className="p-2 text-black hover:bg-neutral-100 rounded-sm focus:outline-none focus:ring-1 focus:ring-black"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="py-6 space-y-4">
                <Link
                  href="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  Shop All
                </Link>
                <Link
                  href="/shop?sort=newest"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  New Arrivals
                </Link>
                <Link
                  href="/shop?category=men"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  Men
                </Link>
                <Link
                  href="/shop?category=women"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  Women
                </Link>
                <Link
                  href="/shop?category=footwear"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  Footwear
                </Link>
                <Link
                  href="/collections"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  Collections
                </Link>
                <Link
                  href="/categories"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  Categories
                </Link>
                <Link
                  href="/shop?sale=true"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-extrabold text-black hover:text-neutral-500 py-1"
                >
                  Sale
                </Link>
              </nav>
            </div>

            {/* Mobile Footer Links */}
            <div className="pt-6 border-t border-neutral-200 space-y-3">
              <Link
                href={mounted && authUser ? '/account' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center text-xs uppercase tracking-wider font-semibold text-black hover:text-neutral-600 py-1"
              >
                <div className="relative mr-3 flex items-center justify-center">
                  <User size={16} />
                  {mounted && authUser && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full ring-1 ring-white" />
                  )}
                </div>
                <span>
                  {mounted && authUser
                    ? `My Account (${authUser.name ? authUser.name.split(' ')[0] : 'Member'})`
                    : 'My Account'}
                </span>
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center text-xs uppercase tracking-wider font-semibold text-black hover:text-neutral-600 py-1"
              >
                <Heart size={16} className="mr-3" />
                Wishlist {mounted && wishlistCount > 0 && `(${wishlistCount})`}
              </Link>
              <Link
                href="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center text-xs uppercase tracking-wider font-semibold text-black hover:text-neutral-600 py-1"
              >
                Track Order
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
