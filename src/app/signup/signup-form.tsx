'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { AlertCircle, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react'

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  const safeRedirect = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/account'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to create your account.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const siteUrl = window.location.origin
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
        },
      })

      if (signUpError) {
        throw signUpError
      }

      // Check if email confirmation is required or if session was created immediately
      if (data.session) {
        toast.success('Account created!')
        router.push(safeRedirect)
        router.refresh()
      } else {
        setVerificationSent(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (verificationSent) {
    return (
      <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-black">
          <CheckCircle2 className="w-6 h-6 text-black" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Verify Your Email</h2>
        <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
          We have sent a verification link to <span className="font-bold text-black">{email}</span>. Click the link in your email to confirm your account and activate your wardrobe.
        </p>
        <div className="mt-8 pt-6 border-t border-neutral-200">
          <Link
            href="/login"
            className="inline-block bg-black text-white px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="text-center mb-8">
        <span className="text-xs uppercase font-mono tracking-widest text-neutral-500">Join the Movement</span>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">Create Account</h1>
        <p className="text-xs text-neutral-600 mt-2">Become a member for drop access, order tracking &amp; rewards.</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="e.g. Aryan Sharma"
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
              className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
            />
            <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
            Password (Min 8 Characters)
          </label>
          <div className="relative">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
            />
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded-none border-2 border-black accent-black focus:ring-0"
            />
            <span className="text-xs text-neutral-600 leading-tight">
              I agree to the Bubble Boom{' '}
              <Link href="/terms" className="underline font-bold text-black" target="_blank">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" className="underline font-bold text-black" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 mt-4"
        >
          <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
        <p className="text-xs text-neutral-600">
          Already registered?{' '}
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
