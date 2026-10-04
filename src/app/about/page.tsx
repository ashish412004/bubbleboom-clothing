import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Compass, Scissors, ShieldCheck, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'About Bubble Boom | Wear the Boom',
  description: 'Bubble Boom is a modern Indian fashion brand engineered for bold individuality, distinct silhouettes, and heavyweight streetwear.',
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
            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tight">
              WEAR THE BOOM.
            </h1>
            <p className="mt-4 text-lg md:text-xl font-light text-neutral-300 max-w-2xl mx-auto">
              Every style. Every mood. Make it yours.
            </p>
          </div>
        </section>

        {/* Philosophy Block */}
        <section className="border-b border-black py-16 md:py-24 bg-[#F8F8F6]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6 text-sm md:text-base leading-relaxed text-neutral-800">
              <span className="text-xs uppercase font-mono tracking-widest text-neutral-500 font-bold block">
                The Bubble Boom Origin
              </span>
              <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-black">
                YOUR STYLE. YOUR RULES.
              </h2>
              <p>
                Bubble Boom was founded in India with a clear mission: break away from cookie-cutter, disposable fast fashion. We create clothing that speaks with attitude, designed for individuals who move at their own rhythm and refuse to conform to standard commercial molds.
              </p>
              <p>
                From dense, 240 GSM drop-shoulder tees and heavyweight 450 GSM French terry hoodies to precision-cut relaxed cargo trousers, every Bubble Boom garment is a statement of architectural silhouette, durable construction, and raw youthful expression.
              </p>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs uppercase font-mono tracking-widest text-neutral-500 block mb-2">Our Standards</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">How We Build</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-black p-8 bg-white">
              <Scissors className="w-8 h-8 text-black mb-4" />
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">Custom Silhouettes</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                We don&apos;t use off-the-shelf blanks. Every tee, hoodie, and pant pattern is developed in-house with dropped shoulders, wide sleeves, and a structured boxy drape.
              </p>
            </div>

            <div className="border border-black p-8 bg-white">
              <Sparkles className="w-8 h-8 text-black mb-4" />
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">Heavyweight Textiles</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Dense 100% combed cotton weaves ranging from 240 to 450 GSM. Bio-washed, silicone softened, and preshrunk for longevity and zero post-wash warping.
              </p>
            </div>

            <div className="border border-black p-8 bg-white">
              <ShieldCheck className="w-8 h-8 text-black mb-4" />
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">Transparent Production</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Ethically knitted, dyed, and stitched in small batch runs across audited textile hubs in India. Limited capsules to eliminate deadstock.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="border-t border-black bg-black text-white py-16 text-center">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-4">
              Explore the Latest Drops
            </h2>
            <p className="text-xs md:text-sm text-neutral-400 mb-8">
              Limited run collections. When a drop sells out, it rarely restocks in the same colorway.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 text-xs uppercase tracking-widest font-black hover:bg-neutral-200 transition-colors"
            >
              <span>Shop All Drops</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
