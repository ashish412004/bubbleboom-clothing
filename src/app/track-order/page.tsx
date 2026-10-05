import { Suspense } from 'react'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { TrackOrderClient } from './track-order-client'

export const metadata = {
  title: 'Track Order | BUBBLE BOOM',
  description: 'Check real-time delivery status, courier waybill numbers, and transit updates for your order.',
}

export default function TrackOrderPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Real-Time Dispatch Updates</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-2">
              Order Tracking
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600 max-w-lg mx-auto">
              Follow your Bubble Boom package from our warehouse through quality inspection to your doorstep.
            </p>
          </div>
        </section>

        {/* Content */}
        <Suspense fallback={
          <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 text-center text-xs font-mono">
            Loading order tracking portal...
          </div>
        }>
          <TrackOrderClient />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
