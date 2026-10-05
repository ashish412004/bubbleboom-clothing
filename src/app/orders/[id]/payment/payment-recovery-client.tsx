'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Download,
  Package,
  MapPin,
  RefreshCw,
  ShoppingBag,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { formatPrice, getSafeImageUrl } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import toast from 'react-hot-toast'
import { load as loadCashfree } from '@cashfreepayments/cashfree-js'

interface PaymentRecoveryClientProps {
  order: any
  initialStatus: 'verifying' | 'paid' | 'pending' | 'failed'
  initialReason?: string
  initialSessionId?: string
  autoLaunch?: boolean
}

export function PaymentRecoveryClient({
  order: initialOrder,
  initialStatus,
  initialReason = '',
  initialSessionId,
  autoLaunch = false,
}: PaymentRecoveryClientProps) {
  const router = useRouter()
  const setItemCount = useCartStore((state) => state.setItemCount)

  const [order, setOrder] = useState<any>(initialOrder)
  const [status, setStatus] = useState<'verifying' | 'paid' | 'pending' | 'failed'>(initialStatus)
  const [failureReason, setFailureReason] = useState<string>(initialReason)
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString('en-IN'))

  const [isRetrying, setIsRetrying] = useState(false)
  const [isRestoringCart, setIsRestoringCart] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const retryRef = useRef(false)
  const hasAutoLaunchedRef = useRef(false)
  const pollCountRef = useRef(0)

  const orderNumber = order?.order_number || ''

  // 1. Authoritative Server Verification Call
  const verifyPayment = useCallback(
    async (isManual = false) => {
      if (!orderNumber) return
      if (isManual) setIsCheckingStatus(true)

      try {
        const res = await fetch(`/api/payments/verify?order_id=${encodeURIComponent(orderNumber)}`)
        const data = await res.json()
        setLastChecked(new Date().toLocaleTimeString('en-IN'))

        if (res.ok && data.status) {
          if (data.order) {
            setOrder(data.order)
          }

          if (data.status === 'paid') {
            setStatus('paid')
            if (isManual) toast.success('Payment verified successfully!')
          } else if (data.status === 'failed') {
            setStatus('failed')
            setFailureReason(data.reason || 'Payment was cancelled or rejected by your bank.')
          } else {
            // Still pending / active
            setStatus('pending')
            if (isManual) {
              toast('Payment status is still pending with your bank.', { icon: '⏳' })
            }
          }
        }
      } catch (err) {
        console.error('Payment status check error:', err)
      } finally {
        if (isManual) setIsCheckingStatus(false)
      }
    },
    [orderNumber]
  )

  // 2. Window focus & Page visibility re-check (e.g. returning from UPI app or external tab)
  useEffect(() => {
    if (status === 'paid') return

    const handleFocusOrVisible = () => {
      verifyPayment()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyPayment()
      }
    }

    window.addEventListener('focus', handleFocusOrVisible)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, verifyPayment])

  // 3. Auto-launch Cashfree Checkout on first arrival from checkout page (if requested)
  useEffect(() => {
    if (hasAutoLaunchedRef.current) return
    if (!autoLaunch || !initialSessionId || status === 'paid') return

    hasAutoLaunchedRef.current = true

    const launchInitialSession = async () => {
      try {
        const cfMode = (process.env.NEXT_PUBLIC_CASHFREE_MODE || 'production').trim().toLowerCase()
        const cashfreeMode = cfMode === 'sandbox' ? 'sandbox' : 'production'
        const cashfree = await loadCashfree({ mode: cashfreeMode })
        if (cashfree) {
          const res = await cashfree.checkout({
            paymentSessionId: initialSessionId,
            redirectTarget: '_self',
          })
          if (res?.error) {
            setStatus('failed')
            setFailureReason(res.error.message || 'Payment checkout could not be opened.')
          }
        }
      } catch (err: any) {
        console.error('Auto launch checkout error:', err)
      }
    }

    launchInitialSession()
  }, [autoLaunch, initialSessionId, status])

  // 4. Polling while status is 'verifying'
  useEffect(() => {
    if (status !== 'verifying') return

    if (pollCountRef.current >= 4) {
      // Transition gracefully to pending (do not mark failed prematurely)
      setStatus('pending')
      return
    }

    const timer = setTimeout(() => {
      pollCountRef.current += 1
      verifyPayment()
    }, 2500)

    return () => clearTimeout(timer)
  }, [status, verifyPayment])

  // 5. Handle Retry Payment Action
  const handleRetryPayment = async () => {
    if (retryRef.current || isRetrying) return
    retryRef.current = true
    setIsRetrying(true)

    try {
      const res = await fetch('/api/payments/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderNumber }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast.error(data.error || 'Unable to retry payment. Please check your order details.')
        retryRef.current = false
        setIsRetrying(false)
        return
      }

      if (!data.payment_session_id) {
        toast.error('Payment gateway did not provide a valid payment session.')
        retryRef.current = false
        setIsRetrying(false)
        return
      }

      // Launch Cashfree SDK for the retried attempt
      const cfMode = (data.cf_mode || process.env.NEXT_PUBLIC_CASHFREE_MODE || 'production').trim().toLowerCase()
      const cashfreeMode = cfMode === 'sandbox' ? 'sandbox' : 'production'
      const cashfree = await loadCashfree({ mode: cashfreeMode })

      if (!cashfree) {
        throw new Error('Cashfree SDK could not be loaded.')
      }

      const checkoutRes = await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: '_self',
      })

      if (checkoutRes?.error) {
        toast.error(checkoutRes.error.message || 'Payment window could not be opened.')
        setStatus('failed')
        setFailureReason(checkoutRes.error.message || 'Checkout closed or cancelled.')
        retryRef.current = false
        setIsRetrying(false)
      }
    } catch (err: any) {
      console.error('Retry payment error:', err)
      toast.error(err.message || 'Network error during retry.')
      retryRef.current = false
      setIsRetrying(false)
    }
  }

  // 6. Handle Back to Cart Action (Reconciles order items into cart without duplicating)
  const handleBackToCart = async () => {
    if (isRestoringCart) return
    setIsRestoringCart(true)

    try {
      const res = await fetch('/api/cart/restore-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderNumber }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        if (typeof data.count === 'number') {
          setItemCount(data.count)
        }
        toast.success('Your bag has been restored.')
        router.push('/cart')
      } else {
        toast.error(data.error || 'Could not restore cart.')
        setIsRestoringCart(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to return to cart.')
      setIsRestoringCart(false)
    }
  }

  const shippingAddr = order?.shipping_address as any
  const items = ((order?.order_items as any[]) || [])

  // ==========================================
  // VIEW 1: VERIFYING STATE
  // ==========================================
  if (status === 'verifying') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          Verifying Payment Status...
        </h1>
        <p className="text-xs text-neutral-600 mt-3 max-w-md mx-auto leading-relaxed">
          Please wait while we confirm your transaction securely with Cashfree and your bank.
        </p>
        <div className="mt-6 inline-block bg-[#F8F8F6] border border-black/30 px-4 py-2 text-xs font-mono font-bold">
          Order Reference: {orderNumber}
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: PAID / ORDER SUCCESSFUL
  // ==========================================
  if (status === 'paid') {
    const isCod = order?.payment_method === 'cod'
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <div className="text-center pb-8 border-b-2 border-black">
          <CheckCircle2 size={56} className="mx-auto text-black mb-3" />
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
            Order Placed Successfully!
          </h1>
          <p className="text-xs sm:text-sm font-medium text-neutral-600 mt-2">
            {isCod
              ? 'Your Cash on Delivery order is confirmed. Please keep cash or UPI ready upon delivery.'
              : 'Your payment has been received and verified. Thank you for shopping with Bubble Boom!'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold">
            <span className="bg-[#F8F8F6] border border-black px-3.5 py-1.5">
              ORDER #: <span className="text-black">{orderNumber}</span>
            </span>
            <span className="bg-[#F8F8F6] border border-black px-3.5 py-1.5">
              STATUS: <span className="text-black uppercase">PAID &amp; CONFIRMED</span>
            </span>
            <span className="bg-black text-white px-3.5 py-1.5 uppercase font-bold">
              ₹{order?.total_amount?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Order Details & Delivery Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-8">
          {/* Items Purchased */}
          <div className="md:col-span-7 bg-[#F8F8F6] border border-neutral-300 p-5 space-y-4">
            <h3 className="text-xs uppercase tracking-widest font-black pb-2 border-b border-neutral-200 flex items-center gap-2">
              <ShoppingBag size={14} />
              Purchased Items ({items.length})
            </h3>
            <div className="divide-y divide-neutral-200 space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => {
                const varInfo = item.variant_info || {}
                return (
                  <div key={item.id || idx} className="pt-3 flex items-start gap-3">
                    <div className="w-12 h-16 bg-neutral-200 border shrink-0 overflow-hidden relative">
                      {item.image_url ? (
                        <Image
                          src={getSafeImageUrl(item.image_url)}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 m-auto text-neutral-400 mt-5" />
                      )}
                    </div>
                    <div className="flex-grow text-xs">
                      <p className="font-bold line-clamp-1">{item.product_name}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                        <span className="bg-black text-white font-mono px-1.5 py-0.5 uppercase">
                          Size: {varInfo.size || 'M'}
                        </span>
                        <span className="bg-neutral-200 text-neutral-800 font-semibold px-1.5 py-0.5 uppercase">
                          Qty: {item.quantity}
                        </span>
                        {varInfo.color && (
                          <span className="text-neutral-500 uppercase">{varInfo.color}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-black shrink-0">
                      ₹{(item.total_amount || item.selling_price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Delivery Destination */}
          <div className="md:col-span-5 bg-white border border-neutral-300 p-5 space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-black pb-2 border-b border-neutral-200 flex items-center gap-2">
              <MapPin size={14} />
              Shipping Destination
            </h3>
            {shippingAddr ? (
              <div className="text-xs space-y-1 text-neutral-800">
                <p className="font-bold text-black">{shippingAddr.full_name}</p>
                <p className="text-neutral-600">{shippingAddr.address_line1}</p>
                {shippingAddr.address_line2 && (
                  <p className="text-neutral-600">{shippingAddr.address_line2}</p>
                )}
                <p className="font-semibold text-neutral-900">
                  {shippingAddr.city}, {shippingAddr.state} &mdash; <span className="font-mono font-bold">{shippingAddr.pin_code}</span>
                </p>
                {shippingAddr.phone && (
                  <p className="text-neutral-500 pt-1 font-mono text-[11px]">
                    Phone: +91 {shippingAddr.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Address recorded on file.</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-neutral-200">
          <Link
            href="/account/orders"
            className="w-full sm:w-auto bg-black text-white hover:bg-neutral-800 px-8 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors"
          >
            View in My Orders
          </Link>
          <Link
            href={`/account/orders/${orderNumber}`}
            className="w-full sm:w-auto border-2 border-black bg-white hover:bg-neutral-100 text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors"
          >
            Track Order Details
          </Link>
          <a
            href={`/api/orders/${orderNumber}/invoice`}
            download
            className="w-full sm:w-auto border border-neutral-300 hover:border-black text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download size={13} />
            <span>Download Invoice</span>
          </a>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 3: PENDING / UNKNOWN STATE
  // ==========================================
  if (status === 'pending') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
        <Clock size={56} className="mx-auto text-black mb-4" />
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          We&apos;re checking your payment.
        </h1>
        <div className="bg-amber-50 border border-amber-300 p-4 max-w-lg mx-auto mt-4 text-xs font-medium text-amber-900 leading-relaxed text-left">
          <p className="font-bold mb-1">Important Notice:</p>
          <p>
            If money was deducted from your bank or UPI app, please <strong>do not pay again yet</strong>. We are awaiting confirmation from Cashfree gateway and your bank.
          </p>
        </div>

        <div className="mt-6 space-y-1">
          <div className="inline-block bg-[#F8F8F6] border border-black/30 px-4 py-2 text-xs font-mono font-bold">
            Order Reference: {orderNumber}
          </div>
          <p className="text-[11px] font-mono text-neutral-400 mt-2">
            Last checked at: {lastChecked}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => verifyPayment(true)}
            disabled={isCheckingStatus}
            className="w-full sm:w-auto bg-black text-white hover:bg-neutral-800 px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isCheckingStatus ? 'animate-spin' : ''} />
            <span>{isCheckingStatus ? 'Checking with Bank...' : 'Check Payment Status'}</span>
          </button>

          <Link
            href="/account/orders"
            className="w-full sm:w-auto border-2 border-black bg-white hover:bg-neutral-100 text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors"
          >
            Go to My Orders
          </Link>

          <Link
            href="/shop"
            className="w-full sm:w-auto border border-neutral-300 hover:border-black text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 4: CONFIRMED UNSUCCESSFUL / CANCELLED (SAFE TO RETRY)
  // ==========================================
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
      <div className="text-center pb-8 border-b-2 border-black">
        <AlertCircle size={56} className="mx-auto text-black mb-3" />
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          Payment wasn&apos;t completed
        </h1>
        <p className="text-xs sm:text-sm font-medium text-neutral-600 mt-2 max-w-lg mx-auto">
          {failureReason ||
            'Your payment was not completed or was cancelled. No funds were debited from your account. Your order details and items are preserved below.'}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold">
          <span className="bg-[#F8F8F6] border border-black px-3.5 py-1.5">
            ORDER REFERENCE: <span className="text-black">{orderNumber}</span>
          </span>
          <span className="bg-neutral-100 border border-neutral-300 text-neutral-800 px-3.5 py-1.5 uppercase font-bold">
            Total Payable: ₹{order?.total_amount?.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Preserved Order Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-8">
        {/* Preserved Items */}
        <div className="md:col-span-7 bg-[#F8F8F6] border border-neutral-300 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <h3 className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
              <ShoppingBag size={14} />
              Preserved Order Items ({items.length})
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">Locked for Retry</span>
          </div>

          <div className="divide-y divide-neutral-200 space-y-3 max-h-72 overflow-y-auto pr-1">
            {items.map((item: any, idx: number) => {
              const varInfo = item.variant_info || {}
              return (
                <div key={item.id || idx} className="pt-3 flex items-start gap-3">
                  <div className="w-12 h-16 bg-neutral-200 border shrink-0 overflow-hidden relative">
                    {item.image_url ? (
                      <Image
                        src={getSafeImageUrl(item.image_url)}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Package className="w-5 h-5 m-auto text-neutral-400 mt-5" />
                    )}
                  </div>
                  <div className="flex-grow text-xs">
                    <p className="font-bold line-clamp-1">{item.product_name}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                      <span className="bg-black text-white font-mono px-1.5 py-0.5 uppercase">
                        Size: {varInfo.size || 'M'}
                      </span>
                      <span className="bg-neutral-200 text-neutral-800 font-semibold px-1.5 py-0.5 uppercase">
                        Qty: {item.quantity}
                      </span>
                      {varInfo.color && (
                        <span className="text-neutral-500 uppercase">{varInfo.color}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-black shrink-0">
                    ₹{(item.total_amount || item.selling_price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Preserved Delivery Destination */}
        <div className="md:col-span-5 bg-white border border-neutral-300 p-5 space-y-3">
          <h3 className="text-xs uppercase tracking-widest font-black pb-2 border-b border-neutral-200 flex items-center gap-2">
            <MapPin size={14} />
            Delivery Destination
          </h3>
          {shippingAddr ? (
            <div className="text-xs space-y-1 text-neutral-800">
              <p className="font-bold text-black">{shippingAddr.full_name}</p>
              <p className="text-neutral-600">{shippingAddr.address_line1}</p>
              {shippingAddr.address_line2 && (
                <p className="text-neutral-600">{shippingAddr.address_line2}</p>
              )}
              <p className="font-semibold text-neutral-900">
                {shippingAddr.city}, {shippingAddr.state} &mdash; <span className="font-mono font-bold">{shippingAddr.pin_code}</span>
              </p>
              {shippingAddr.phone && (
                <p className="text-neutral-500 pt-1 font-mono text-[11px]">
                  Phone: +91 {shippingAddr.phone}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">Address recorded on file.</p>
          )}

          <div className="pt-3 border-t border-neutral-200 text-xs flex justify-between font-bold">
            <span>Total Payable:</span>
            <span>₹{order?.total_amount?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Recovery Actions: Retry Payment or Back to Cart */}
      <div className="p-6 bg-[#F8F8F6] border border-black space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider font-black">
              Ready to Complete Your Purchase?
            </h4>
            <p className="text-xs text-neutral-600 mt-0.5">
              Retry securely against this order or restore these items back to your bag to edit sizes or quantities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Retry Payment Button (Double-click protected) */}
            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={isRetrying || isRestoringCart}
              className="w-full sm:w-auto bg-black text-white hover:bg-neutral-800 px-8 py-3.5 text-xs font-mono uppercase tracking-widest font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRetrying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Securing Payment Session...</span>
                </>
              ) : (
                <>
                  <span>Retry Payment</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {/* Back to Cart Button (Restores items without duplicating) */}
            <button
              type="button"
              onClick={handleBackToCart}
              disabled={isRetrying || isRestoringCart}
              className="w-full sm:w-auto border-2 border-black bg-white hover:bg-neutral-100 text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isRestoringCart ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Restoring Bag...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  <span>Back to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-200 flex flex-wrap items-center justify-between text-[11px] text-neutral-500 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>256-bit encrypted Cashfree checkout. No double charges.</span>
          </div>
          <Link href="/account/orders" className="underline font-bold text-neutral-700 hover:text-black">
            View in My Orders
          </Link>
        </div>
      </div>
    </div>
  )
}
