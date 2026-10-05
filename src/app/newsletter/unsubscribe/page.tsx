'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const initialStatus = searchParams.get('status')
  const emailParam = searchParams.get('email')

  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'confirm_prompt' | 'error'
    message: string
    email?: string
  }>(() => {
    if (initialStatus === 'success') {
      return {
        status: 'success',
        message: 'You have been unsubscribed from promotional marketing emails.',
        email: emailParam || undefined,
      }
    }
    if (initialStatus === 'invalid') {
      return {
        status: 'error',
        message: 'This unsubscribe link is invalid or has expired.',
      }
    }
    return {
      status: token ? 'confirm_prompt' : 'error',
      message: token ? 'Are you sure you want to unsubscribe?' : 'No unsubscribe token provided.',
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirmUnsubscribe = async () => {
    if (!token) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setState({
          status: 'success',
          message: data.message || 'You have successfully unsubscribed from the Boom Squad newsletter.',
          email: data.email,
        })
      } else {
        setState({
          status: 'error',
          message: data.error || 'Failed to process unsubscribe request.',
        })
      }
    } catch {
      setState({
        status: 'error',
        message: 'Unable to connect to the server. Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border-2 border-black p-8 md:p-10 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {state.status === 'confirm_prompt' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-neutral-100 text-black flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-neutral-200 text-black px-2 py-0.5 font-bold">
                Email Preferences
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight mt-3">
                Unsubscribe From Newsletter
              </h1>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              You will stop receiving marketing newsletters, new drops, and promotional offers.
            </p>
            <div className="p-3 bg-neutral-50 border border-neutral-200 text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <p className="text-[11px] text-neutral-700 leading-tight">
                <strong>Essential notifications preserved:</strong> You will still receive transactional emails like order confirmations and password resets.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleConfirmUnsubscribe}
                disabled={isSubmitting}
                className="w-full bg-black text-white hover:bg-neutral-800 py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Unsubscribing...
                  </>
                ) : (
                  'Confirm Unsubscribe'
                )}
              </button>
              <Link
                href="/"
                className="w-full border border-black py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-50 transition-colors inline-block"
              >
                Never Mind, Stay Subscribed
              </Link>
            </div>
          </div>
        )}

        {state.status === 'success' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-black text-white flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
                Unsubscribed
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight mt-3">
                You've Been Unsubscribed
              </h1>
              {state.email && (
                <p className="text-xs font-mono text-neutral-600 mt-1 break-all">
                  {state.email}
                </p>
              )}
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              You will no longer receive marketing emails from Bubble Boom. Order receipts and shipping notifications will remain unaffected.
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

        {state.status === 'error' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-neutral-200 text-black flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-neutral-200 text-black px-2 py-0.5 font-bold">
                Request Error
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight mt-3">
                Unable to Unsubscribe
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
                <span>Return to Homepage</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
