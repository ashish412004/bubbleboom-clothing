'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Shop page error boundary caught:', error)
  }, [error])

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full text-center border border-dashed border-neutral-300 p-8 sm:p-12 bg-neutral-50">
          <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-black uppercase tracking-widest mb-2">
            Unable to Load Catalog
          </h2>
          <p className="text-xs text-neutral-500 mb-6">
            We encountered a temporary issue while fetching the product catalog. Please retry or browse back to the homepage.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto border border-black text-black px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-100 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
