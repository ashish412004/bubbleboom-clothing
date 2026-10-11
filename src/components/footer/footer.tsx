'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Truck,
  RefreshCw,
  Plus,
  Minus,
  Mail,
  Check,
} from 'lucide-react'

const SUPPORT_EMAIL = 'bubbleboomstore2026@gmail.com'

const SHOP_LINKS = [
  { href: '/shop', label: 'Shop All' },
  { href: '/shop?sort=newest', label: 'New Arrivals' },
  { href: '/shop?category=men', label: 'Men' },
  { href: '/shop?category=women', label: 'Women' },
  { href: '/shop?category=footwear', label: 'Footwear' },
  { href: '/collections', label: 'Collections' },
  { href: '/shop?sale=true', label: 'Sale & Offers', highlight: true },
]

const CUSTOMER_CARE_LINKS = [
  { href: '/contact', label: 'Contact Us' },
  { href: '/track-order', label: 'Order Tracking' },
  { href: '/size-guide', label: 'Size Guide' },
  { href: '/shipping-policy', label: 'Shipping Policy' },
  { href: '/returns-refunds', label: 'Returns & Refunds' },
]

const LEGAL_LINKS = [
  { href: '/about', label: 'About Bubble Boom' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
]

function ShopLinksList() {
  return (
    <ul className="space-y-2 text-xs text-neutral-400">
      {SHOP_LINKS.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className={`hover:text-white transition-colors block py-0.5 ${
              link.highlight ? 'font-bold text-neutral-300' : ''
            }`}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function CustomerCareLinksList() {
  return (
    <ul className="space-y-2 text-xs text-neutral-400">
      {CUSTOMER_CARE_LINKS.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="hover:text-white transition-colors block py-0.5">
            {link.label}
          </Link>
        </li>
      ))}
      <li className="pt-1">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-mono text-[11px] text-neutral-400 hover:text-white transition-colors break-all block py-0.5"
        >
          {SUPPORT_EMAIL}
        </a>
      </li>
    </ul>
  )
}

function LegalLinksList() {
  return (
    <ul className="space-y-2 text-xs text-neutral-400">
      {LEGAL_LINKS.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="hover:text-white transition-colors block py-0.5">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

type NewsletterSubState = 'idle' | 'subscribing' | 'pending' | 'active' | 'unsubscribed'

export function Footer() {
  const [email, setEmail] = useState('')
  const [subState, setSubState] = useState<NewsletterSubState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [userIsAuthenticated, setUserIsAuthenticated] = useState(false)

  // Accordion state for mobile view - all collapsed by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    shop: false,
    care: false,
    legal: false,
  })

  // Check authenticated subscriber status on mount
  useEffect(() => {
    let isMounted = true

    async function checkStatus() {
      try {
        const res = await fetch('/api/newsletter/status')
        if (!res.ok) return
        const data = await res.json()
        if (!isMounted) return

        if (data.authenticated) {
          setUserIsAuthenticated(true)
          if (data.email) {
            setEmail(data.email)
          }
          if (data.status === 'active') {
            setSubState('active')
          } else if (data.status === 'pending') {
            setSubState('pending')
            setInfoMessage('Check your email for the confirmation link to activate your subscription.')
          } else if (data.status === 'unsubscribed') {
            setSubState('unsubscribed')
          }
        }
      } catch {
        // Non-blocking
      }
    }

    checkStatus()
    return () => {
      isMounted = false
    }
  }, [])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.')
      setInfoMessage('')
      return
    }

    setSubState('subscribing')
    setErrorMessage('')
    setInfoMessage('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, source: 'storefront_footer' }),
      })
      const data = await res.json()

      if (res.ok) {
        if (data.alreadyActive) {
          setSubState('active')
          setInfoMessage("You're already subscribed to the Boom Squad!")
        } else {
          setSubState('pending')
          setInfoMessage(data.message || 'Check your email to confirm your subscription!')
        }
      } else {
        setSubState('idle')
        setErrorMessage(data.error || 'Failed to subscribe. Please try again.')
      }
    } catch {
      setSubState('idle')
      setErrorMessage('Unable to connect to the server. Please check your network and try again.')
    }
  }

  const handleUnsubscribe = async () => {
    if (isUnsubscribing) return
    setIsUnsubscribing(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        if (userIsAuthenticated) {
          setSubState('unsubscribed')
          setInfoMessage('You have unsubscribed from the Boom Squad newsletter.')
        } else {
          // Guest request: verification link sent
          setInfoMessage(data.message || 'If subscribed, an unsubscribe link has been sent to your inbox.')
        }
      } else {
        setErrorMessage(data.error || 'Unable to process unsubscribe request.')
      }
    } catch {
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsUnsubscribing(false)
    }
  }

  return (
    <footer className="bg-black text-white border-t border-neutral-900 mt-auto">
      {/* 1. Value Props Strip (Shipping, Returns, Secure Payments) */}
      <div className="border-b border-neutral-900 bg-neutral-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Truck size={18} className="text-white shrink-0" />
              <div>
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">
                  Fast All-India Shipping
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Free delivery on orders above ₹1,499
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3">
              <RefreshCw size={18} className="text-white shrink-0" />
              <div>
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">
                  7-Day Easy Returns
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Hassle-free reverse pickup for eligible items
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3">
              <ShieldCheck size={18} className="text-white shrink-0" />
              <div>
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">
                  100% Secure Payments
                </h4>
                <p className="text-[11px] text-neutral-400">
                  UPI, Cards, NetBanking &amp; Verified COD
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* 2. Desktop & Tablet Four-Column Layout (md:grid) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1 – Brand */}
          <div className="space-y-3.5">
            <Link href="/" className="inline-block relative h-8 w-40">
              <Image
                src="/images/brand/bubble-boom-logo-white.png"
                alt="BUBBLE BOOM"
                fill
                sizes="160px"
                className="object-contain object-left"
              />
            </Link>
            <p className="text-xs uppercase tracking-widest font-bold text-neutral-300">
              YOUR STYLE. YOUR RULES.
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs">
              Premium streetwear. Made to stand out.
            </p>
            <div className="pt-1">
              <Link
                href="/track-order"
                className="inline-flex items-center text-xs uppercase tracking-wider font-bold border border-neutral-700 px-4 py-2 hover:bg-white hover:text-black transition-colors"
              >
                Track Your Order
              </Link>
            </div>
          </div>

          {/* Column 2 – Shop */}
          <div>
            <h4 className="text-xs uppercase tracking-widest font-black text-white mb-3.5">
              Shop
            </h4>
            <ShopLinksList />
          </div>

          {/* Column 3 – Customer Care */}
          <div>
            <h4 className="text-xs uppercase tracking-widest font-black text-white mb-3.5">
              Customer Care
            </h4>
            <CustomerCareLinksList />
          </div>

          {/* Column 4 – Legal */}
          <div>
            <h4 className="text-xs uppercase tracking-widest font-black text-white mb-3.5">
              Legal
            </h4>
            <LegalLinksList />
          </div>
        </div>

        {/* 3. Mobile View: Compact Brand + Accordion Menus (md:hidden) */}
        <div className="block md:hidden space-y-6">
          {/* Mobile Brand Section */}
          <div className="space-y-2.5 pb-2 border-b border-neutral-900">
            <Link href="/" className="inline-block relative h-7 w-36">
              <Image
                src="/images/brand/bubble-boom-logo-white.png"
                alt="BUBBLE BOOM"
                fill
                sizes="144px"
                className="object-contain object-left"
              />
            </Link>
            <p className="text-[11px] uppercase tracking-widest font-bold text-neutral-300">
              YOUR STYLE. YOUR RULES.
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Premium streetwear. Made to stand out.
            </p>
            <div className="pt-1">
              <Link
                href="/track-order"
                className="inline-flex items-center text-xs uppercase tracking-wider font-bold border border-neutral-700 px-4 py-2 hover:bg-white hover:text-black transition-colors"
              >
                Track Your Order
              </Link>
            </div>
          </div>

          {/* Accordion 1 – SHOP */}
          <div className="border-b border-neutral-900">
            <button
              type="button"
              onClick={() => toggleSection('shop')}
              aria-expanded={openSections.shop}
              aria-controls="footer-shop-menu"
              className="w-full flex items-center justify-between py-3 text-left focus:outline-none"
            >
              <span className="text-xs uppercase tracking-widest font-black text-white">
                Shop
              </span>
              {openSections.shop ? (
                <Minus size={14} className="text-neutral-400" />
              ) : (
                <Plus size={14} className="text-neutral-400" />
              )}
            </button>
            <div
              id="footer-shop-menu"
              className={`transition-all duration-200 overflow-hidden ${
                openSections.shop ? 'max-h-80 pb-3 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pl-1">
                <ShopLinksList />
              </div>
            </div>
          </div>

          {/* Accordion 2 – CUSTOMER CARE */}
          <div className="border-b border-neutral-900">
            <button
              type="button"
              onClick={() => toggleSection('care')}
              aria-expanded={openSections.care}
              aria-controls="footer-care-menu"
              className="w-full flex items-center justify-between py-3 text-left focus:outline-none"
            >
              <span className="text-xs uppercase tracking-widest font-black text-white">
                Customer Care
              </span>
              {openSections.care ? (
                <Minus size={14} className="text-neutral-400" />
              ) : (
                <Plus size={14} className="text-neutral-400" />
              )}
            </button>
            <div
              id="footer-care-menu"
              className={`transition-all duration-200 overflow-hidden ${
                openSections.care ? 'max-h-80 pb-3 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pl-1">
                <CustomerCareLinksList />
              </div>
            </div>
          </div>

          {/* Accordion 3 – LEGAL */}
          <div className="border-b border-neutral-900">
            <button
              type="button"
              onClick={() => toggleSection('legal')}
              aria-expanded={openSections.legal}
              aria-controls="footer-legal-menu"
              className="w-full flex items-center justify-between py-3 text-left focus:outline-none"
            >
              <span className="text-xs uppercase tracking-widest font-black text-white">
                Legal
              </span>
              {openSections.legal ? (
                <Minus size={14} className="text-neutral-400" />
              ) : (
                <Plus size={14} className="text-neutral-400" />
              )}
            </button>
            <div
              id="footer-legal-menu"
              className={`transition-all duration-200 overflow-hidden ${
                openSections.legal ? 'max-h-48 pb-3 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pl-1">
                <LegalLinksList />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Newsletter Subscribe Section */}
        <div className="mt-10 sm:mt-12 pt-8 sm:pt-10 border-t border-neutral-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-black tracking-tight uppercase text-white">
                Join the Boom Squad
              </h4>
              <p className="text-xs text-neutral-400">
                Get new arrivals and offers by email. Unsubscribe anytime.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              {subState === 'active' ? (
                /* Subscribed Active State */
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-4 py-2.5 text-xs text-white">
                    <span className="font-mono text-neutral-300 truncate max-w-[200px]">{email}</span>
                  </div>
                  <div className="inline-flex items-center justify-center gap-1.5 bg-white text-black px-5 py-2.5 text-xs uppercase tracking-widest font-black shrink-0 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">
                    <Check size={14} className="stroke-[3]" />
                    <span>SUBSCRIBED</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnsubscribe}
                    disabled={isUnsubscribing}
                    className="text-[11px] text-neutral-400 hover:text-white underline underline-offset-4 font-mono transition-colors text-center sm:text-left px-1 py-1"
                  >
                    {isUnsubscribing ? 'Processing...' : 'Unsubscribe'}
                  </button>
                </div>
              ) : subState === 'pending' ? (
                /* Double Opt-In Pending State */
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-4 py-2.5 text-xs text-white">
                    <Mail size={13} className="text-neutral-400 shrink-0" />
                    <span className="font-mono text-neutral-300 truncate max-w-[200px]">{email}</span>
                  </div>
                  <div className="inline-flex items-center justify-center gap-1.5 bg-neutral-200 text-black px-4 py-2.5 text-xs uppercase tracking-widest font-black shrink-0">
                    <span>CHECK YOUR EMAIL</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSubState('idle')
                      setInfoMessage('')
                      setErrorMessage('')
                    }}
                    className="text-[11px] text-neutral-400 hover:text-white underline underline-offset-4 font-mono transition-colors text-center sm:text-left px-1 py-1"
                  >
                    Use different email
                  </button>
                </div>
              ) : (
                /* Idle or Subscribing State */
                <form
                  onSubmit={handleSubscribe}
                  className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:min-w-[380px]"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={subState === 'subscribing'}
                    className="bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 px-4 py-2.5 text-xs flex-grow focus:outline-none focus:border-white transition-colors disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={subState === 'subscribing'}
                    className="bg-white text-black hover:bg-neutral-200 px-5 py-2.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                  >
                    <span>{subState === 'subscribing' ? 'SUBSCRIBING...' : 'SUBSCRIBE'}</span>
                    <ArrowRight size={13} className="ml-1.5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {infoMessage && (
            <div className="mt-3 text-xs flex items-center text-white bg-neutral-950 p-2.5 border border-neutral-800">
              <CheckCircle2 size={15} className="text-white mr-2 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 text-xs flex items-center text-neutral-300 bg-neutral-950 p-2.5 border border-neutral-800">
              <AlertCircle size={15} className="text-neutral-400 mr-2 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {subState === 'unsubscribed' && !infoMessage && (
            <div className="mt-3 text-xs flex items-center justify-between text-neutral-400 bg-neutral-950 p-2.5 border border-neutral-800">
              <div className="flex items-center">
                <AlertCircle size={15} className="text-neutral-400 mr-2 shrink-0" />
                <span>YOU HAVE UNSUBSCRIBED FROM MARKETING EMAILS.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubState('idle')
                  setEmail('')
                }}
                className="text-[11px] uppercase font-bold text-white underline underline-offset-2 ml-3"
              >
                Re-subscribe
              </button>
            </div>
          )}
        </div>

        {/* 5. Footer Bottom Bar */}
        <div className="mt-10 sm:mt-12 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} BUBBLE BOOM. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wider text-neutral-400">
            <span>UPI</span>
            <span>•</span>
            <span>Cards</span>
            <span>•</span>
            <span>Net Banking</span>
            <span>•</span>
            <span>COD Available</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
