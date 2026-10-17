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
import { OrderSuccessView } from '@/components/order/order-success-view'

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
            // Still pending or unpaid
            if (isManual) {
              setStatus('failed')
              setFailureReason('No successful payment was received for this order.')
              fetch(`/api/payments/verify?order_id=${encodeURIComponent(orderNumber)}&mark_failed=1`).catch(() => {})
            } else {
              setStatus('verifying')
            }
          }
        } else if (!res.ok) {
          setFailureReason(data.error || 'Could not verify payment status.')
          if (isManual) {
            setStatus('failed')
          }
        }
      } catch (err: any) {
        console.error('Payment polling error:', err)
      } finally {
        if (isManual) setIsRefreshing(false)
      }
    },
    [orderNumber]
  )

  // Bounded Polling Effect (runs up to 4 times, ~10s, then marks failed if unpaid)
  useEffect(() => {
    if (status === 'paid' || status === 'failed') return

    // If already verified paid on server render, stop
    if (initialStatus === 'paid') {
      setStatus('paid')
      return
    }

    if (pollCount >= 4) {
      if (status === 'verifying') {
        setStatus('failed')
        setFailureReason('Payment was not completed. No confirmation was received from your bank or gateway.')
        fetch(`/api/payments/verify?order_id=${encodeURIComponent(orderNumber)}&mark_failed=1`).catch(() => {})
      }
      return
    }

    const timer = setTimeout(() => {
      verifyPayment()
      setPollCount((prev) => prev + 1)
    }, 2500)

    return () => clearTimeout(timer)
  }, [status, pollCount, verifyPayment, initialStatus, orderNumber])

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
    return <OrderSuccessView order={order} orderNumber={orderNumber} />
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
            'Your payment was not completed or was declined. No funds were debited from your account. Unconfirmed orders will not appear in My Orders. You can retry payment safely.'}
        </p>

        <div className="mt-6 inline-block bg-[#F8F8F6] border border-black/30 px-4 py-2 text-xs font-mono font-bold">
          Order Reference: {orderNumber}
        </div>

        {/* Action Buttons */}
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
            href="/shop"
            className="w-full sm:w-auto border border-neutral-300 hover:border-black text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
          >
            Continue Shopping
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

      {/* Action Buttons */}
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
          href="/shop"
          className="w-full sm:w-auto border-2 border-black bg-white hover:bg-neutral-100 text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
