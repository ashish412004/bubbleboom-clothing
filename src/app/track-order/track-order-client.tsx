'use client'

import { useState } from 'react'
import { Package, Truck, CheckCircle2, Clock, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TrackedOrder {
  id: string
  order_number: string
  created_at: string
  status: string
  payment_status: string
  payment_method: string
  total_amount: number
  tracking_number?: string | null
  courier_partner?: string | null
  shipping_address?: {
    city?: string
    state?: string
    pin_code?: string
  }
  order_items: Array<{
    id: string
    product_name: string
    quantity: number
    variant_info?: {
      color?: string
      size?: string
      sku?: string
    }
    total_amount: number
  }>
}

const ORDER_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2, desc: 'Payment verified & order queued' },
  { key: 'packed', label: 'Packed & Dispatched', icon: Package, desc: 'Quality checked & packed in Bubble Boom mailer' },
  { key: 'shipped', label: 'In Transit', icon: Truck, desc: 'With logistics carrier' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Clock, desc: 'Arriving today at your doorstep' },
  { key: 'delivered', label: 'Delivered', icon: ShieldCheck, desc: 'Handed over successfully' },
]

export function TrackOrderClient() {
  const [orderNumber, setOrderNumber] = useState('')
  const [verifier, setVerifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, verifier }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to locate order.')
      }

      setOrder(data.order)
    } catch (err: any) {
      setError(err.message || 'Unable to track order. Please verify your details.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const getStepStatus = (stepIndex: number, currentStatus: string) => {
    const statusOrder = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']
    const currentIndex = statusOrder.indexOf(currentStatus)
    const targetIndex = statusOrder.indexOf(ORDER_STEPS[stepIndex].key)

    if (currentStatus === 'cancelled') return 'cancelled'
    if (currentIndex >= targetIndex) return 'completed'
    return 'upcoming'
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      {/* Search Card */}
      <div className="border-2 border-black p-6 sm:p-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-2">
          Track Your Delivery
        </h2>
        <p className="text-xs text-neutral-600 mb-6">
          Enter your unique Bubble Boom order number and the phone number or email you used at checkout.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Order Number
            </label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. BB-20261004-1234"
              className="w-full border border-black p-3 text-sm font-mono placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Email or 10-Digit Mobile Number
            </label>
            <input
              type="text"
              required
              value={verifier}
              onChange={(e) => setVerifier(e.target.value)}
              placeholder="e.g. 9876543210 or yourname@gmail.com"
              className="w-full border border-black p-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {error && (
            <div className="p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
          >
            {loading ? 'Locating Order...' : 'Track Package'}
          </button>
        </form>
      </div>

      {/* Order Status Display */}
      {order && (
        <div className="mt-10 border border-black bg-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">Order Reference</span>
              <h3 className="text-xl font-black font-mono">{order.order_number}</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="sm:text-right">
              <span className="inline-block bg-black text-white text-xs font-mono uppercase px-3 py-1 font-bold">
                {order.status.replace(/_/g, ' ')}
              </span>
              <p className="text-xs text-neutral-600 mt-1 font-mono">
                Payment: {order.payment_method.toUpperCase()} ({order.payment_status.toUpperCase()})
              </p>
            </div>
          </div>

          {/* Courier Info if Shipped */}
          {order.tracking_number && (
            <div className="mt-6 p-4 bg-[#F8F8F6] border border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Logistics Partner</span>
                <p className="text-sm font-bold uppercase">{order.courier_partner || 'Express Courier Network'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Waybill / AWB Number</span>
                <p className="text-sm font-mono font-bold">{order.tracking_number}</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="mt-8 py-4">
            <h4 className="text-xs uppercase font-mono tracking-widest font-bold mb-6">Delivery Progress</h4>
            
            <div className="relative border-l-2 border-black ml-4 space-y-8 pl-6">
              {ORDER_STEPS.map((step, idx) => {
                const status = getStepStatus(idx, order.status)
                const isCompleted = status === 'completed'
                const Icon = step.icon

                return (
                  <div key={step.key} className="relative group">
                    {/* Circle icon */}
                    <div
                      className={`absolute -left-[35px] top-0 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center transition-colors ${
                        isCompleted ? 'bg-black text-white' : 'bg-white text-neutral-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h5
                        className={`text-sm font-bold uppercase tracking-tight ${
                          isCompleted ? 'text-black' : 'text-neutral-400'
                        }`}
                      >
                        {step.label}
                      </h5>
                      <p className="text-xs text-neutral-500 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Destination & Items summary */}
          <div className="mt-8 pt-6 border-t border-neutral-200">
            {order.shipping_address && (
              <div className="mb-6">
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Destination</span>
                <p className="text-sm font-medium">
                  {order.shipping_address.city}, {order.shipping_address.state} — {order.shipping_address.pin_code}
                </p>
              </div>
            )}

            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Items Ordered</span>
            <div className="divide-y divide-neutral-200 mt-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold uppercase">{item.product_name}</span>
                    {item.variant_info && (
                      <span className="text-neutral-500 ml-2 font-mono">
                        ({item.variant_info.size} / {item.variant_info.color})
                      </span>
                    )}
                    <span className="text-neutral-500 ml-2">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-mono font-bold">₹{item.total_amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-black flex justify-between items-center text-sm font-black">
              <span className="uppercase">Order Total</span>
              <span className="font-mono">₹{order.total_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
