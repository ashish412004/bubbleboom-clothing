import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import Link from 'next/link'
import { ArrowRight, Compass, Sparkles } from 'lucide-react'
import { InstagramIcon as Instagram } from '@/components/icons/instagram-icon'

export const metadata = {
  title: 'About Bubble Boom | Wear the Boom',
  description:
    'Bubble Boom is a streetwear brand built around bold expression, everyday comfort and individual style. Wear the Boom.',
  alternates: {
    canonical: 'https://bubbleboomstore.com/about',
  },
  openGraph: {
    title: 'About Bubble Boom | Wear the Boom',
    description:
      'Bubble Boom is a streetwear brand built around bold expression, everyday comfort and individual style. Wear the Boom.',
    url: 'https://bubbleboomstore.com/about',
    siteName: 'Bubble Boom',
    type: 'website',
  },
}

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Editorial Hero */}
        <section className="relative border-b-2 border-black bg-black text-white py-20 md:py-32 overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <span className="text-xs uppercase font-mono tracking-widest text-neutral-400 block mb-3">
              Brand Manifesto
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight">
              NOT JUST CLOTHING. IT&apos;S THE BOOM.
            </h1>
            <p className="mt-4 text-base md:text-xl font-light text-neutral-300 max-w-2xl mx-auto">
              Every style. Every mood. Make it yours.
            </p>
          </div>
        </section>

        {/* Brand Mission & Philosophy Block */}
        <section className="border-b border-black py-16 md:py-24 bg-[#F8F8F6]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6 text-sm md:text-base leading-relaxed text-neutral-800">
              <span className="text-xs uppercase font-mono tracking-widest text-neutral-500 font-bold block">
                Who We Are
              </span>
              <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-black">
                YOUR STYLE. YOUR RULES.
              </h2>
              <p className="text-base sm:text-lg text-neutral-900 leading-relaxed font-medium">
                Bubble Boom is a streetwear brand built around bold expression, everyday comfort and individual style.
              </p>
              <p className="leading-relaxed">
                We&apos;re building a collection of statement essentials for people who wear their personality with confidence.
              </p>
            </div>
          </div>
        </section>

        {/* Brand Pillars */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs uppercase font-mono tracking-widest text-neutral-500 block mb-2">Our Vision</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Designed for Expression</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-black p-8 bg-white">
              <Compass className="w-8 h-8 text-black mb-4" />
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">Bold Streetwear Cuts</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Relaxed, drop-shoulder silhouettes and modern boxy fits engineered for effortless daily layering.
              </p>
            </div>

            <div className="border border-black p-8 bg-white">
              <Sparkles className="w-8 h-8 text-black mb-4" />
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">Everyday Comfort</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Carefully selected fabrics that balance durability with comfortable wear, built for people living on the move.
              </p>
            </div>

            <div className="border border-black p-8 bg-white">
              <div className="w-8 h-8 flex items-center justify-center font-black text-xl mb-4">
                ★
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">Signature Identity</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Clean monochrome aesthetics and authentic attitude. Distinct essentials made to be styled your way.
              </p>
            </div>
          </div>
        </section>

        {/* Official Instagram Compact Section */}
        <section className="border-t border-black bg-[#F8F8F6] py-14 md:py-20 text-center">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Instagram className="w-6 h-6 text-black" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 font-bold block mb-1">
                @bubbleboomstore
              </span>
              <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-black">
                FOLLOW THE BOOM
              </h2>
            </div>
            <p className="text-xs md:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
              Stay connected for new drops, fresh fits, and everything Bubble Boom.
            </p>
            <div className="pt-2">
              <a
                href="https://www.instagram.com/bubbleboomstore/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-black text-white px-7 py-3 text-xs uppercase tracking-widest font-black hover:bg-neutral-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
              >
                <span>FOLLOW US ON INSTAGRAM ↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="border-t border-black bg-black text-white py-16 text-center">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-4">
              Explore Collections
            </h2>
            <p className="text-xs md:text-sm text-neutral-400 mb-8">
              Explore statement essentials and upcoming streetwear drops.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 text-xs uppercase tracking-widest font-black hover:bg-neutral-200 transition-colors"
            >
              <span>Explore The Shop</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
