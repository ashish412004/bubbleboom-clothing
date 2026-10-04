import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import Link from 'next/link'

export const metadata = {
  title: 'Returns & Refunds Policy | BUBBLE BOOM',
  description: 'Understand Bubble Boom 7-day return policy, exchange procedures, and refund processing timelines.',
}

export default function ReturnsRefundsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Draft Notification Badge */}
          <div className="mb-8 p-3 bg-neutral-100 border-l-4 border-black text-xs font-mono">
            <span className="font-bold uppercase block text-black mb-0.5">[DRAFT POLICY - SUBJECT TO FINAL OWNER APPROVAL]</span>
            This document outlines the standard return, replacement, and refund terms for garments purchased on Bubble Boom.
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-2">
            Returns &amp; Refunds Policy
          </h1>
          <p className="text-xs font-mono text-neutral-500 mb-8">Last Updated: October 2026</p>

          <div className="prose prose-neutral max-w-none space-y-6 text-sm text-neutral-800 leading-relaxed border-t border-neutral-300 pt-6">
            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">1. 7-Day Return &amp; Exchange Window</h2>
              <p>
                We stand behind our streetwear craft. If a garment does not fit the way you desire or arrives damaged, you may initiate a return or exchange request within <strong>7 calendar days</strong> from the official delivery date recorded by our logistics carrier.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">2. Eligibility &amp; Item Condition</h2>
              <p>To qualify for an approved return and full refund:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The item must be <strong>unworn, unwashed, and undamaged</strong>, free from fragrance, deodorant stains, pet hair, or alterations.</li>
                <li>All original brand tags, labels, and star monogram polybags must be intact and returned with the item.</li>
                <li>Items bought during final clearance or flash archive sales are marked final sale and are only eligible for exchange in case of manufacturing defect.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">3. How to Request a Return</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Sign in to your account and navigate to{' '}
                  <Link href="/account/orders" className="underline font-bold text-black">
                    My Orders
                  </Link>
                  . Select the delivered order and click &ldquo;Request Return / Exchange&rdquo;.
                </li>
                <li>Select the item and specify your reason (e.g., Size too large / small, stitching defect).</li>
                <li>Our operations team will review your request within 24–48 hours and schedule a reverse pickup from your original shipping address.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">4. Quality Inspection &amp; Restocking</h2>
              <p>
                Once the returned garment reaches our warehouse, our quality control team performs an inspection within 2 business days. If the garment complies with our return standards, your refund is approved and issued. If an item fails inspection (e.g., has been laundered or worn), it will be returned to the customer.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">5. Refund Methods &amp; Timelines</h2>
              <div className="overflow-x-auto my-4 border border-black">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-neutral-100 border-b border-black">
                    <tr>
                      <th className="p-3">Payment Method Used</th>
                      <th className="p-3">Refund Channel</th>
                      <th className="p-3">Processing Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-3 font-bold">Online (Cashfree / Cards / Net Banking / UPI)</td>
                      <td className="p-3">Reversal to original payment source via Cashfree PG</td>
                      <td className="p-3">3 – 5 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Cash on Delivery (COD)</td>
                      <td className="p-3">Direct Bank Transfer (NEFT/IMPS) or Store Credit</td>
                      <td className="p-3">5 – 7 Business Days after bank details verification</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500">
                * Note: Original shipping charges and COD handling fees (if any) are non-refundable unless the return is due to an error on our part (e.g. wrong style dispatched).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">6. Order Cancellation Prior to Dispatch</h2>
              <p>
                You may cancel your order at zero charge directly from the{' '}
                <Link href="/account/orders" className="underline font-bold text-black">
                  Order Details
                </Link>{' '}
                page while the status is in <em>Pending</em>, <em>Confirmed</em>, or <em>Packed</em> state. Once an order is handed to the courier, cancellation is no longer possible and the standard 7-day return procedure applies.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
