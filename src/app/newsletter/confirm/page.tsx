'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
  Mail,
  ShieldCheck,
  Send,
} from 'lucide-react'

type ConfirmStatus =
  | 'inspecting'
  | 'ready'
  | 'submitting'
  | 'success'
  | 'already_confirmed'
  | 'expired'
  | 'invalid'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const initialStatus = searchParams.get('status')
  const emailParam = searchParams.get('email')

  const [status, setStatus] = useState<ConfirmStatus>(() => {
    if (initialStatus === 'success') return 'success'
    if (initialStatus === 'expired') return 'expired'
    if (initialStatus === 'invalid') return 'invalid'
    return token ? 'inspecting' : 'invalid'
  })

  const [subscriberEmail, setSubscriberEmail] = useState<string>(emailParam || '')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [resendEmail, setResendEmail] = useState<string>(emailParam || '')
  const [resendSubmitting, setResendSubmitting] = useState<boolean>(false)
  const [resendMessage, setResendMessage] = useState<string>('')
  const [resendError, setResendError] = useState<string>('')

  // 1. Scanner-safe inspection on mount
  useEffect(() => {
    if (!token || initialStatus) return

    let isMounted = true

    async function checkToken() {
      try {
        const res = await fetch(`/api/newsletter/confirm/verify?token=${encodeURIComponent(token!)}`)
        const data = await res.json()

        if (!isMounted) return

        if (res.ok && data.valid) {
          if (data.status === 'already_confirmed') {
            setStatus('already_confirmed')
            setSubscriberEmail(data.email || '')
            setStatusMessage(data.message || "You're already subscribed to the Boom Squad!")
          } else if (data.status === 'ready') {
            setStatus('ready')
            setSubscriberEmail(data.email || '')
            setResendEmail(data.email || '')
          } else {
            setStatus('ready')
            setSubscriberEmail(data.email || '')
          }
        } else if (data.status === 'expired') {
          setStatus('expired')
          if (data.email) setResendEmail(data.email)
        } else {
          setStatus('invalid')
          setStatusMessage(data.message || 'This confirmation link is invalid or has expired.')
        }
      } catch {
        if (isMounted) {
          setStatus('ready') // allow explicit retry
        }
      }
    }

    checkToken()

    return () => {
      isMounted = false
    }
  }, [token, initialStatus])

  // 2. Explicit human confirmation handler
  const handleConfirmClick = async () => {
    if (!token || status === 'submitting') return

    setStatus('submitting')
    setStatusMessage('')

    try {
      const res = await fetch('/api/newsletter/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
        const confirmedEmail = data.email || subscriberEmail
        setSubscriberEmail(confirmedEmail)
        setStatusMessage(data.message || 'Welcome to the Bubble Boom Squad!')

        // Persist verified state and broadcast to footer
        try {
          if (confirmedEmail) {
            localStorage.setItem('bubbleboom_newsletter_status', 'active')
            localStorage.setItem('bubbleboom_newsletter_email', confirmedEmail)
            localStorage.removeItem('bubbleboom_newsletter_pending')
            window.dispatchEvent(
              new CustomEvent('bubbleboom_newsletter_confirmed', {
                detail: { email: confirmedEmail },
              })
            )
          }
        } catch {}
      } else if (res.status === 410 || data.expired) {
        setStatus('expired')
        if (data.email) setResendEmail(data.email)
      } else if (data.alreadyActive) {
        setStatus('already_confirmed')
        if (data.email) setSubscriberEmail(data.email)
      } else {
        setStatus('invalid')
        setStatusMessage(data.error || 'This confirmation link is invalid or has expired.')
      }
    } catch {
      setStatus('invalid')
      setStatusMessage('Unable to confirm subscription. Please check your network and try again.')
    }
  }

  // 3. Resend confirmation link handler
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = resendEmail.trim()
    if (!trimmed) return

    setResendSubmitting(true)
    setResendMessage('')
    setResendError('')

    try {
      const res = await fetch('/api/newsletter/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setResendMessage(
          data.message || 'A fresh confirmation link has been sent to your email. Please check your inbox.'
        )
      } else {
        setResendError(data.error || 'Failed to resend confirmation email. Please try again later.')
      }
    } catch {
      setResendError('Network error. Please try again.')
    } finally {
      setResendSubmitting(false)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-neutral-50 sm:bg-white">
      <div className="max-w-md w-full bg-white border-2 border-black p-8 sm:p-10 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {/* Brand Header */}
        <div className="mb-8 pb-6 border-b-2 border-black flex flex-col items-center">
          <Link href="/" className="inline-block relative h-9 w-44 mb-2">
            <Image
              src="/images/brand/bubble-boom-logo-white.png"
              alt="BUBBLE BOOM"
              fill
              sizes="176px"
              className="object-contain invert filter"
              priority
            />
          </Link>
          <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-neutral-500">
            Boom Squad Verification
          </span>
        </div>

        {/* State A: Inspecting */}
        {status === 'inspecting' && (
          <div className="space-y-4 py-6">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-black" />
            <h2 className="text-lg font-black uppercase tracking-tight">Verifying Link</h2>
            <p className="text-xs text-neutral-500 font-mono">
              Validating your confirmation token...
            </p>
          </div>
        )}

        {/* State B: Ready to Confirm (Explicit Human Action) */}
        {(status === 'ready' || status === 'submitting') && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2.5 py-1 font-bold">
                Action Required
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight mt-4">
                CONFIRM YOUR SUBSCRIPTION
              </h1>
              {subscriberEmail && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 px-3 py-1 text-xs font-mono text-black">
                  <Mail size={12} className="text-neutral-500" />
                  <span className="truncate max-w-[260px]">{subscriberEmail}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              Click below to complete verification and receive exclusive streetwear drops, new arrivals, and special offers.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmClick}
                disabled={status === 'submitting'}
                className="w-full bg-black text-white hover:bg-neutral-800 disabled:opacity-60 px-6 py-3.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>CONFIRMING...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>CONFIRM SUBSCRIPTION</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-neutral-400 font-mono">
              Protected by Bubble Boom security. Unsubscribe anytime with 1-click.
            </p>
          </div>
        )}

        {/* State C: Confirmed Success */}
        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-black text-white flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2.5 py-1 font-bold">
                Verified
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight mt-3">
                YOU&apos;RE SUBSCRIBED ✓
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 mt-1">
                Welcome to the Bubble Boom Squad!
              </p>
              {subscriberEmail && (
                <p className="text-xs font-mono text-neutral-500 mt-1 break-all">
                  {subscriberEmail}
                </p>
              )}
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              Your email has been verified. You will receive updates on new arrivals and exclusive streetwear releases.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <span>Back to Shopping</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center border-2 border-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        )}

        {/* State D: Already Confirmed */}
        {status === 'already_confirmed' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-black text-white flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2.5 py-1 font-bold">
                Already Active
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight mt-3">
                YOU&apos;RE SUBSCRIBED ✓
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 mt-1">
                Welcome to the Bubble Boom Squad!
              </p>
              {subscriberEmail && (
                <p className="text-xs font-mono text-neutral-500 mt-1 break-all">
                  {subscriberEmail}
                </p>
              )}
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              Your subscription is already active and confirmed. You are all set to receive new releases.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <span>Back to Shopping</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center border-2 border-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        )}

        {/* State E: Expired or Invalid Link */}
        {(status === 'expired' || status === 'invalid') && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-neutral-100 border border-neutral-300 text-black flex items-center justify-center mx-auto">
              {status === 'expired' ? (
                <AlertTriangle className="w-8 h-8 text-neutral-800" />
              ) : (
                <XCircle className="w-8 h-8 text-neutral-800" />
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-neutral-200 text-black px-2.5 py-1 font-bold">
                Verification Notice
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight mt-3">
                This confirmation link is invalid or has expired.
              </h1>
              {statusMessage && (
                <p className="text-xs text-neutral-600 mt-1">
                  {statusMessage}
                </p>
              )}
            </div>

            {/* Resend Confirmation Box */}
            <div className="border-t border-b border-neutral-200 py-5 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-black mb-1">
                RESEND CONFIRMATION EMAIL
              </h3>
              <p className="text-[11px] text-neutral-500 mb-3">
                Enter your email address to receive a fresh 24-hour verification link.
              </p>

              <form onSubmit={handleResend} className="space-y-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={resendSubmitting}
                  className="w-full bg-neutral-50 border border-neutral-300 text-black placeholder-neutral-400 px-3 py-2 text-xs focus:outline-none focus:border-black font-mono disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={resendSubmitting}
                  className="w-full bg-black text-white hover:bg-neutral-800 disabled:opacity-60 py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                >
                  {resendSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>SENDING...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>RESEND CONFIRMATION EMAIL</span>
                    </>
                  )}
                </button>
              </form>

              {resendMessage && (
                <div className="mt-3 text-xs flex items-center text-black bg-neutral-100 p-2 border border-neutral-300">
                  <CheckCircle2 size={14} className="mr-1.5 shrink-0" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {resendError && (
                <div className="mt-3 text-xs flex items-center text-neutral-700 bg-neutral-100 p-2 border border-neutral-300">
                  <AlertTriangle size={14} className="mr-1.5 shrink-0" />
                  <span>{resendError}</span>
                </div>
              )}
            </div>

            <div className="pt-1">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 border-2 border-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors w-full"
              >
                <span>Back to Shopping</span>
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
        <div className="min-h-[75vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
