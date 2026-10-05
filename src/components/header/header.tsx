'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search, User, Heart, ShoppingBag, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/lib/cart-store'

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

  useEffect(() => {
    setMounted(true)
  }, [])

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
      {/* Configurable Announcement Bar */}
      {announcementText && (
        <div className="bg-black text-white text-xs sm:text-sm font-medium tracking-wider text-center py-2 px-4 uppercase transition-colors">
          {announcementLink ? (
            <Link href={announcementLink} className="hover:underline">
              {announcementText}
            </Link>
          ) : (
            <span>{announcementText}</span>
          )}
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Mobile Menu Trigger */}
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
              <div className="relative h-9 sm:h-11 w-36 sm:w-44 transition-transform group-hover:scale-[1.02]">
                <Image
                  src="/images/brand/bubble-boom-logo-black.png"
                  alt="BUBBLE BOOM"
                  fill
                  priority
                  className="object-contain object-left"
                  sizes="(max-width: 640px) 150px, 180px"
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
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm focus:outline-none focus:ring-1 focus:ring-black"
              aria-label="Search catalog"
            >
              <Search size={20} strokeWidth={2} />
            </Link>

            <Link
              href="/account"
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm focus:outline-none focus:ring-1 focus:ring-black hidden sm:inline-flex"
              aria-label="Customer account"
            >
              <User size={20} strokeWidth={2} />
            </Link>

            <Link
              href="/wishlist"
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm relative focus:outline-none focus:ring-1 focus:ring-black hidden sm:inline-flex"
              aria-label="View wishlist"
            >
              <Heart size={20} strokeWidth={2} />
              {mounted && wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="p-2 text-black hover:bg-neutral-100 transition-colors rounded-sm relative focus:outline-none focus:ring-1 focus:ring-black"
              aria-label="View shopping bag"
            >
              <ShoppingBag size={20} strokeWidth={2} />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
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
                  href="/collections"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm uppercase tracking-widest font-bold text-black hover:text-neutral-500 py-1"
                >
                  Collections
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
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center text-xs uppercase tracking-wider font-semibold text-black hover:text-neutral-600 py-1"
              >
                <User size={16} className="mr-3" />
                My Account
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
