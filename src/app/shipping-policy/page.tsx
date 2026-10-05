import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import Link from 'next/link'

export const metadata = {
  title: 'Shipping & Delivery Policy | BUBBLE BOOM',
  description: 'Pan-India delivery schedules, shipping rates, free delivery thresholds, and order dispatch terms.',
}

export default function ShippingPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Official Policy Banner */}
          <div className="mb-8 p-4 bg-[#F8F8F6] border-2 border-black text-xs font-mono">
            <span className="font-black uppercase block text-black mb-1">Official Shipping &amp; Delivery Terms</span>
            All orders placed on Bubble Boom are dispatched with verified domestic courier partners (including Delhivery, BlueDart, DTDC, and Shiprocket networks) across India.
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-2">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="text-xs font-mono text-neutral-500 mb-8">Official Policy • Effective October 2026</p>

          <div className="prose prose-neutral max-w-none space-y-6 text-sm text-neutral-800 leading-relaxed border-t border-neutral-300 pt-6">
            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">1. Coverage &amp; Serviceability</h2>
              <p>
                Bubble Boom ships across serviceable postal PIN codes in the Republic of India through premier express courier networks (including BlueDart, Delhivery, and Shiprocket partners).
              </p>
              <p>
                Delivery eligibility is validated in real-time on our product pages and checkout flow based on active logistics coverage. If your delivery PIN code is not serviceable, our checkout system will notify you before payment.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">2. Processing &amp; Dispatch Timeline</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Orders are verified, picked, and quality-inspected within <strong>1 to 2 business days</strong> (Monday through Saturday).</li>
                <li>Orders placed on Sundays or public holidays will be queued for fulfillment on the following business day.</li>
                <li>Once dispatched, an automated notification containing your courier Air Waybill (AWB) tracking number is generated.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">3. Estimated Transit Timeframes</h2>
              <div className="overflow-x-auto my-4 border border-black">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-neutral-100 border-b border-black">
                    <tr>
                      <th className="p-3">Destination Region</th>
                      <th className="p-3">Estimated Transit Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-3 font-bold">Tier 1 Metro Cities (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Kolkata)</td>
                      <td className="p-3">2 – 4 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Tier 2 &amp; Tier 3 Cities / State Capitals</td>
                      <td className="p-3">4 – 6 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Northeast &amp; Special Postal Areas</td>
                      <td className="p-3">5 – 8 Business Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500">
                * Transit estimates are subject to courier route operations, extreme weather conditions, or local logistical restrictions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">4. Shipping Charges &amp; Free Delivery Threshold</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Free Standard Delivery:</strong> Applicable on all prepaid and COD orders with a net subtotal of <strong>₹1,499 and above</strong>.</li>
                <li><strong>Standard Flat Shipping:</strong> For orders below ₹1,499, a flat delivery fee of <strong>₹99</strong> is added at checkout.</li>
                <li><strong>Cash on Delivery (COD) Convenience Fee:</strong> A non-refundable handling fee of <strong>₹50</strong> applies to COD shipments. COD is available on carts up to ₹5,000.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">5. Order Tracking</h2>
              <p>
                You can track the live dispatch progress of your package at any time via our dedicated{' '}
                <Link href="/track-order" className="underline font-bold text-black">
                  Order Tracking Portal
                </Link>{' '}
                by providing your order reference number and verified email/phone number.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">6. Delivery Assistance &amp; Support</h2>
              <p>
                For delivery escalations, incorrect address corrections before dispatch, or shipment questions, contact our support desk:
              </p>
              <div className="bg-[#F8F8F6] p-4 border border-black text-xs font-mono my-2 space-y-1">
                <div>Support Email: <a href="mailto:bubbleboomstore2026@gmail.com" className="font-bold underline text-black">bubbleboomstore2026@gmail.com</a></div>
                <div>Support Hours: Monday – Saturday, 10:00 AM – 7:00 PM IST</div>
                <div>Response Time: Within 24 business hours</div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
