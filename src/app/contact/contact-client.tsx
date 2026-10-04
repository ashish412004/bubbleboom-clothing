'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Mail, Clock, Shield, Send, CheckCircle2 } from 'lucide-react'

export function ContactClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [subject, setSubject] = useState('Order & Delivery Inquiry')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate sending message to support desk
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      toast.success('Your message has been received by Bubble Boom support!')
    }, 600)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Contact Info & Details */}
      <div className="space-y-8">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-neutral-500 font-bold block mb-1">
            Get In Touch
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
            Contact Support
          </h1>
          <p className="mt-3 text-xs md:text-sm text-neutral-600 leading-relaxed">
            Have questions about an ongoing order, delivery timelines, sizing recommendations, or return requests? Our support team responds within 24 business hours.
          </p>
        </div>

        <div className="border border-black p-6 bg-white space-y-4">
          <div className="flex items-start gap-4">
            <Mail className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">Support Email</span>
              <a href="mailto:support@bubbleboom.in" className="text-sm font-bold text-black hover:underline">
                support@bubbleboom.in
              </a>
              <p className="text-xs text-neutral-500 mt-0.5">Direct response for customer inquiries and orders.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-neutral-200">
            <Clock className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">Operating Hours</span>
              <p className="text-sm font-bold text-black">Monday – Saturday: 10:00 AM – 7:00 PM IST</p>
              <p className="text-xs text-neutral-500 mt-0.5">Excluding national and regional public holidays.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-neutral-200">
            <Shield className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">Consumer Grievance Officer</span>
              <p className="text-sm font-bold text-black">Grievance Redressal Desk</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Designated officer under Consumer Protection (E-Commerce) Rules, 2020. Email: <a href="mailto:grievance@bubbleboom.in" className="underline">grievance@bubbleboom.in</a>
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#F8F8F6] border border-neutral-300 text-xs text-neutral-600">
          <p className="font-bold text-black uppercase mb-1 font-mono text-[10px]">Official Notice</p>
          Bubble Boom does not request one-time passwords (OTP) or UPI PINs for order cancellations or refunds. Always communicate exclusively through official @bubbleboom.in email addresses.
        </div>
      </div>

      {/* Form */}
      <div className="border-2 border-black p-8 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {submitted ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-black">
              <CheckCircle2 className="w-6 h-6 text-black" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">Message Dispatched</h3>
            <p className="text-xs text-neutral-600 mt-2 max-w-sm mx-auto">
              Thank you for contacting us. A support specialist has received your inquiry and will follow up at <span className="font-bold text-black">{email}</span> within 24 hours.
            </p>
            <button
              onClick={() => {
                setSubmitted(false)
                setMessage('')
              }}
              className="mt-6 bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800"
            >
              Send Another Note
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight pb-2 border-b border-neutral-200">
              Send an Inquiry
            </h2>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                className="w-full border border-black p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full border border-black p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Order Number (Optional)
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. BB-20261004-1234"
                className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-black p-2.5 text-xs focus:outline-none"
              >
                <option value="Order & Delivery Inquiry">Order &amp; Delivery Inquiry</option>
                <option value="Return / Exchange Request">Return / Exchange Request</option>
                <option value="Sizing & Fit Advice">Sizing &amp; Fit Advice</option>
                <option value="Damaged or Defective Item">Damaged or Defective Item</option>
                <option value="Business / Wholesale Collab">Business / Wholesale Collab</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Message *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your inquiry in detail..."
                className="w-full border border-black p-2.5 text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Sending...' : 'Transmit Inquiry'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
