'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  RefreshCw,
} from 'lucide-react'

type ResetStep = 'email' | 'otp' | 'password' | 'completed'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<ResetStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  // Resend Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // STEP 1: Send Recovery OTP
  const handleSendRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim().toLowerCase()
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
          action: 'send-forgot-password-otp',
          email: cleanEmail,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send recovery code.')
      }

      toast.success('6-digit recovery code sent to your email!')
      setStep('otp')
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery code.')
    } finally {
      setLoading(false)
    }
  }

  // Resend Recovery OTP
  const handleResendRecoveryOtp = async () => {
    if (countdown > 0 || loading) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-forgot-password-otp',
          email: email.trim().toLowerCase(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resend code.')
      }

      toast.success('Fresh recovery code sent!')
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to resend recovery code.')
    } finally {
      setLoading(false)
    }
  }

  // STEP 2: Verify Recovery OTP
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
          action: 'verify-forgot-password-otp',
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid or expired recovery code.')
      }

      toast.success('Code verified! Set your new password.')
      setStep('password')
    } catch (err: any) {
      setError(err.message || 'Invalid or expired recovery code.')
    } finally {
      setLoading(false)
    }
  }

  // STEP 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          password: newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update password.')
      }

      toast.success('Password updated successfully!')
      setStep('completed')
    } catch (err: any) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16 px-4 bg-[#F8F8F6]">
        <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {/* STEP 4: Success Screen */}
          {step === 'completed' ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-black">
                <CheckCircle2 className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Password Reset Complete</h2>
              <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                Your password has been changed securely. You can now sign in to your Bubble Boom account with your new credentials.
              </p>
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <Link
                  href="/login?reset=success"
                  className="inline-block bg-black text-white px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                >
                  Sign In With New Password
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <span className="text-xs uppercase font-mono tracking-widest text-neutral-500">
                  {step === 'email' && 'Step 1 of 3: Verification Request'}
                  {step === 'otp' && 'Step 2 of 3: Code Verification'}
                  {step === 'password' && 'Step 3 of 3: New Credentials'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">
                  {step === 'email' && 'Reset Password'}
                  {step === 'otp' && 'Verify Code'}
                  {step === 'password' && 'Create New Password'}
                </h1>
                <p className="text-xs text-neutral-600 mt-2">
                  {step === 'email' && 'Enter your email to receive a secure 6-digit recovery code.'}
                  {step === 'otp' && `Enter the 6-digit recovery code sent to ${email}`}
                  {step === 'password' && 'Enter and confirm your new account password.'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: Enter Email */}
              {step === 'email' && (
                <form onSubmit={handleSendRecoveryOtp} className="space-y-4">
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    <span>{loading ? 'Sending Code...' : 'Send Recovery Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: Enter OTP */}
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
                        setStep('email')
                        setError(null)
                      }}
                      className="text-xs text-black underline hover:text-neutral-700 font-bold whitespace-nowrap"
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
                    <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
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
                        onClick={handleResendRecoveryOtp}
                        disabled={loading}
                        className="text-xs text-black font-mono underline hover:text-neutral-700 flex items-center justify-center gap-1 mx-auto"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Recovery Code</span>
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* STEP 3: Set New Password */}
              {step === 'password' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        disabled={loading}
                        className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                    className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              )}

              <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
                <Link
                  href="/login"
                  className="text-xs font-mono text-neutral-600 hover:text-black hover:underline uppercase tracking-wider"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
