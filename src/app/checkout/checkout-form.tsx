'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  CreditCard,
  Banknote,
  Tag,
  ArrowRight,
  Navigation,
  AlertCircle,
  Edit2,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  MapPin,
  Check
} from 'lucide-react'
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
    stock?: number
    is_active?: boolean
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

  // Double click lock ref
  const isSubmittingRef = useRef(false)
  const addressSectionRef = useRef<HTMLDivElement>(null)

  // Form fields
  const [fullName, setFullName] = useState(userName)
  const [email, setEmail] = useState(userEmail)
  const [phone, setPhone] = useState(userPhone)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [landmark, setLandmark] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'cod'>('cashfree')
  const [notes, setNotes] = useState('')

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/addresses')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
          setSavedAddresses(data.addresses)
          const def = data.addresses.find((a: any) => a.is_default) || data.addresses[0]
          if (def) {
            setSelectedSavedId(def.id)
            setFullName(def.full_name || userName)
            setPhone(def.phone || userPhone)
            setAddressLine1(def.address_line1 || '')
            setAddressLine2(def.address_line2 || '')
            setCity(def.city || '')
            setState(def.state || '')
            setPinCode(def.pin_code || '')
          }
        }
      })
      .catch(() => {})
  }, [userName, userPhone])

  const handleSelectSavedAddress = (addr: any) => {
    setSelectedSavedId(addr.id)
    setFullName(addr.full_name || '')
    setPhone(addr.phone || '')
    setAddressLine1(addr.address_line1 || '')
    setAddressLine2(addr.address_line2 || '')
    setCity(addr.city || '')
    setState(addr.state || '')
    setPinCode(addr.pin_code || '')
    setErrors({})
    toast.success('Saved address selected')
  }

  const handleClearToNewAddress = () => {
    setSelectedSavedId(null)
    setAddressLine1('')
    setAddressLine2('')
    setLandmark('')
    setCity('')
    setState('')
    setPinCode('')
  }

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Coupon state
  const [couponCode, setCouponCode] = useState(summary.coupon_code || '')
  const [couponDiscountPaise, setCouponDiscountPaise] = useState(summary.coupon_discount_paise || 0)
  const [couponMessage, setCouponMessage] = useState('')

  const [pinLoading, setPinLoading] = useState(false)
  const [pinSuccessMsg, setPinSuccessMsg] = useState('')
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Out of stock verification
  const isItemOutOfStock = (item: CartItemData) => {
    const stock = (item.variant as any)?.stock
    return typeof stock === 'number' && stock <= 0
  }
  const outOfStockItems = items.filter(isItemOutOfStock)
  const hasOutOfStockItems = outOfStockItems.length > 0

  // Check if address is complete for review
  const isAddressComplete = Boolean(
    fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phone.replace(/\D/g, '').length === 10 &&
    addressLine1.trim().length >= 5 &&
    city.trim().length >= 2 &&
    state.trim().length > 0 &&
    /^[1-9][0-9]{5}$/.test(pinCode.trim())
  )

  const validateField = (field: string, val: string): string => {
    switch (field) {
      case 'fullName':
        if (!val.trim()) return 'Full name is required.'
        if (val.trim().length < 2) return 'Full name must be at least 2 characters.'
        return ''
      case 'email':
        if (!val.trim()) return 'Email address is required.'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return 'Enter a valid email address (e.g. name@domain.com).'
        return ''
      case 'phone': {
        const clean = val.replace(/\D/g, '')
        if (!clean) return 'Mobile number is required.'
        if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
          return 'Enter a valid 10-digit Indian mobile number (starts with 6-9).'
        }
        return ''
      }
      case 'addressLine1':
        if (!val.trim()) return 'Street address or flat number is required.'
        if (val.trim().length < 5) return 'Please provide more details in your address.'
        return ''
      case 'city':
        if (!val.trim()) return 'City is required.'
        return ''
      case 'state':
        if (!val.trim()) return 'Please select a state.'
        return ''
      case 'pinCode': {
        const cleanPin = val.trim()
        if (!cleanPin) return 'PIN code is required.'
        if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
          return 'Enter a valid 6-digit Indian PIN code (e.g. 110001).'
        }
        return ''
      }
      default:
        return ''
    }
  }

  const handleFieldChange = (field: string, val: string, setter: (v: string) => void) => {
    setter(val)
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleBlur = (field: string, val: string) => {
    const err = validateField(field, val)
    setErrors((prev) => {
      if (err) return { ...prev, [field]: err }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handlePinChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    setPinCode(clean)
    setPinSuccessMsg('')
    if (errors.pinCode) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.pinCode
        return next
      })
    }

    if (clean.length === 6) {
      if (!/^[1-9][0-9]{5}$/.test(clean)) {
        setErrors((prev) => ({ ...prev, pinCode: 'PIN code must not start with 0.' }))
        return
      }
      setPinLoading(true)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`)
        const data = await res.json()
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0]
          const detectedCity = po.District || po.Block || po.Name
          const detectedState = po.State
          if (detectedCity) {
            setCity(detectedCity)
            setErrors((prev) => {
              const next = { ...prev }
              delete next.city
              return next
            })
          }
          if (detectedState) {
            const matchedState = indianStates.find(
              (s) => s.toLowerCase() === detectedState.toLowerCase() ||
                     (detectedState.toLowerCase() === 'delhi' && s.includes('Delhi'))
            )
            setState(matchedState || detectedState)
            setErrors((prev) => {
              const next = { ...prev }
              delete next.state
              return next
            })
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
            setErrors((prev) => {
              const next = { ...prev }
              delete next.addressLine1
              return next
            })
          }
          if (addr.city) {
            setCity(addr.city)
            setErrors((prev) => {
              const next = { ...prev }
              delete next.city
              return next
            })
          }
          if (addr.state) {
            const matchedState = indianStates.find(
              (s) =>
                s.toLowerCase() === addr.state.toLowerCase() ||
                s.toLowerCase().includes(addr.state.toLowerCase()) ||
                addr.state.toLowerCase().includes(s.toLowerCase())
            )
            setState(matchedState || addr.state)
            setErrors((prev) => {
              const next = { ...prev }
              delete next.state
              return next
            })
          }
          if (addr.pin_code && addr.pin_code.length === 6) {
            setPinCode(addr.pin_code)
            setPinSuccessMsg(`✓ ${addr.city || ''}, ${addr.state || ''}`)
            setErrors((prev) => {
              const next = { ...prev }
              delete next.pinCode
              return next
            })
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

    // Prevent double submissions
    if (isSubmittingRef.current || loading) {
      return
    }

    // Check for out-of-stock items in cart
    if (hasOutOfStockItems) {
      setErrorMessage('One or more items in your cart are currently out of stock. Please edit your bag before continuing.')
      toast.error('Cannot proceed: Out-of-stock items in bag.')
      return
    }

    // Full validation
    const newErrors: Record<string, string> = {}
    const nameErr = validateField('fullName', fullName)
    if (nameErr) newErrors.fullName = nameErr
    const emailErr = validateField('email', email)
    if (emailErr) newErrors.email = emailErr
    const phoneErr = validateField('phone', phone)
    if (phoneErr) newErrors.phone = phoneErr
    const addrErr = validateField('addressLine1', addressLine1)
    if (addrErr) newErrors.addressLine1 = addrErr
    const pinErr = validateField('pinCode', pinCode)
    if (pinErr) newErrors.pinCode = pinErr
    const cityErr = validateField('city', city)
    if (cityErr) newErrors.city = cityErr
    const stateErr = validateField('state', state)
    if (stateErr) newErrors.state = stateErr

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const firstField = Object.keys(newErrors)[0]
      setErrorMessage(newErrors[firstField])
      toast.error('Please complete all required address fields.')
      addressSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    isSubmittingRef.current = true
    setLoading(true)

    const cleanPhone = phone.replace(/\D/g, '')

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
          landmark: landmark.trim() || undefined,
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
        isSubmittingRef.current = false
        setLoading(false)
        return
      }

      // Order created successfully! Clear cart counter
      setItemCount(0)

      if (paymentMethod === 'cod') {
        router.push(data.redirect_url || `/orders/${data.order_number}/payment?order_id=${data.order_number}&method=cod`)
        return
      }

      // Cashfree Online Payment Flow:
      // Navigate to the persistent order payment and recovery page.
      // This guarantees that if the customer cancels, closes checkout, or uses browser back,
      // they land on the dedicated recovery page for this SAME order with all items preserved.
      if (paymentMethod === 'cashfree') {
        if (!data.payment_session_id) {
          setErrorMessage('Payment session could not be established with Cashfree. Please try again.')
          isSubmittingRef.current = false
          setLoading(false)
          return
        }

        router.push(`/orders/${data.order_number}/payment?session_id=${encodeURIComponent(data.payment_session_id)}&auto=1`)
        return
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during checkout.')
      isSubmittingRef.current = false
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
      <div className="lg:col-span-7 space-y-8" ref={addressSectionRef}>
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
                value={fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value, setFullName)}
                onBlur={(e) => handleBlur('fullName', e.target.value)}
                placeholder="e.g. Mihir Sharma"
                className={`w-full bg-white border px-3.5 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                  errors.fullName ? 'border-red-500 bg-red-50/20 focus:border-red-500' : 'border-neutral-300 focus:border-black'
                }`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
                onBlur={(e) => handleBlur('email', e.target.value)}
                placeholder="mihir@example.com"
                className={`w-full bg-white border px-3.5 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                  errors.email ? 'border-red-500 bg-red-50/20 focus:border-red-500' : 'border-neutral-300 focus:border-black'
                }`}
              />
              {errors.email && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold mb-1">
              Mobile Number (10 Digits) *
            </label>
            <div className="flex">
              <span className={`inline-flex items-center px-3 border border-r-0 text-xs font-semibold ${
                errors.phone ? 'border-red-500 bg-red-50 text-red-700' : 'border-neutral-300 bg-neutral-100 text-neutral-600'
              }`}>
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => handleFieldChange('phone', e.target.value.replace(/\D/g, ''), setPhone)}
                onBlur={(e) => handleBlur('phone', e.target.value)}
                placeholder="9876543210"
                className={`w-full bg-white border px-3.5 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                  errors.phone ? 'border-red-500 bg-red-50/20 focus:border-red-500' : 'border-neutral-300 focus:border-black'
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                <AlertCircle size={12} className="shrink-0" />
                <span>{errors.phone}</span>
              </p>
            ) : (
              <p className="text-[11px] text-neutral-400 mt-1">
                Used strictly for delivery coordination by courier logistics.
              </p>
            )}
          </div>
        </section>

        {/* Shipping Address */}
        <section ref={addressSectionRef} className="bg-white border border-neutral-200 p-6 space-y-4">
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

          {/* Saved Addresses Selector */}
          {savedAddresses.length > 0 && (
            <div className="space-y-2 pb-3 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-neutral-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-black" />
                  <span>Choose From Saved Addresses</span>
                </span>
                {selectedSavedId && (
                  <button
                    type="button"
                    onClick={handleClearToNewAddress}
                    className="text-[11px] font-mono uppercase text-neutral-600 hover:text-black underline cursor-pointer"
                  >
                    + Enter New Address
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedAddresses.map((sa) => {
                  const isSelected = selectedSavedId === sa.id
                  return (
                    <button
                      key={sa.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress(sa)}
                      className={`p-3 text-left border text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? 'border-black bg-neutral-100 ring-1 ring-black'
                          : 'border-neutral-200 hover:border-black bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-black">{sa.full_name}</span>
                        {sa.is_default && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-black text-white font-bold">Default</span>
                        )}
                      </div>
                      <p className="text-neutral-600 text-[11px] mt-1 line-clamp-1">
                        {sa.address_line1}
                      </p>
                      <p className="text-neutral-500 text-[11px]">
                        {sa.city}, {sa.state} — {sa.pin_code}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider font-bold mb-1">
              House / Flat / Street / Area *
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => handleFieldChange('addressLine1', e.target.value, setAddressLine1)}
              onBlur={(e) => handleBlur('addressLine1', e.target.value)}
              placeholder="e.g. Flat 402, Block C, Green Park Residency"
              className={`w-full bg-white border px-3.5 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                errors.addressLine1 ? 'border-red-500 bg-red-50/20 focus:border-red-500' : 'border-neutral-300 focus:border-black'
              }`}
            />
            {errors.addressLine1 && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                <AlertCircle size={12} className="shrink-0" />
                <span>{errors.addressLine1}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                Apartment / Floor / Building (Optional)
              </label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="e.g. 4th Floor"
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                Landmark (Optional)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Metro Station / Behind Mall"
                className="w-full bg-white border border-neutral-300 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-black"
              />
            </div>
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
                value={pinCode}
                onChange={(e) => handlePinChange(e.target.value)}
                onBlur={(e) => handleBlur('pinCode', e.target.value)}
                placeholder="e.g. 110001"
                className={`w-full bg-white border px-3.5 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                  errors.pinCode ? 'border-red-500 bg-red-50/20 focus:border-red-500' : 'border-neutral-300 focus:border-black'
                }`}
              />
              {errors.pinCode && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{errors.pinCode}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => handleFieldChange('city', e.target.value, setCity)}
                onBlur={(e) => handleBlur('city', e.target.value)}
                placeholder="New Delhi"
                className={`w-full bg-white border px-3.5 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                  errors.city ? 'border-red-500 bg-red-50/20 focus:border-red-500' : 'border-neutral-300 focus:border-black'
                }`}
              />
              {errors.city && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{errors.city}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-1">
                State *
              </label>
              <select
                value={state}
                onChange={(e) => handleFieldChange('state', e.target.value, setState)}
                onBlur={(e) => handleBlur('state', e.target.value)}
                className={`w-full bg-white border px-3.5 py-2.5 text-xs font-medium focus:outline-none transition-colors ${
                  errors.state ? 'border-red-500 bg-red-50/20 focus:border-red-500' : 'border-neutral-300 focus:border-black'
                }`}
              >
                <option value="">Select State</option>
                {indianStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.state && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{errors.state}</span>
                </p>
              )}
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

        {/* Address & Delivery Review Box */}
        <section className="bg-neutral-50 border border-neutral-300 p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={18}
                className={isAddressComplete ? 'text-emerald-600' : 'text-neutral-400'}
              />
              <span className="text-xs uppercase tracking-wider font-extrabold text-black">
                Review Delivery Destination
              </span>
            </div>
            {isAddressComplete && (
              <button
                type="button"
                onClick={() => {
                  addressSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-[11px] font-bold text-black underline flex items-center gap-1 hover:text-neutral-600 cursor-pointer"
              >
                <Edit2 size={12} />
                Edit Address
              </button>
            )}
          </div>
          {isAddressComplete ? (
            <div className="text-xs space-y-1.5 pt-1 text-neutral-800">
              <p className="font-extrabold text-black flex items-center gap-2">
                <span>{fullName}</span>
                <span className="text-neutral-400 font-normal">|</span>
                <span className="font-mono text-neutral-700">+91 {phone.replace(/\D/g, '')}</span>
              </p>
              <p className="text-neutral-700 leading-relaxed">
                {addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}{landmark ? `, Near ${landmark}` : ''}
              </p>
              <p className="font-semibold text-neutral-900">
                {city}, {state} &mdash; <span className="font-mono font-bold">{pinCode}</span>
              </p>
              <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200">
                Order confirmation and tracking link will be emailed to: <span className="font-bold text-black">{email}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic leading-relaxed">
              Fill in your contact information and shipping address above. A full delivery summary will appear here for verification before payment.
            </p>
          )}
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
          <div className="p-4 bg-red-50 border border-red-300 text-xs font-semibold text-red-800 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Right Column: Order Summary & Review */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#F8F8F6] border border-neutral-200 p-6 space-y-5 sticky top-28">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <h3 className="text-xs uppercase tracking-widest font-extrabold flex items-center gap-2">
              <ShoppingBag size={14} />
              Review Bag Items ({items.length})
            </h3>
            <Link
              href="/cart"
              className="text-[11px] font-bold text-neutral-600 hover:text-black underline flex items-center gap-1"
            >
              <Edit2 size={11} />
              Edit Cart
            </Link>
          </div>

          {/* Line item reviews with size, quantity, and edit options */}
          <div className="max-h-72 overflow-y-auto space-y-3 pr-1 divide-y divide-neutral-200">
            {items.map((item) => {
              const prod = item.variant?.product
              if (!prod) return null
              const firstImg = prod.images?.[0]?.image_url
              const isOutOfStock = isItemOutOfStock(item)

              return (
                <div key={item.id} className="pt-3 pb-1 flex items-start gap-3">
                  <div className="relative w-14 h-18 bg-neutral-100 border shrink-0 overflow-hidden">
                    {firstImg ? (
                      <Image
                        src={getSafeImageUrl(firstImg)}
                        alt={prod.name}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-grow text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold line-clamp-1">{prod.name}</p>
                      <span className="text-xs font-extrabold shrink-0">
                        {formatPrice(prod.selling_price * item.quantity)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="bg-black text-white font-mono font-bold px-1.5 py-0.5 uppercase text-[10px]">
                        Size: {item.variant.size}
                      </span>
                      <span className="bg-neutral-200 text-neutral-900 font-semibold px-1.5 py-0.5 uppercase text-[10px]">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-neutral-500 text-[11px] uppercase font-medium">
                        {item.variant.color}
                      </span>
                    </div>

                    {isOutOfStock ? (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 mt-1">
                        <AlertCircle size={10} /> OUT OF STOCK
                      </div>
                    ) : null}

                    <div className="pt-1">
                      <Link
                        href="/cart"
                        className="text-[11px] text-neutral-500 hover:text-black underline font-medium flex items-center gap-1"
                      >
                        <Edit2 size={10} /> Change size/qty
                      </Link>
                    </div>
                  </div>
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
                className="bg-black text-white px-3.5 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 cursor-pointer"
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

          {/* Out of Stock Warning Banner */}
          {hasOutOfStockItems && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <AlertCircle size={14} className="shrink-0" />
                <span>Out of Stock Item Detected</span>
              </div>
              <p className="text-[11px] text-red-700">
                One or more items in your bag are currently unavailable. Please adjust your bag in order to complete checkout.
              </p>
              <Link
                href="/cart"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-900 underline pt-1"
              >
                <Edit2 size={11} /> Return to Cart to Update Items
              </Link>
            </div>
          )}

          {/* Submit Button with Loading Spinner & Double-Click Guard */}
          <button
            type="submit"
            disabled={loading || hasOutOfStockItems}
            className="w-full bg-black text-white hover:bg-neutral-800 h-13 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                {paymentMethod === 'cashfree' ? 'Securing Cashfree Checkout...' : 'Confirming COD Order...'}
              </span>
            ) : hasOutOfStockItems ? (
              'Remove Out-of-Stock Items'
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
