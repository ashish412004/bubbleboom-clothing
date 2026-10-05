import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'

export const metadata = {
  title: 'Privacy Policy | BUBBLE BOOM',
  description: 'How Bubble Boom collects, protects, and handles personal data under Indian data protection regulations.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Draft Notification Badge */}
          <div className="mb-8 p-3 bg-neutral-100 border-l-4 border-black text-xs font-mono">
            <span className="font-bold uppercase block text-black mb-0.5">[DRAFT POLICY - SUBJECT TO FINAL OWNER APPROVAL]</span>
            This document outlines the data governance and privacy practices of Bubble Boom in compliance with the Digital Personal Data Protection (DPDP) Act, 2023 and Information Technology Act, 2000.
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-neutral-500 mb-8">Effective Date: October 2026</p>

          <div className="prose prose-neutral max-w-none space-y-6 text-sm text-neutral-800 leading-relaxed border-t border-neutral-300 pt-6">
            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">1. Overview &amp; Commitment</h2>
              <p>
                BUBBLE BOOM (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to safeguarding your personal data and respecting your individual privacy. This Privacy Policy details the types of personal data we collect through our online storefront (bubbleboom.in), how we process and store it, and your statutory rights regarding your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">2. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Contact &amp; Identity Data:</strong> Full name, verified email address, and 10-digit Indian phone number collected during registration, guest checkout, or customer service correspondence.
                </li>
                <li>
                  <strong>Fulfillment &amp; Location Data:</strong> Delivery street address, city, state, postal PIN code, and delivery notes necessary to route shipments.
                </li>
                <li>
                  <strong>Transaction &amp; Payment Data:</strong> Order reference numbers, items purchased, totals, and Cashfree payment confirmation identifiers. <em>We do not store your complete credit/debit card numbers, CVVs, or bank net-banking passwords. All payment transactions are securely handled directly by RBI-licensed payment aggregators (Cashfree Payments).</em>
                </li>
                <li>
                  <strong>Technical &amp; Session Data:</strong> IP addresses, browser specifications, and temporary guest cart session identifiers stored in HTTP-only cookies.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">3. Purpose of Processing</h2>
              <p>We process personal data strictly for lawful e-commerce purposes, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Fulfilling customer orders and orchestrating logistics dispatch and return pickups.</li>
                <li>Verifying transaction authenticity and preventing fraudulent payment attempts.</li>
                <li>Sending essential transactional messages (order confirmation, dispatch AWB alerts, invoice receipts).</li>
                <li>Maintaining compliance with Indian tax regulations (GST invoicing) and statutory audit guidelines.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">4. Third-Party Disclosures</h2>
              <p>
                We do not sell, rent, or trade your personal data to marketing brokers. We share minimal necessary data with vetted infrastructure partners solely to fulfill our services:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Payment Aggregator:</strong> Cashfree Payments India Pvt. Ltd. (PCI-DSS Level 1 compliant payment processing).</li>
                <li><strong>Logistics Carriers:</strong> BlueDart, Delhivery, and Shiprocket for parcel transportation and tracking updates.</li>
                <li><strong>Cloud Infrastructure &amp; Database:</strong> Supabase and Vercel for encrypted database storage and web delivery.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">5. Data Retention &amp; Security</h2>
              <p>
                We retain personal transaction records for as long as required under Indian commercial and taxation laws. We employ SSL/TLS 256-bit encryption in transit, row-level database security (RLS) policies, and role-based access control (RBAC) to safeguard customer records against unauthorized disclosure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-2">6. Your Rights &amp; Grievance Redressal</h2>
              <p>
                Under the DPDP Act 2023, you have the right to access, rectify, or request deletion of your personal data. For privacy inquiries or grievances, contact our Grievance Redressal Officer at:
              </p>
              <div className="bg-[#F8F8F6] border border-black p-4 text-xs font-mono mt-2">
                <p><strong>Grievance Officer:</strong> Data Privacy Desk, Bubble Boom</p>
                <p><strong>Email:</strong> bubbleboomstore2026@gmail.com</p>
                <p><strong>Response SLA:</strong> Within 30 calendar days</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
