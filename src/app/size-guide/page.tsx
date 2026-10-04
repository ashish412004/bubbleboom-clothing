import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { SizeGuideClient } from './size-guide-client'

export const metadata = {
  title: 'Size Guide & Fit Matrix | BUBBLE BOOM',
  description: 'Detailed size charts and measuring guidelines for Bubble Boom oversized tees, hoodies, and cargo pants.',
}

export default function SizeGuidePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6] text-center">
          <div className="max-w-4xl mx-auto px-4">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Fit Architecture</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-1">
              Size &amp; Fit Guide
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600 max-w-lg mx-auto">
              Find your exact cut across our custom boxy streetwear silhouettes.
            </p>
          </div>
        </section>

        <SizeGuideClient />
      </main>

      <Footer />
    </div>
  )
}
