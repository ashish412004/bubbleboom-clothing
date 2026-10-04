import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | BUBBLE BOOM',
  description: 'Terms and conditions governing the purchase and browsing of goods on Bubble Boom.',
}

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Draft Notification Badge */}
          <div className="mb-8 p-3 bg-neutral-100 border-l-4 border-black text-xs font-mono">
            <span className="font-bold uppercase block text-black mb-0.5">[DRAFT POLICY - SUBJECT TO FINAL OWNER APPROVAL]</span>
            This document outlines the standard commercial terms and conditions governing the sale of merchandise on Bubble Boom.
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-2">
            Terms of Service
          </h1>
          <p className="text-xs font-mono text-neutral-500 mb-8">Last Updated: October 2026</p>

          <div className="prose prose-neutral max-w-none space-y-6 text-sm text-neutral-800 leading-relaxed border-t border-neutral-300 pt-6">
            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">1. Agreement to Terms</h2>
              <p>
                By accessing or placing an order through BUBBLE BOOM (&ldquo;bubbleboom.in&rdquo;), you confirm that you are at least 18 years of age or accessing under the supervision of a parent/guardian, and agree to be bound by these Terms of Service and our{' '}
                <Link href="/privacy-policy" className="underline font-bold text-black">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">2. Products &amp; Pricing</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>All prices listed on Bubble Boom are in <strong>Indian Rupees (INR)</strong> and are inclusive of applicable Goods and Services Tax (GST).</li>
                <li>While we take utmost care to ensure accurate color representation on our website, actual garment colors may vary slightly due to device display configurations and natural studio lighting variations.</li>
                <li>Prices, promotional offers, and product availability are subject to change without prior notice. In the event of an inadvertent technical pricing discrepancy, Bubble Boom reserves the right to cancel affected orders with a full refund.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">3. Orders, Inventory &amp; Payments</h2>
              <p>
                When you initiate checkout, our platform temporarily reserves inventory to ensure your selected size and color variant are allocated exclusively to your order session. Your order is confirmed only upon successful payment authorization through Cashfree Payments, or upon completion of phone verification for Cash on Delivery (COD) orders.
              </p>
              <p>
                Bubble Boom reserves the right to decline or cancel any order suspected of fraudulent activity, automated bot purchases, or abuse of discount coupons.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">4. Intellectual Property</h2>
              <p>
                All brand assets, including the Bubble Boom wordmark, rounded lettering, star monogram logo, product silhouettes, graphic prints, photographic works, and website code are the exclusive intellectual property of Bubble Boom. Unauthorized reproduction, modification, distribution, or commercial exploitation is strictly prohibited under the Copyright Act, 1957 and Trade Marks Act, 1999.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">5. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable Indian law, Bubble Boom shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from the use or inability to use our products or web platform. Our aggregate liability in connection with any purchase shall not exceed the total price paid by you for that specific order.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">6. Governing Law &amp; Jurisdiction</h2>
              <p>
                These Terms of Service are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
