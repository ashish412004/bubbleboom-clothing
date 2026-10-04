'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const siteUrl = window.location.origin
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/account/profile`,
      })

      if (resetError) {
        throw resetError
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Could not send recovery link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16 px-4 bg-[#F8F8F6]">
        <div className="w-full max-w-md mx-auto p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-black">
                <CheckCircle2 className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Recovery Link Sent</h2>
              <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                If an account exists for <span className="font-bold text-black">{email}</span>, you will receive an email shortly with instructions to reset your password.
              </p>
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <Link
                  href="/login"
                  className="inline-block bg-black text-white px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <span className="text-xs uppercase font-mono tracking-widest text-neutral-500">Account Recovery</span>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">Reset Password</h1>
                <p className="text-xs text-neutral-600 mt-2">
                  Enter your registered email and we will send you a secure link to update your credentials.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <span>{loading ? 'Sending link...' : 'Send Recovery Link'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

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
