'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
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
  carrier?: string | null
  tracking_url?: string | null
  dispatch_date?: string | null
  estimated_delivery_min?: string | null
  estimated_delivery_max?: string | null
  package_weight_grams?: number | null
  cancellation_reason?: string | null
  cancelled_at?: string | null
  shipping_address?: {
    city?: string
    state?: string
    pin_code?: string
    country?: string
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
  { key: 'packed', label: 'Packed', icon: Package, desc: 'Quality checked & packed in Bubble Boom mailer' },
  { key: 'pickup_scheduled', label: 'Pickup Ready', icon: Clock, desc: 'Manifest created, awaiting courier handover' },
  { key: 'shipped', label: 'In Transit', icon: Truck, desc: 'Dispatched with logistics carrier partner' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Clock, desc: 'Arriving today at your destination' },
  { key: 'delivered', label: 'Delivered', icon: ShieldCheck, desc: 'Handed over successfully' },
]

export function TrackOrderClient() {
  const searchParams = useSearchParams()
  const initialOrder =
    searchParams.get('order_id') ||
    searchParams.get('orderNumber') ||
    searchParams.get('order') ||
    ''
  const initialVerifier =
    searchParams.get('verifier') ||
    searchParams.get('phone') ||
    searchParams.get('email') ||
    ''

  const [orderNumber, setOrderNumber] = useState(initialOrder)
  const [verifier, setVerifier] = useState(initialVerifier)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [copiedAwb, setCopiedAwb] = useState(false)

  const executeTrack = useCallback(async (num: string, ver: string) => {
    if (!num.trim()) {
      setError('Please enter an order number.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: num.trim(),
          verifier: ver.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to locate order.')
      }

      setOrder(data.order)
    } catch (err: any) {
      setError(err.message || 'Unable to track order. Please check your order reference and details.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-search if URL parameters are provided or if authenticated
  useEffect(() => {
    if (initialOrder) {
      setOrderNumber(initialOrder)
      if (initialVerifier) {
        setVerifier(initialVerifier)
        executeTrack(initialOrder, initialVerifier)
      } else {
        // Check if user is logged in to automatically verify
        fetch('/api/auth/session')
          .then((res) => res.json())
          .then((session) => {
            if (session?.user?.email) {
              setVerifier(session.user.email)
              executeTrack(initialOrder, session.user.email)
            }
          })
          .catch(() => {})
      }
    }
  }, [initialOrder, initialVerifier, executeTrack])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeTrack(orderNumber, verifier)
  }

  const handleCopyAwb = (awb: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(awb)
      setCopiedAwb(true)
      setTimeout(() => setCopiedAwb(false), 2000)
    }
  }

  const getStepStatus = (stepIndex: number, currentStatus: string) => {
    if (currentStatus === 'cancelled') return 'cancelled'

    const rankMap: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      unfulfilled: 1,
      packed: 2,
      pickup_scheduled: 3,
      shipped: 4,
      out_for_delivery: 5,
      delivered: 6,
      delivery_exception: 4,
      return_to_origin: 4,
      return_requested: 6,
      returned: 6,
      refunded: 6,
    }

    const currentRank = rankMap[currentStatus] ?? 0
    const stepTargetRank = stepIndex + 1

    if (currentRank >= stepTargetRank) return 'completed'
    return 'upcoming'
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      {/* Search Card */}
      {!order && (
        <div className="border-2 border-black p-6 sm:p-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-2">
            Track Your Delivery
          </h2>
          <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
            Enter your Bubble Boom order number and the email or phone number used during checkout to view real-time courier status and AWB tracking.
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
                placeholder="e.g. BB-20261005-4774"
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
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
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
      )}

      {/* Order Status Display */}
      {order && (
        <div className="border border-black bg-white p-6 sm:p-8 space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setOrder(null)
                setError(null)
              }}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Track Another Package</span>
            </button>
            <span className="text-[11px] font-mono text-neutral-500">Live Status</span>
          </div>

          {/* Reference & Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider font-bold">
                Order Reference
              </span>
              <h3 className="text-xl font-black font-mono break-all">{order.order_number}</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="sm:text-right">
              <span className={`inline-block text-xs font-mono uppercase px-3 py-1 font-bold ${
                order.status === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : order.status === 'delivered'
                  ? 'bg-black text-white'
                  : 'bg-black text-white'
              }`}>
                {order.status.replace(/_/g, ' ')}
              </span>
              <p className="text-xs text-neutral-600 mt-1 font-mono">
                Payment: {order.payment_method.toUpperCase()} ({order.payment_status.toUpperCase()})
              </p>
            </div>
          </div>

          {/* Cancelled Banner */}
          {order.status === 'cancelled' && (
            <div className="p-4 bg-neutral-100 border-2 border-black flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-black shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wide">Order Has Been Cancelled</p>
                <p className="text-neutral-600 mt-1">
                  {order.cancellation_reason
                    ? `Reason: ${order.cancellation_reason}`
                    : 'This order was cancelled before parcel dispatch.'}
                </p>
              </div>
            </div>
          )}

          {/* Courier Logistics Card */}
          {order.tracking_number ? (
            <div className="p-4 bg-[#F8F8F6] border border-black space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">
                    Logistics Partner
                  </span>
                  <p className="text-sm font-extrabold uppercase">
                    {order.carrier || order.courier_partner || 'Express Courier'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-neutral-700">
                      AWB: <strong className="text-black font-bold">{order.tracking_number}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAwb(order.tracking_number!)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-white border border-neutral-300 hover:border-black px-2 py-0.5 transition-colors"
                      title="Copy AWB number"
                    >
                      {copiedAwb ? (
                        <>
                          <Check className="w-3 h-3 text-green-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-neutral-600" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 text-xs uppercase font-bold tracking-wider hover:bg-neutral-800 transition-colors shrink-0"
                  >
                    <span>Track on Carrier Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Extra Logistics Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-200 text-xs font-mono">
                {order.dispatch_date && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Dispatch Date</span>
                    <span className="font-semibold">
                      {new Date(order.dispatch_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {order.estimated_delivery_min && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Est. Delivery</span>
                    <span className="font-semibold">
                      {new Date(order.estimated_delivery_min).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {order.estimated_delivery_max && (
                        <> – {new Date(order.estimated_delivery_max).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}</>
                      )}
                    </span>
                  </div>
                )}
                {order.package_weight_grams && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Package Weight</span>
                    <span className="font-semibold">{order.package_weight_grams} g</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            order.status !== 'cancelled' && (
              <div className="p-4 bg-[#F8F8F6] border border-neutral-300 text-xs font-mono text-neutral-700">
                <div className="font-bold text-black uppercase mb-1">Status: Pre-Dispatch Preparation</div>
                Your parcel is being carefully prepared and packaged in our warehouse. As soon as the courier partner scans the shipment manifest, live tracking waybill details will appear here.
              </div>
            )
          )}

          {/* Timeline */}
          {order.status !== 'cancelled' && (
            <div className="py-2">
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
          )}

          {/* Destination & Items summary */}
          <div className="pt-6 border-t border-neutral-200">
            {order.shipping_address && (
              <div className="mb-6">
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">
                  Delivery Destination
                </span>
                <p className="text-sm font-medium mt-0.5">
                  {order.shipping_address.city}, {order.shipping_address.state} — {order.shipping_address.pin_code}
                </p>
              </div>
            )}

            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">
              Items in Shipment
            </span>
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

          {/* Support block */}
          <div className="p-4 bg-[#F8F8F6] border border-black flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-xs font-bold uppercase font-mono">Need Assistance?</div>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                Reference order <span className="font-mono font-bold text-black">{order.order_number}</span> for logistics inquiries.
              </p>
            </div>
            <a
              href={`mailto:bubbleboomstore2026@gmail.com?subject=Inquiry%20for%20Order%20${order.order_number}`}
              className="text-xs font-mono font-bold text-black underline"
            >
              bubbleboomstore2026@gmail.com
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
