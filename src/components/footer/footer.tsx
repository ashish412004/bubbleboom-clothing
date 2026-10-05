'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight, CheckCircle2, ShieldCheck, Truck, RefreshCw } from 'lucide-react'

export function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Subscribed successfully!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to subscribe')
      }
    } catch {
      setStatus('error')
      setMessage('Failed to connect. Please try again.')
    }
  }

  return (
    <footer className="bg-black text-white border-t border-neutral-900 mt-auto">
      {/* Brand Value Props Banner */}
      <div className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <Truck size={22} className="text-neutral-400 shrink-0" />
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold">Fast All-India Shipping</h4>
                <p className="text-xs text-neutral-400">Free delivery on prepaid and COD orders above ₹1,499</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <RefreshCw size={22} className="text-neutral-400 shrink-0" />
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold">7-Day Easy Returns</h4>
                <p className="text-xs text-neutral-400">Hassle-free reverse pickup for eligible items</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <ShieldCheck size={22} className="text-neutral-400 shrink-0" />
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold">100% Secure Payments</h4>
                <p className="text-xs text-neutral-400">Cashfree PG (UPI, Cards, NetBanking) &amp; Verified COD</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Info & Wordmark */}
          <div className="md:col-span-2 space-y-4">
            <div className="relative h-10 w-44">
              <Image
                src="/images/brand/bubble-boom-logo-white.png"
                alt="BUBBLE BOOM"
                fill
                sizes="176px"
                className="object-contain object-left"
              />
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-neutral-300">
              YOUR STYLE. YOUR RULES.
            </p>
            <p className="text-sm text-neutral-400 max-w-sm leading-relaxed">
              Every style. Every mood. Make it yours. Premium Indian fashion crafted for fearless self-expression.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/track-order"
                className="inline-flex items-center text-xs uppercase tracking-wider font-semibold border border-neutral-700 px-4 py-2 hover:bg-white hover:text-black transition-colors w-fit"
              >
                Track Your Order
              </Link>
              <a
                href="mailto:bubbleboomstore2026@gmail.com"
                className="text-xs font-mono text-neutral-400 hover:text-white transition-colors"
              >
                bubbleboomstore2026@gmail.com
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs uppercase tracking-widest font-bold text-white mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm text-neutral-400">
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">
                  Shop All
                </Link>
              </li>
              <li>
                <Link href="/shop?sort=newest" className="hover:text-white transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/shop?category=men" className="hover:text-white transition-colors">
                  Men
                </Link>
              </li>
              <li>
                <Link href="/shop?category=women" className="hover:text-white transition-colors">
                  Women
                </Link>
              </li>
              <li>
                <Link href="/collections" className="hover:text-white transition-colors">
                  Collections
                </Link>
              </li>
              <li>
                <Link href="/shop?sale=true" className="hover:text-white transition-colors font-semibold">
                  Sale &amp; Offers
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="text-xs uppercase tracking-widest font-bold text-white mb-4">Customer Care</h4>
            <ul className="space-y-2.5 text-sm text-neutral-400">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="mailto:bubbleboomstore2026@gmail.com"
                  className="hover:text-white transition-colors text-xs font-mono break-all inline-block"
                >
                  bubbleboomstore2026@gmail.com
                </a>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/size-guide" className="hover:text-white transition-colors">
                  Size Guide
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-white transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/returns-refunds" className="hover:text-white transition-colors">
                  Returns &amp; Refunds
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 className="text-xs uppercase tracking-widest font-bold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-neutral-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Bubble Boom
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-neutral-600 hover:text-neutral-400 transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-14 pt-10 border-t border-neutral-900 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h4 className="text-base font-bold tracking-tight text-white mb-1">
              JOIN THE BOOM SQUAD
            </h4>
            <p className="text-xs text-neutral-400">
              Subscribe to unlock early drop access, private collection previews, and special drops.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 px-4 py-2.5 text-xs flex-grow focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-white text-black hover:bg-neutral-200 px-6 py-2.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              <ArrowRight size={14} className="ml-2" />
            </button>
          </form>
        </div>

        {message && (
          <div
            className={`mt-3 text-xs flex items-center ${
              status === 'success' ? 'text-neutral-300' : 'text-neutral-400'
            }`}
          >
            {status === 'success' && <CheckCircle2 size={14} className="mr-1.5" />}
            {message}
          </div>
        )}

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="mt-14 pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© {new Date().getFullYear()} BUBBLE BOOM. All rights reserved. Indian Brand.</p>
          <div className="flex items-center space-x-4 text-[11px] uppercase tracking-wider text-neutral-400">
            <span>UPI</span>
            <span>•</span>
            <span>Cards</span>
            <span>•</span>
            <span>NetBanking</span>
            <span>•</span>
            <span>COD Available</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
