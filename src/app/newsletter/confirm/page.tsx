'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Loader2 } from 'lucide-react'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const initialStatus = searchParams.get('status')
  const emailParam = searchParams.get('email')

  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'expired' | 'invalid'
    message: string
    email?: string
  }>(() => {
    if (initialStatus === 'success') {
      return {
        status: 'success',
        message: "You're officially part of the Boom Squad! Subscription confirmed.",
        email: emailParam || undefined,
      }
    }
    if (initialStatus === 'expired') {
      return {
        status: 'expired',
        message: 'This confirmation link has expired (24-hour limit). Please subscribe again.',
      }
    }
    if (initialStatus === 'invalid') {
      return {
        status: 'invalid',
        message: 'This confirmation link is invalid or has already been used.',
      }
    }
    return {
      status: token ? 'loading' : 'invalid',
      message: token ? 'Verifying your subscription...' : 'No confirmation token provided.',
    }
  })

  useEffect(() => {
    if (!token || initialStatus) return

    let isMounted = true

    async function verifyToken() {
      try {
        const res = await fetch('/api/newsletter/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (!isMounted) return

        if (res.ok && data.success) {
          setState({
            status: 'success',
            message: data.message || "You're officially part of the Boom Squad!",
            email: data.email,
          })
        } else if (res.status === 410 || data.expired) {
          setState({
            status: 'expired',
            message: data.error || 'This confirmation link has expired. Please subscribe again.',
          })
        } else {
          setState({
            status: 'invalid',
            message: data.error || 'This confirmation link is invalid or has already been used.',
          })
        }
      } catch {
        if (isMounted) {
          setState({
            status: 'invalid',
            message: 'Unable to verify subscription. Please check your connection and try again.',
          })
        }
      }
    }

    verifyToken()

    return () => {
      isMounted = false
    }
  }, [token, initialStatus])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border-2 border-black p-8 md:p-10 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {state.status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-black" />
            <h1 className="text-xl font-black uppercase tracking-tight">Verifying Subscription</h1>
            <p className="text-xs text-neutral-600 font-mono">Securing your spot in the Boom Squad...</p>
          </div>
        )}

        {state.status === 'success' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-black text-white flex items-center justify-center mx-auto rounded-none">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
                Subscription Confirmed
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight mt-3">
                WELCOME TO THE BOOM SQUAD
              </h1>
              {state.email && (
                <p className="text-xs font-mono text-neutral-600 mt-1 break-all">
                  {state.email}
                </p>
              )}
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              You are now subscribed to receive new arrivals and exclusive offers. You can unsubscribe anytime using the link at the bottom of our emails.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <span>Shop New Drops</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center border border-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        )}

        {state.status === 'expired' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-neutral-200 text-black flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-neutral-200 text-black px-2 py-0.5 font-bold">
                Link Expired
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight mt-3">
                Confirmation Link Expired
              </h1>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              For security, confirmation links expire after 24 hours. Please enter your email in the footer of our store to request a fresh confirmation link.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors w-full"
              >
                <span>Back to Homepage</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {state.status === 'invalid' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-neutral-100 text-black flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-neutral-200 text-black px-2 py-0.5 font-bold">
                Invalid Request
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight mt-3">
                Invalid Confirmation Link
              </h1>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              {state.message}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors w-full"
              >
                <span>Return to Store</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
