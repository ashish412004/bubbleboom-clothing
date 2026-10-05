'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  KeyRound,
} from 'lucide-react'

type SignupStep = 'details' | 'otp' | 'password'

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  const safeRedirect =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/account'

  const refreshCart = useCartStore((s) => s.refreshCart)

  const [step, setStep] = useState<SignupStep>('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  // Resend countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // STEP 1: Send Signup Email OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    if (!fullName.trim()) {
      setError('Please provide your full name.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-signup-otp',
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send verification code.')
      }

      toast.success('6-digit verification code sent to your email!')
      setStep('otp')
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-signup-otp',
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resend code.')
      }

      toast.success('Fresh verification code sent!')
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  // STEP 2: Verify Email OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanOtp = otp.trim()
    if (cleanOtp.length < 6 || cleanOtp.length > 8) {
      setError('Please enter the verification code sent to your email.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-signup-otp',
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid or expired verification code.')
      }

      toast.success('Email verified successfully! Now create your password.')
      setStep('password')
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.')
    } finally {
      setLoading(false)
    }
  }

  // STEP 3: Create & Confirm Password
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete-signup-password',
          password,
          full_name: fullName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to complete registration.')
      }

      toast.success('Registration complete! Welcome to Bubble Boom.')
      await refreshCart()
      window.location.href = safeRedirect
    } catch (err: any) {
      setError(err.message || 'Failed to complete password setup.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      {/* Step Indicator Header */}
      <div className="text-center mb-6">
        <span className="text-xs uppercase font-mono tracking-widest text-neutral-500">
          Step {step === 'details' ? '1 of 3' : step === 'otp' ? '2 of 3' : '3 of 3'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">
          {step === 'details' && 'Create Account'}
          {step === 'otp' && 'Verify Email'}
          {step === 'password' && 'Create Password'}
        </h1>
        <p className="text-xs text-neutral-600 mt-2">
          {step === 'details' && 'Enter your details to receive an email verification code.'}
          {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
          {step === 'password' && 'Set a secure password to complete your account setup.'}
        </p>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`h-1.5 rounded-full transition-all ${step === 'details' ? 'w-8 bg-black' : 'w-4 bg-neutral-300'}`} />
        <div className={`h-1.5 rounded-full transition-all ${step === 'otp' ? 'w-8 bg-black' : 'w-4 bg-neutral-300'}`} />
        <div className={`h-1.5 rounded-full transition-all ${step === 'password' ? 'w-8 bg-black' : 'w-4 bg-neutral-300'}`} />
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Full Name + Email */}
      {step === 'details' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ashish Shukla"
                autoComplete="name"
                disabled={loading}
                className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
            </div>
          </div>

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
                placeholder="name@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 border-black rounded-none text-black focus:ring-black cursor-pointer"
            />
            <label htmlFor="agreeTerms" className="text-xs text-neutral-600 leading-snug cursor-pointer">
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="text-black underline font-semibold">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" target="_blank" className="text-black underline font-semibold">
                Privacy Policy
              </Link>.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* STEP 2: Email OTP Verification */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="p-3 bg-neutral-100 border border-neutral-300 flex items-center justify-between text-xs font-mono">
            <div className="truncate mr-2">
              <span className="text-neutral-500">Sent to: </span>
              <strong className="text-black">{email}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('details')
                setError(null)
              }}
              className="text-xs text-black underline hover:text-neutral-700 whitespace-nowrap font-bold"
            >
              Change Email
            </button>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Verification Code
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Enter code from email"
                disabled={loading}
                className="w-full border border-black p-3 pl-10 text-base font-mono tracking-widest placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Verifying Code...' : 'Verify Code'}</span>
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
                onClick={handleResendOtp}
                disabled={loading}
                className="text-xs text-black font-mono underline hover:text-neutral-700 flex items-center justify-center gap-1 mx-auto"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Verification Code</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* STEP 3: Create and Confirm Password */}
      {step === 'password' && (
        <form onSubmit={handleCompleteRegistration} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
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
            <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
              Minimum 8 characters required.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                disabled={loading}
                className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword}
            className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <span>{loading ? 'Finalizing Setup...' : 'Complete Registration'}</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Footer Switcher */}
      <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
        <p className="text-xs text-neutral-600">
          Already have an account?{' '}
          <Link
            href={`/login${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ''}`}
            className="font-bold text-black underline hover:text-neutral-700"
          >
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  )
}
