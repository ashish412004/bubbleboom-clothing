'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Ban,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import {
  checkPincodeDelivery,
  getProductExchangeSummary,
  PincodeDeliveryResult,
  ProductExchangeInfo,
} from '@/lib/delivery'
import {
  StoreShippingSettings,
  StoreExchangeSettings,
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_EXCHANGE_SETTINGS,
} from '@/types/settings'

interface DeliveryExchangeCardProps {
  product: {
    id: string
    tags?: string[] | null
    category_id?: string | null
  }
  initialShipping?: StoreShippingSettings
  initialExchange?: StoreExchangeSettings
}

export function DeliveryExchangeCard({
  product,
  initialShipping = DEFAULT_SHIPPING_SETTINGS,
  initialExchange = DEFAULT_EXCHANGE_SETTINGS,
}: DeliveryExchangeCardProps) {
  const [pinCode, setPinCode] = useState('')
  const [shippingSettings] = useState<StoreShippingSettings>(initialShipping)
  const [exchangeSettings] = useState<StoreExchangeSettings>(initialExchange)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PincodeDeliveryResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const exchangeInfo: ProductExchangeInfo = getProductExchangeSummary(product, exchangeSettings)

  // Load remembered pincode from localStorage
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem('bb_saved_pincode')
      if (savedPin && /^[1-9][0-9]{5}$/.test(savedPin)) {
        setPinCode(savedPin)
        const initialCheck = checkPincodeDelivery(savedPin, shippingSettings)
        setResult(initialCheck)
      }
    } catch {
      // localStorage may be unavailable or restricted
    }
  }, [shippingSettings])

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg('')

    const trimmed = pinCode.trim()
    if (!/^[1-9][0-9]{5}$/.test(trimmed)) {
      setErrorMsg('Please enter a valid 6-digit Indian PIN code.')
      setResult(null)
      return
    }

    setLoading(true)
    try {
      // Check via delivery API or local evaluation
      const res = await fetch(`/api/delivery/check?pincode=${encodeURIComponent(trimmed)}`)
      if (res.ok) {
        const data: PincodeDeliveryResult = await res.json()
        setResult(data)
        if (data.valid) {
          try {
            localStorage.setItem('bb_saved_pincode', trimmed)
          } catch {}
        }
      } else {
        // Fallback to local evaluation
        const local = checkPincodeDelivery(trimmed, shippingSettings)
        setResult(local)
      }
    } catch {
      // Fallback to client-side evaluation
      const local = checkPincodeDelivery(trimmed, shippingSettings)
      setResult(local)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPin = () => {
    setResult(null)
    setErrorMsg('')
    setPinCode('')
    try {
      localStorage.removeItem('bb_saved_pincode')
    } catch {}
  }

  return (
    <div className="border border-black bg-[#F8F8F6] p-4 sm:p-5 space-y-4 my-2 text-black">
      {/* 1. DELIVERY SERVICEABILITY SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-black shrink-0" />
            <span className="text-[11px] font-mono uppercase tracking-widest font-black">
              Delivery Availability
            </span>
          </div>
          {result?.valid && result.is_serviceable && (
            <span className="text-[10px] font-mono text-neutral-500 uppercase">
              PIN {result.pincode}
            </span>
          )}
        </div>

        {/* Input Form */}
        {!result?.is_serviceable ? (
          <form onSubmit={handleCheck} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pinCode}
                onChange={(e) => {
                  setPinCode(e.target.value.replace(/\D/g, ''))
                  setErrorMsg('')
                }}
                placeholder="Enter 6-digit Indian PIN"
                className="bg-white border border-black px-3 py-2 text-xs font-mono placeholder-neutral-400 flex-grow focus:outline-none focus:ring-1 focus:ring-black"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || pinCode.length !== 6}
                className="bg-black text-white px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check'}
              </button>
            </div>

            {errorMsg && (
              <p className="text-[11px] text-neutral-800 font-mono flex items-center gap-1.5">
                <AlertCircle size={13} className="text-black shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}

            {result && !result.is_serviceable && (
              <div className="p-2.5 bg-neutral-100 border border-neutral-300 space-y-1.5">
                <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Ban size={14} className="text-black shrink-0" />
                  <span>Delivery Unavailable for PIN {result.pincode}</span>
                </p>
                <p className="text-[11px] text-neutral-600 font-mono leading-tight">
                  We do not currently ship to this pincode. Please try another address.
                </p>
                <button
                  type="button"
                  onClick={handleResetPin}
                  className="text-[11px] font-mono underline font-bold uppercase hover:text-neutral-600 block pt-1"
                >
                  Try Another PIN Code
                </button>
              </div>
            )}
          </form>
        ) : (
          /* Serviceable Result Details */
          <div className="space-y-2.5 bg-white border border-neutral-300 p-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-black">
                <CheckCircle2 size={14} className="text-black shrink-0" />
                <span>Serviceable to {result.pincode}</span>
              </div>
              <button
                type="button"
                onClick={handleResetPin}
                className="text-[10px] font-mono uppercase underline hover:text-neutral-600"
              >
                Change
              </button>
            </div>

            {/* Estimated Delivery Date */}
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-neutral-600 shrink-0" />
                {result.estimate_available ? (
                  <span className="font-bold text-black">
                    Estimated Delivery: {result.estimated_delivery_formatted}
                  </span>
                ) : (
                  <span className="text-neutral-600 font-mono text-[11px]">
                    Delivery estimate currently unavailable.
                  </span>
                )}
              </div>
              {result.estimate_available && result.estimate_explanation && (
                <p className="text-[10px] text-neutral-500 font-mono pl-4 leading-tight">
                  {result.estimate_explanation}
                </p>
              )}
            </div>

            {/* Shipping Fees & Free Shipping Rule */}
            <div className="text-[11px] font-mono text-neutral-700 space-y-1 pt-1 border-t border-neutral-100">
              <p>
                • Free express delivery on orders above ₹
                {result.free_shipping_threshold.toLocaleString('en-IN')}. (₹
                {result.shipping_fee} on smaller orders)
              </p>
              <p className={result.cod_available ? 'text-black font-semibold' : 'text-neutral-500'}>
                • {result.cod_message}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. EXCHANGE & RETURNS POLICY SUMMARY */}
      <div className="border-t border-neutral-300 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-black shrink-0" />
            <span className="text-[11px] font-mono uppercase tracking-widest font-black">
              {exchangeInfo.summary_heading}
            </span>
          </div>

          <Link
            href={exchangeInfo.policy_url}
            className="text-[10px] font-mono font-bold uppercase underline inline-flex items-center gap-0.5 hover:text-neutral-600"
          >
            <span>Policy</span>
            <ExternalLink size={10} />
          </Link>
        </div>

        <p className="text-xs text-neutral-700 leading-relaxed font-sans">
          {exchangeInfo.summary_text}
        </p>

        {exchangeInfo.configured && !exchangeInfo.is_excluded && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-neutral-500 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck size={11} className="text-black" />
              Condition: {exchangeInfo.conditions}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
