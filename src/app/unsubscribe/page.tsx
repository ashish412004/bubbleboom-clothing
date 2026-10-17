'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/marketing/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to unsubscribe.')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-block mb-3">
          <div className="w-10 h-10 relative mx-auto">
            <Image
              src="/images/brand/bubble-boom-icon.png"
              alt="Bubble Boom"
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
        </Link>
        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block">
          BUBBLE BOOM // EMAIL PREFERENCES
        </span>
        <h1 className="text-2xl font-black uppercase tracking-tight mt-1">
          Unsubscribe
        </h1>
        <p className="text-xs text-neutral-600 mt-2">
          Manage your email subscription preferences for promotional campaigns.
        </p>
      </div>

      {success ? (
        <div className="space-y-5 text-center">
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <strong className="block font-bold">Unsubscribed Successfully</strong>
              <span>
                <strong>{email}</strong> has been removed from all marketing and promotional announcements.
              </span>
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 leading-relaxed bg-neutral-50 p-3 border border-neutral-200 text-left">
            <p>
              Note: You will still receive essential transactional emails regarding your orders, shipping status, and security alerts.
            </p>
          </div>

          <Link
            href="https://bubbleboomstore.com"
            className="w-full block bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors text-center"
          >
            Return to Store
          </Link>
        </div>
      ) : (
        <form onSubmit={handleUnsubscribe} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
                className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <p className="text-[11px] text-neutral-500 leading-normal">
            By unsubscribing, you will no longer receive launch announcements, drop notifications, or discount codes. Transactional order emails will remain active.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Processing...' : 'Confirm Unsubscribe'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <Link
              href="https://bubbleboomstore.com"
              className="text-xs text-neutral-600 hover:text-black underline font-mono"
            >
              Cancel and return to store
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-xs font-mono text-neutral-500">Loading...</div>}>
        <UnsubscribeContent />
      </Suspense>
    </div>
  )
}
