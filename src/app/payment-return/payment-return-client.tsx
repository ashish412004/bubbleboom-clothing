'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
} from 'lucide-react'
import { formatPrice, getSafeImageUrl } from '@/lib/utils'

interface PaymentReturnClientProps {
  orderNumber: string
  initialStatus: 'verifying' | 'paid' | 'failed' | 'pending'
  initialOrder: any | null
}

export function PaymentReturnClient({
  orderNumber,
  initialStatus,
  initialOrder,
}: PaymentReturnClientProps) {
  const [status, setStatus] = useState<'verifying' | 'paid' | 'failed' | 'pending'>(initialStatus)
  const [order, setOrder] = useState<any | null>(initialOrder)
  const [pollCount, setPollCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString('en-IN'))
  const [failureReason, setFailureReason] = useState<string>('')

  const verifyPayment = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true)
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
          } else if (data.status === 'failed') {
            setStatus('failed')
            setFailureReason(data.reason || 'Payment was cancelled or rejected by your bank.')
          } else {
            // Still pending
            setStatus('pending')
          }
        } else if (!res.ok) {
          setFailureReason(data.error || 'Could not verify payment status.')
        }
      } catch (err: any) {
        console.error('Payment polling error:', err)
      } finally {
        if (isManual) setIsRefreshing(false)
      }
    },
    [orderNumber]
  )

  // Bounded Polling Effect (runs up to 6 times if in verifying or pending state)
  useEffect(() => {
    if (status === 'paid' || status === 'failed') return

    // If already verified paid on server render, stop
    if (initialStatus === 'paid') {
      setStatus('paid')
      return
    }

    if (pollCount >= 6) {
      if (status === 'verifying') {
        setStatus('pending')
      }
      return
    }

    const timer = setTimeout(() => {
      verifyPayment()
      setPollCount((prev) => prev + 1)
    }, 2500)

    return () => clearTimeout(timer)
  }, [status, pollCount, verifyPayment, initialStatus])

  const shippingAddr = order?.shipping_address as any
  const items = (order?.order_items as any[]) || []

  // 1. VERIFYING STATE
  if (status === 'verifying') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          Verifying your payment...
        </h1>
        <p className="text-xs text-neutral-600 mt-3 max-w-md mx-auto">
          Please wait while we confirm your transaction securely with Cashfree and your bank. Do not close or refresh this window.
        </p>
        <div className="mt-6 inline-block bg-[#F8F8F6] border border-black/20 px-4 py-2 text-xs font-mono font-bold">
          Order Reference: {orderNumber}
        </div>
      </div>
    )
  }

  // 2. VERIFIED SUCCESSFUL PAYMENT (Requirement 9)
  if (status === 'paid') {
    const isCod = order?.payment_method === 'cod'
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        {/* Success Header */}
        <div className="text-center pb-8 border-b-2 border-black">
          <CheckCircle2 size={52} className="mx-auto text-black mb-3" />
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
            Order Placed Successfully!
          </h1>
          <p className="text-xs sm:text-sm font-medium text-neutral-600 mt-2">
            {isCod
              ? 'Your Cash on Delivery order is confirmed. Please keep cash or UPI ready upon delivery.'
              : 'Your payment has been received and verified. Thank you for wearing the boom!'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold">
            <span className="bg-[#F8F8F6] border border-black px-3.5 py-1.5">
              ORDER #: <span className="text-black">{order?.order_number || orderNumber}</span>
            </span>
            <span className="bg-[#F8F8F6] border border-black px-3.5 py-1.5">
              DATE: {new Date(order?.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="bg-black text-white px-3.5 py-1.5 uppercase">
              STATUS: {order?.status || 'CONFIRMED'}
            </span>
          </div>
        </div>

        {/* Purchased Items List */}
        <div className="py-8 border-b border-neutral-200">
          <h3 className="text-xs uppercase font-mono tracking-widest font-bold mb-4 flex items-center">
            <Package size={14} className="mr-2" />
            Purchased Products
          </h3>
          <div className="border border-black divide-y divide-neutral-200">
            {items.map((item) => {
              const v = item.variant_info || {}
              return (
                <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold uppercase text-black">{item.product_name}</p>
                    <p className="text-neutral-500 font-mono text-[11px] mt-0.5">
                      Size: {v.size || 'Standard'} • Color: {v.color || 'Standard'} • Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold font-mono">
                    {formatPrice(item.total_amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Delivery & Financial Summary */}
        <div className="py-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          {/* Shipping destination */}
          <div className="border border-black p-5 space-y-2 bg-[#F8F8F6]">
            <h4 className="font-bold uppercase tracking-wider flex items-center">
              <MapPin size={13} className="mr-1.5" /> Delivery Address
            </h4>
            <p className="font-bold text-black">{shippingAddr?.full_name}</p>
            <p className="text-neutral-600">{shippingAddr?.address_line1}</p>
            {shippingAddr?.address_line2 && <p className="text-neutral-600">{shippingAddr.address_line2}</p>}
            <p className="text-neutral-600">
              {shippingAddr?.city}, {shippingAddr?.state} — {shippingAddr?.pin_code}
            </p>
            <p className="text-neutral-600 font-mono mt-1">Phone: +91 {shippingAddr?.phone}</p>
          </div>

          {/* Payment & Charges Breakdown */}
          <div className="border border-black p-5 space-y-2 bg-[#F8F8F6] font-mono">
            <h4 className="font-bold uppercase tracking-wider font-sans">Payment Summary</h4>
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>₹{order?.subtotal?.toLocaleString('en-IN')}</span>
            </div>
            {order?.discount_amount > 0 && (
              <div className="flex justify-between font-bold text-black">
                <span>Discount</span>
                <span>-₹{order?.discount_amount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>Shipping</span>
              <span>{order?.shipping_amount === 0 ? 'FREE' : `₹${order?.shipping_amount?.toLocaleString('en-IN')}`}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Payment Method</span>
              <span className="uppercase font-bold text-black">{order?.payment_method}</span>
            </div>
            <div className="pt-2 border-t border-black flex justify-between font-black text-sm text-black">
              <span>Total Paid</span>
              <span>₹{order?.total_amount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* 4 Required Action Buttons (Requirement 9) */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/account/orders"
            className="border-2 border-black bg-white hover:bg-neutral-100 text-black py-3 px-3 text-[11px] font-mono uppercase tracking-wider font-bold text-center transition-colors"
          >
            View My Orders
          </Link>

          <Link
            href={`/account/orders/${order?.order_number || orderNumber}`}
            className="border-2 border-black bg-white hover:bg-neutral-100 text-black py-3 px-3 text-[11px] font-mono uppercase tracking-wider font-bold text-center transition-colors"
          >
            View This Order
          </Link>

          <a
            href={`/api/orders/${order?.order_number || orderNumber}/invoice`}
            download
            className="border-2 border-black bg-black text-white hover:bg-neutral-800 py-3 px-3 text-[11px] font-mono uppercase tracking-wider font-bold text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            <span>Download Invoice</span>
          </a>

          <Link
            href="/shop"
            className="border-2 border-black bg-white hover:bg-neutral-100 text-black py-3 px-3 text-[11px] font-mono uppercase tracking-wider font-bold text-center transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  // 3. CONFIRMED PAYMENT FAILED (Requirement 10)
  if (status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={52} className="mx-auto text-black mb-4" />
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          Payment failed — your order is not confirmed.
        </h1>
        <p className="text-xs text-neutral-600 mt-3 max-w-md mx-auto">
          {failureReason ||
            'Your bank or payment gateway did not complete the transaction. No funds were debited from your account. Your cart and selected items are still held so you can retry safely.'}
        </p>

        <div className="mt-6 inline-block bg-[#F8F8F6] border border-black/30 px-4 py-2 text-xs font-mono font-bold">
          Order Reference: {orderNumber}
        </div>

        {/* 3 Required Buttons (Requirement 10) */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/checkout"
            className="w-full sm:w-auto bg-black text-white hover:bg-neutral-800 px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
          >
            Try Payment Again
          </Link>

          <Link
            href="/cart"
            className="w-full sm:w-auto border-2 border-black bg-white hover:bg-neutral-100 text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
          >
            Return to Cart
          </Link>

          <Link
            href="/account/orders"
            className="w-full sm:w-auto border border-neutral-300 hover:border-black text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    )
  }

  // 4. PAYMENT PENDING (Requirement 11)
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <Clock size={52} className="mx-auto text-black mb-4" />
      <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
        Your payment is being confirmed.
      </h1>
      <p className="text-xs text-neutral-600 mt-3 max-w-md mx-auto">
        If you have already paid, please wait before trying again. We are awaiting confirmation from your bank or UPI gateway.
      </p>

      <div className="mt-6 space-y-1">
        <div className="inline-block bg-[#F8F8F6] border border-black/30 px-4 py-2 text-xs font-mono font-bold">
          Order Reference: {orderNumber}
        </div>
        <p className="text-[11px] font-mono text-neutral-400 mt-2">
          Last checked at: {lastChecked}
        </p>
      </div>

      {/* 2 Required Buttons (Requirement 11) */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => verifyPayment(true)}
          disabled={isRefreshing}
          className="w-full sm:w-auto bg-black text-white hover:bg-neutral-800 px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Checking...' : 'Check Payment Status'}</span>
        </button>

        <Link
          href="/account/orders"
          className="w-full sm:w-auto border-2 border-black bg-white hover:bg-neutral-100 text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
        >
          View My Orders
        </Link>
      </div>
    </div>
  )
}
