'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  // Prevent open redirects: only allow local relative paths
  const safeRedirect = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshCart = useCartStore((s) => s.refreshCart)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid email or password.')
      }

      toast.success('Signed in successfully!')
      await refreshCart()
      router.push(safeRedirect)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

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
      setError('Google authentication requires active OAuth credentials in .env.local. Sign in with email above for instant local access.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="text-center mb-8">
        <span className="text-xs uppercase font-mono tracking-widest text-neutral-500">Bubble Boom Account</span>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">Sign In</h1>
        <p className="text-xs text-neutral-600 mt-2">Access your order history, saved drops, and express checkout.</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-black bg-white hover:bg-neutral-50 text-black py-3 px-4 text-xs uppercase tracking-widest font-bold transition-colors mb-6"
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
          Or with email
        </span>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs uppercase font-mono tracking-wider font-bold">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-mono text-neutral-500 hover:text-black hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-black p-3 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
            />
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
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
