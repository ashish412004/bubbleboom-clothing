'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
} from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const errorParam = searchParams.get('error')
  const resetParam = searchParams.get('reset')
  const isAdminTarget = nextParam?.startsWith('/admin')

  // Prevent open redirects: only allow local relative paths
  const safeRedirect =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/account'

  const refreshCart = useCartStore((s) => s.refreshCart)

  const [authMode, setAuthMode] = useState<'otp' | 'password'>(
    isAdminTarget ? 'password' : 'otp'
  )

  // OTP Mode State
  const [otpEmail, setOtpEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Password Mode State
  const [passwordEmail, setPasswordEmail] = useState(
    isAdminTarget ? 'hhshukla241099@gmail.com' : ''
  )
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'unauthorized'
      ? 'Access restricted: The Admin Terminal can only be accessed by hhshukla241099@gmail.com.'
      : null
  )

  // Resend Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // OPTION A1: Send Login Email OTP
  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = otpEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-login-otp',
          email: cleanEmail,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send login code.')
      }

      setOtpSent(true)
      setCountdown(60)
      toast.success('6-digit login code sent to your email!')
    } catch (err: any) {
      setError(err.message || 'Failed to send login code.')
    } finally {
      setLoading(false)
    }
  }

  // Resend Login OTP
  const handleResendLoginOtp = async () => {
    if (countdown > 0 || loading) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-login-otp',
          email: otpEmail.trim().toLowerCase(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resend code.')
      }

      toast.success('Fresh login code sent!')
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  // OPTION A2: Verify Login Email OTP
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanOtp = otpCode.trim()
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit login code.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-login-otp',
          email: otpEmail.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid or expired login code.')
      }

      toast.success('Signed in successfully!')
      await refreshCart()
      window.location.href = safeRedirect
    } catch (err: any) {
      setError(err.message || 'Invalid or expired login code.')
      setLoading(false)
    }
  }

  // OPTION B: Login with Email & Password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = passwordEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login-password',
          email: cleanEmail,
          password,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid email or password.')
      }

      toast.success('Signed in successfully!')
      await refreshCart()
      window.location.href = safeRedirect
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.')
      setLoading(false)
    }
  }

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const siteUrl = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
        },
      })

      if (oauthError) {
        throw oauthError
      }
    } catch (err: any) {
      setError('Google authentication is currently unavailable. Please sign in with Email OTP or Password.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      {/* Title Header */}
      <div className="text-center mb-6">
        <span className="text-xs uppercase font-mono tracking-widest text-neutral-500">
          {isAdminTarget ? 'Admin Terminal Portal' : 'Bubble Boom Account'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">
          {isAdminTarget ? 'Admin Sign In' : 'Sign In'}
        </h1>
        <p className="text-xs text-neutral-600 mt-2">
          {isAdminTarget
            ? 'Sign in with your authorized admin credentials.'
            : 'Access your order history, live tracking, and saved capsule.'}
        </p>
      </div>

      {resetParam === 'success' && (
        <div className="mb-6 p-3 bg-green-50 border-l-4 border-green-600 text-xs text-green-900 font-mono">
          ✓ Password reset successful. Please sign in with your new password.
        </div>
      )}

      {/* Mode Switcher: Email OTP vs Password */}
      <div className="flex border border-black mb-6 p-0.5 bg-neutral-100">
        <button
          type="button"
          onClick={() => {
            setAuthMode('otp')
            setError(null)
          }}
          className={`flex-1 py-2 text-xs uppercase tracking-wider font-bold transition-all ${
            authMode === 'otp'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          Email OTP
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('password')
            setError(null)
          }}
          className={`flex-1 py-2 text-xs uppercase tracking-wider font-bold transition-all ${
            authMode === 'password'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          Password
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Option */}
      {!isAdminTarget && (
        <>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-black bg-white hover:bg-neutral-50 text-black py-2.5 px-4 text-xs uppercase tracking-widest font-bold transition-colors mb-6"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-neutral-300 w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-mono tracking-widest text-neutral-500 absolute">
              {authMode === 'otp' ? 'Or login with email code' : 'Or with email & password'}
            </span>
          </div>
        </>
      )}

      {/* OPTION A: EMAIL OTP LOGIN */}
      {authMode === 'otp' && (
        <>
          {!otpSent ? (
            <form onSubmit={handleSendLoginOtp} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Sending Code...' : 'Send Login Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
              <div className="p-3 bg-neutral-100 border border-neutral-300 flex items-center justify-between text-xs font-mono">
                <div className="truncate mr-2">
                  <span className="text-neutral-500">Sent to: </span>
                  <strong className="text-black">{otpEmail}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false)
                    setError(null)
                  }}
                  className="text-xs text-black underline hover:text-neutral-700 font-bold whitespace-nowrap"
                >
                  Change Email
                </button>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  6-Digit Login Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    disabled={loading}
                    className="w-full border border-black p-3 pl-10 text-base font-mono tracking-widest placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-4" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                {countdown > 0 ? (
                  <span className="text-xs text-neutral-500 font-mono">
                    Resend code in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendLoginOtp}
                    disabled={loading}
                    className="text-xs text-black font-mono underline hover:text-neutral-700 flex items-center justify-center gap-1 mx-auto"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Login Code</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}

      {/* OPTION B: EMAIL & PASSWORD LOGIN */}
      {authMode === 'password' && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={passwordEmail}
                onChange={(e) => setPasswordEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs uppercase font-mono tracking-wider font-bold">
                Password
              </label>
              <Link
                href={`/forgot-password${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ''}`}
                className="text-xs font-mono text-neutral-500 hover:text-black hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="w-full border border-black p-3 pl-10 pr-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-neutral-500 hover:text-black"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Switch to Signup */}
      <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
        <p className="text-xs text-neutral-600">
          New to Bubble Boom?{' '}
          <Link
            href={`/signup${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ''}`}
            className="font-bold text-black underline hover:text-neutral-700"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  )
}
