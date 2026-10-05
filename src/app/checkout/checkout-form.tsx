'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Truck, CreditCard, Banknote, Tag, ArrowRight, Navigation } from 'lucide-react'
import { formatPrice, getSafeImageUrl } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { load as loadCashfree } from '@cashfreepayments/cashfree-js'

interface CartItemData {
  id: string
  quantity: number
  variant: {
    sku: string
    color: string
    size: string
    product: {
      name: string
      selling_price: number
      images: Array<{ image_url: string }>
    }
  }
}

interface CartSummaryData {
  subtotal_paise: number
  discount_paise: number
  shipping_paise: number
  cod_fee_paise: number
  total_paise: number
  free_shipping_threshold_paise: number
  coupon_code: string | null
  coupon_discount_paise: number
}

declare global {
  interface Window {
    Cashfree?: any
  }
}

export function CheckoutForm({
  items,
  summary,
  userEmail = '',
  userName = '',
  userPhone = '',
}: {
  items: CartItemData[]
  summary: CartSummaryData
  userEmail?: string
  userName?: string
  userPhone?: string
}) {
  const router = useRouter()
  const setItemCount = useCartStore((state) => state.setItemCount)

  // Form fields
  const [fullName, setFullName] = useState(userName)
  const [email, setEmail] = useState(userEmail)
  const [phone, setPhone] = useState(userPhone)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'cod'>('cashfree')
  const [notes, setNotes] = useState('')

  // Coupon state
  const [couponCode, setCouponCode] = useState(summary.coupon_code || '')
  const [couponDiscountPaise, setCouponDiscountPaise] = useState(summary.coupon_discount_paise || 0)
  const [couponMessage, setCouponMessage] = useState('')

  const [pinLoading, setPinLoading] = useState(false)
  const [pinSuccessMsg, setPinSuccessMsg] = useState('')

  const handlePinChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    setPinCode(clean)
    setPinSuccessMsg('')

    if (clean.length === 6) {
      setPinLoading(true)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`)
        const data = await res.json()
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0]
          const detectedCity = po.District || po.Block || po.Name
          const detectedState = po.State
          if (detectedCity) setCity(detectedCity)
          if (detectedState) {
            const matchedState = indianStates.find(
              (s) => s.toLowerCase() === detectedState.toLowerCase() ||
                     (detectedState.toLowerCase() === 'delhi' && s.includes('Delhi'))
            )
            setState(matchedState || detectedState)
          }
          setPinSuccessMsg(`✓ ${detectedCity}, ${detectedState}`)
        } else {
          setPinSuccessMsg('Pincode not found')
        }
      } catch {
        // silent
      } finally {
        setPinLoading(false)
      }
    }
  }

  const [locating, setLocating] = useState(false)

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`)
          const data = await res.json()
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to resolve location address.')
          }

          const addr = data.address
          if (addr.address_line1) {
            setAddressLine1(addr.address_line1)
          }
          if (addr.city) {
            setCity(addr.city)
          }
          if (addr.state) {
            const matchedState = indianStates.find(
              (s) =>
                s.toLowerCase() === addr.state.toLowerCase() ||
                s.toLowerCase().includes(addr.state.toLowerCase()) ||
                addr.state.toLowerCase().includes(s.toLowerCase())
            )
            setState(matchedState || addr.state)
          }
          if (addr.pin_code && addr.pin_code.length === 6) {
            setPinCode(addr.pin_code)
            setPinSuccessMsg(`✓ ${addr.city || ''}, ${addr.state || ''}`)
          }
          toast.success(`📍 Location detected: ${addr.city || addr.state || 'Address filled'}`)
        } catch (err: any) {
          toast.error(err.message || 'Could not fetch address for this location.')
        } finally {
          setLocating(false)
        }
      },
      (geoErr) => {
        setLocating(false)
        let msg = 'Could not access location.'
        if (geoErr.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser settings.'
        } else if (geoErr.code === 2) {
          msg = 'Location position unavailable.'
        } else if (geoErr.code === 3) {
          msg = 'Location request timed out.'
        }
        toast.error(msg)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Dynamically compute totals
  const subtotalPaise = summary.subtotal_paise
  const shippingPaise = summary.shipping_paise
  const codFeePaise = paymentMethod === 'cod' ? summary.cod_fee_paise : 0
  const totalPaise = Math.max(0, subtotalPaise - couponDiscountPaise + shippingPaise + codFeePaise)

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    setCouponMessage('')
    const code = couponCode.trim().toUpperCase()
    if (!code) return

    if (code === 'BOOM10') {
      const disc = Math.round(subtotalPaise * 0.1)
      setCouponDiscountPaise(disc)
      setCouponMessage('BOOM10 applied: 10% discount!')
    } else if (code === 'FIRSTBOOM') {
      if (subtotalPaise < 149900) {
        setCouponMessage('FIRSTBOOM requires a minimum spend of ₹1,499')
        return
      }
      setCouponDiscountPaise(20000)
      setCouponMessage('FIRSTBOOM applied: ₹200 discount!')
    } else {
      setCouponMessage('Invalid coupon code')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    // 1. Validation
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address.')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.')
      return
    }
    if (!addressLine1.trim()) {
      setErrorMessage('Please enter your street address / flat details.')
      return
    }
    if (!city.trim() || !state.trim()) {
      setErrorMessage('Please provide your city and state.')
      return
    }
    if (!/^[1-9][0-9]{5}$/.test(pinCode.trim())) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN code.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          pin_code: pinCode.trim(),
          payment_method: paymentMethod,
          coupon_code: couponDiscountPaise > 0 ? couponCode : undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Checkout failed. Please try again.')
        setLoading(false)
        return
      }

      // Order created successfully! Clear cart counter
      setItemCount(0)

      if (paymentMethod === 'cod') {
        router.push(data.redirect_url || `/payment-return?order_id=${data.order_number}&method=cod`)
        return
      }

      // Cashfree Online Payment Flow
      if (paymentMethod === 'cashfree') {
        if (!data.payment_session_id) {
          setErrorMessage('Payment session could not be established with Cashfree. Please try again.')
          setLoading(false)
          return
        }

        // Launch Cashfree SDK checkout
        try {
          const modeVal = (data.cf_mode || process.env.NEXT_PUBLIC_CASHFREE_MODE || '').trim().toLowerCase()
          const cashfreeMode: 'sandbox' | 'production' = modeVal === 'sandbox' ? 'sandbox' : 'production'
          const cashfree = await loadCashfree({ mode: cashfreeMode })
          if (!cashfree) {
            throw new Error('Cashfree payment SDK could not be loaded. Please check your network connection.')
          }

          const checkoutResult = await cashfree.checkout({
            paymentSessionId: data.payment_session_id,
            redirectTarget: '_self',
          })

          if (checkoutResult?.error) {
            setErrorMessage(checkoutResult.error.message || 'Payment checkout could not be opened.')
            setLoading(false)
            return
          }
        } catch (sdkErr: any) {
          console.error('Cashfree checkout initiation error:', sdkErr)
          setErrorMessage(sdkErr.message || 'Failed to open Cashfree payment gateway. Please try again.')
          setLoading(false)
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during checkout.')
      setLoading(false)
    }
  }

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi (NCR)', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh'
  ]

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Left Column: Delivery & Payment Details */}
      <div className="lg:col-span-7 space-y-8">
        {/* Contact Info */}
        <section className="bg-white border border-neutral-200 p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-extrabold text-black pb-2 border-b border-neutral-200">
            1. Contact Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Mihir Sharma"
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mihir@example.com"
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold mb-1">
              Mobile Number (10 Digits) *
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-neutral-300 bg-neutral-100 text-xs font-semibold text-neutral-600">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Used for courier delivery updates and Cashfree verification OTP.
            </p>
          </div>
        </section>

        {/* Shipping Address */}
        <section className="bg-white border border-neutral-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-200 gap-2">
            <h2 className="text-xs uppercase tracking-widest font-extrabold text-black">
              2. Shipping Address (India Only)
            </h2>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold bg-neutral-100 hover:bg-black hover:text-white text-black border border-black px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Detecting Location...' : 'Use Current Location'}</span>
            </button>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold mb-1">
              House / Flat / Street / Area *
            </label>
            <input
              type="text"
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="e.g. Flat 402, Block C, Green Park Residency"
              className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold mb-1">
              Landmark / Apartment / Suite (Optional)
            </label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Near Metro Station or landmark"
              className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs uppercase tracking-wider font-bold">
                  PIN Code *
                </label>
                {pinLoading && (
                  <span className="text-[10px] text-neutral-500 font-mono animate-pulse">
                    Detecting...
                  </span>
                )}
                {pinSuccessMsg && !pinLoading && (
                  <span className={`text-[10px] font-mono font-bold ${pinSuccessMsg.startsWith('✓') ? 'text-green-700' : 'text-amber-600'}`}>
                    {pinSuccessMsg}
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={6}
                required
                value={pinCode}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="e.g. 110001"
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New Delhi"
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                State *
              </label>
              <select
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              >
                <option value="">Select State</option>
                {indianStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold mb-1">
              Order Delivery Instructions (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Leave at front door or call upon arrival"
              className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
            />
          </div>
        </section>

        {/* Payment Method Selector */}
        <section className="bg-white border border-neutral-200 p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-extrabold text-black pb-2 border-b border-neutral-200">
            3. Payment Method
          </h2>

          <div className="space-y-3">
            {/* Cashfree Online */}
            <label
              className={`flex items-start p-4 border cursor-pointer transition-all ${
                paymentMethod === 'cashfree'
                  ? 'border-black bg-neutral-50 ring-1 ring-black'
                  : 'border-neutral-300 hover:border-neutral-400 bg-white'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="cashfree"
                checked={paymentMethod === 'cashfree'}
                onChange={() => setPaymentMethod('cashfree')}
                className="mt-0.5 mr-3 accent-black"
              />
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold flex items-center">
                    <CreditCard size={15} className="mr-2" />
                    Cashfree Payments (Online Instant)
                  </span>
                  <span className="text-[10px] bg-black text-white font-extrabold uppercase px-2 py-0.5">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Wallets. Fast and 100% secure.
                </p>
              </div>
            </label>

            {/* Cash on Delivery */}
            <label
              className={`flex items-start p-4 border cursor-pointer transition-all ${
                paymentMethod === 'cod'
                  ? 'border-black bg-neutral-50 ring-1 ring-black'
                  : 'border-neutral-300 hover:border-neutral-400 bg-white'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="mt-0.5 mr-3 accent-black"
              />
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold flex items-center">
                    <Banknote size={15} className="mr-2" />
                    Cash on Delivery (COD)
                  </span>
                  <span className="text-xs font-semibold text-neutral-600">
                    +₹{Math.round(summary.cod_fee_paise / 100)} Handling Fee
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Pay with cash or UPI QR code at your doorstep upon parcel delivery.
                </p>
              </div>
            </label>
          </div>
        </section>

        {errorMessage && (
          <div className="p-4 bg-neutral-100 border border-black text-xs font-semibold text-black">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Right Column: Order Summary & Placement */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#F8F8F6] border border-neutral-200 p-6 space-y-5 sticky top-28">
          <h3 className="text-xs uppercase tracking-widest font-extrabold pb-3 border-b border-neutral-200">
            Items in Bag ({items.length})
          </h3>

          {/* Line item previews */}
          <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-neutral-200">
            {items.map((item) => {
              const prod = item.variant?.product
              if (!prod) return null
              const firstImg = prod.images?.[0]?.image_url

              return (
                <div key={item.id} className="pt-2 flex items-center gap-3">
                  <div className="relative w-12 h-16 bg-neutral-100 border shrink-0 overflow-hidden">
                    {firstImg ? (
                      <Image
                        src={getSafeImageUrl(firstImg)}
                        alt={prod.name}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-grow text-xs">
                    <p className="font-bold line-clamp-1">{prod.name}</p>
                    <p className="text-neutral-500 text-[11px] uppercase">
                      {item.variant.color} / {item.variant.size} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold shrink-0">
                    {formatPrice(prod.selling_price * item.quantity)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Coupon Code */}
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Discount Code"
                className="bg-white border border-neutral-300 px-3 py-2 text-xs flex-grow uppercase font-semibold focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="bg-black text-white px-3.5 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800"
              >
                Apply
              </button>
            </div>
            {couponMessage && (
              <p className="text-[11px] font-semibold text-neutral-600 mt-1 flex items-center">
                <Tag size={12} className="mr-1" /> {couponMessage}
              </p>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 text-xs border-t border-neutral-200 pt-3">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>{formatPrice(Math.round(subtotalPaise / 100))}</span>
            </div>

            {couponDiscountPaise > 0 && (
              <div className="flex justify-between text-black font-bold">
                <span>Coupon Discount</span>
                <span>-{formatPrice(Math.round(couponDiscountPaise / 100))}</span>
              </div>
            )}

            <div className="flex justify-between text-neutral-600">
              <span>Shipping Fee</span>
              <span>
                {shippingPaise === 0 ? (
                  <span className="font-bold text-black uppercase">FREE</span>
                ) : (
                  formatPrice(Math.round(shippingPaise / 100))
                )}
              </span>
            </div>

            {paymentMethod === 'cod' && (
              <div className="flex justify-between text-neutral-600">
                <span>COD Handling Fee</span>
                <span>{formatPrice(Math.round(codFeePaise / 100))}</span>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-200 flex justify-between text-base font-extrabold text-black">
              <span>Total Payable</span>
              <span>{formatPrice(Math.round(totalPaise / 100))}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white hover:bg-neutral-800 h-13 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all disabled:opacity-50"
          >
            {loading ? (
              'Securing Order...'
            ) : paymentMethod === 'cashfree' ? (
              <>
                Pay With Cashfree <ArrowRight size={15} className="ml-2" />
              </>
            ) : (
              'Confirm Cash on Delivery Order'
            )}
          </button>

          <div className="flex items-center justify-center space-x-2 text-[11px] text-neutral-500 text-center pt-1">
            <ShieldCheck size={14} />
            <span>256-Bit SSL Encrypted &amp; Authoritative Server Protection</span>
          </div>
        </div>
      </div>
    </form>
  )
}
