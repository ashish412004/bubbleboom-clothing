'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Printer,
  XCircle,
  RotateCcw,
  AlertCircle,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

export interface OrderItemDetail {
  id: string
  product_id?: string
  product_name: string
  quantity: number
  selling_price?: number
  total_amount?: number
  variant_info?: {
    size?: string
    color?: string
    sku?: string
    image_url?: string
  }
  image_url?: string
  product_variants?: Array<{
    id: string
    size: string
    color: string
    stock: number
    sku: string
  }>
}

export interface ReturnTrackingInfo {
  id: string
  return_reference: string
  request_type: 'return' | 'exchange'
  status: string
  reason: string
  refund_amount: number
  refund_status: string
  pickup_status: string
  courier_name?: string | null
  reverse_awb?: string | null
  tracking_url?: string | null
  pickup_scheduled_date?: string | null
  received_at?: string | null
  inspection_result?: string | null
  rejection_reason?: string | null
  created_at: string
  items?: any[]
}

interface OrderActionsProps {
  orderId: string
  orderNumber: string
  status: string
  paymentMethod?: string
  deliveryDate?: string | null
  items: OrderItemDetail[]
  existingReturns?: ReturnTrackingInfo[]
}

export function OrderActions({
  orderId,
  orderNumber,
  status,
  paymentMethod = 'cashfree',
  deliveryDate,
  items,
  existingReturns = [],
}: OrderActionsProps) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [returning, setReturning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeReturns, setActiveReturns] = useState<ReturnTrackingInfo[]>(existingReturns)

  // Cancellation state
  const [cancelReason, setCancelReason] = useState('')

  // Return / Exchange modal state
  const [requestType, setRequestType] = useState<'return' | 'exchange'>('return')
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '')
  const [returnQty, setReturnQty] = useState(1)
  const [returnReason, setReturnReason] = useState('Incorrect Size / Fit')
  const [returnNotes, setReturnNotes] = useState('')
  const [exchangeVariantId, setExchangeVariantId] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Bank details for COD return
  const [bankHolder, setBankHolder] = useState('')
  const [bankAccNumber, setBankAccNumber] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [upiId, setUpiId] = useState('')

  // Eligibility calculation: MUST be status === 'delivered' and within 7 calendar days
  const isDelivered = status === 'delivered'
  const isCod = paymentMethod.toLowerCase() === 'cod'

  const deliveryTimestamp = deliveryDate ? new Date(deliveryDate).getTime() : Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const isWithin7Days = isDelivered && Date.now() <= deliveryTimestamp + sevenDaysMs
  const daysRemaining = isDelivered
    ? Math.max(0, Math.ceil((deliveryTimestamp + sevenDaysMs - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const canCancel = ['pending', 'confirmed', 'packed'].includes(status)
  const canReturnOrExchange = isDelivered && isWithin7Days

  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0]
  const availableVariants = selectedItem?.product_variants || []

  // Load existing returns dynamically if not provided
  useEffect(() => {
    async function loadReturns() {
      try {
        const res = await fetch(`/api/returns?order_id=${orderId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.returns) {
            setActiveReturns(data.returns)
          }
        }
      } catch {}
    }
    loadReturns()
  }, [orderId])

  const handlePrint = () => {
    window.print()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/returns/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setUploadedImages((prev) => [...prev, data.url])
      toast.success('Photo proof uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Error uploading photo')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason: cancelReason }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order')

      toast.success('Order cancelled successfully')
      setCancelling(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling order')
    } finally {
      setLoading(false)
    }
  }

  const handleReturnOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (requestType === 'exchange' && !exchangeVariantId) {
      toast.error('Please select your exchange replacement size/color variant')
      return
    }

    if (requestType === 'return' && isCod) {
      if (!upiId.trim() && (!bankHolder.trim() || !bankAccNumber.trim() || !bankIfsc.trim())) {
        toast.error('Please provide UPI ID or complete bank details for your COD refund payout')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          order_item_id: selectedItemId,
          quantity: returnQty,
          reason: returnReason,
          notes: returnNotes,
          request_type: requestType,
          exchange_variant_id: requestType === 'exchange' ? exchangeVariantId : null,
          images: uploadedImages,
          bank_details:
            isCod && requestType === 'return'
              ? {
                  account_holder_name: bankHolder,
                  account_number: bankAccNumber,
                  ifsc_code: bankIfsc,
                  upi_id: upiId,
                }
              : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')

      toast.success(
        requestType === 'exchange'
          ? 'Exchange request initiated. We will review and book reverse pickup.'
          : 'Return request submitted. We will review and book reverse pickup.'
      )
      setReturning(false)
      if (data.return) {
        setActiveReturns((prev) => [data.return, ...prev])
      }
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error submitting request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing Return / Exchange Tracking Timeline Banner */}
      {activeReturns.length > 0 && (
        <div className="border-2 border-black bg-white p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <span className="text-[11px] font-black uppercase font-mono tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Active Return / Exchange Status
            </span>
            <span className="text-[10px] font-mono text-neutral-500">
              Ref: {activeReturns[0].return_reference}
            </span>
          </div>

          {activeReturns.map((ret) => {
            const isApproved = ['approved', 'pickup_scheduled', 'received', 'inspected', 'refund_processing', 'refunded', 'exchange_dispatched', 'completed'].includes(ret.status)
            const isPickedUp = ['received', 'inspected', 'refund_processing', 'refunded', 'exchange_dispatched', 'completed'].includes(ret.status)
            const isInspected = ['inspected', 'refund_processing', 'refunded', 'exchange_dispatched', 'completed'].includes(ret.status)
            const isCompleted = ['refunded', 'exchange_dispatched', 'completed'].includes(ret.status)
            const isRejected = ret.status === 'rejected'

            return (
              <div key={ret.id} className="text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase">
                    {ret.request_type === 'exchange' ? 'Size / Colour Exchange' : 'Return for Refund'}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 ${
                      isRejected
                        ? 'bg-red-600 text-white'
                        : isCompleted
                        ? 'bg-black text-white'
                        : 'bg-neutral-100 border border-black text-black'
                    }`}
                  >
                    {ret.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {isRejected && (
                  <div className="bg-red-50 border border-red-300 p-2 text-red-800 text-[11px] font-mono">
                    <strong>Rejection Reason:</strong> {ret.rejection_reason || 'Item did not satisfy return condition rules.'}
                  </div>
                )}

                {/* Progress Steps Timeline */}
                {!isRejected && (
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-mono uppercase text-center pt-2">
                    <div className={`p-1.5 border ${ret.status === 'requested' ? 'bg-black text-white font-bold' : isApproved ? 'bg-neutral-100 border-neutral-300' : 'text-neutral-400 border-neutral-200'}`}>
                      1. Requested
                    </div>
                    <div className={`p-1.5 border ${ret.status === 'pickup_scheduled' || ret.status === 'approved' ? 'bg-black text-white font-bold' : isPickedUp ? 'bg-neutral-100 border-neutral-300' : 'text-neutral-400 border-neutral-200'}`}>
                      2. Pickup
                    </div>
                    <div className={`p-1.5 border ${ret.status === 'received' || ret.status === 'inspected' ? 'bg-black text-white font-bold' : isCompleted ? 'bg-neutral-100 border-neutral-300' : 'text-neutral-400 border-neutral-200'}`}>
                      3. Inspect
                    </div>
                    <div className={`p-1.5 border ${isCompleted ? 'bg-black text-white font-bold' : 'text-neutral-400 border-neutral-200'}`}>
                      4. {ret.request_type === 'exchange' ? 'Dispatched' : 'Refunded'}
                    </div>
                  </div>
                )}

                {/* Reverse Pickup details if booked */}
                {ret.reverse_awb && (
                  <div className="bg-[#F8F8F6] p-2.5 border border-neutral-300 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Reverse Courier:</span>
                      <span className="font-bold">{ret.courier_name || 'Express Logistics'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Reverse AWB:</span>
                      <span className="font-bold">{ret.reverse_awb}</span>
                    </div>
                    {ret.tracking_url && (
                      <div className="pt-1 text-right">
                        <a
                          href={ret.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-bold text-black hover:text-neutral-700"
                        >
                          Track Reverse Courier &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Official Download PDF Invoice button */}
      <a
        href={`/api/orders/${orderNumber}/invoice`}
        download
        className="w-full flex items-center justify-center gap-2 border border-black bg-black text-white hover:bg-neutral-800 py-2.5 px-4 text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Download Tax Invoice (PDF)</span>
      </a>

      {/* Print receipt button */}
      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 border border-black bg-white hover:bg-neutral-100 text-black py-2.5 px-4 text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        <span>Print Receipt</span>
      </button>

      {/* Cancel Order (Prior to dispatch) */}
      {canCancel && (
        <button
          onClick={() => setCancelling(true)}
          className="w-full flex items-center justify-center gap-2 border border-black bg-white hover:bg-black hover:text-white text-black py-2.5 px-4 text-xs uppercase tracking-wider font-bold transition-colors"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel Order</span>
        </button>
      )}

      {/* Return / Exchange Trigger Button */}
      {isDelivered && (
        <div>
          {canReturnOrExchange ? (
            <button
              onClick={() => setReturning(true)}
              className="w-full flex items-center justify-center gap-2 border border-black bg-white hover:bg-black hover:text-white text-black py-2.5 px-4 text-xs uppercase tracking-wider font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Request Return / Exchange ({daysRemaining}d left)</span>
            </button>
          ) : (
            <div className="p-2.5 border border-neutral-300 bg-neutral-50 text-[11px] font-mono text-neutral-500 flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>7-day return window from delivery has expired.</span>
            </div>
          )}
        </div>
      )}

      {/* When Order is still in preparation, show clear informative status rather than broken return form */}
      {!isDelivered && !canCancel && (
        <div className="p-3 border border-neutral-300 bg-[#F8F8F6] text-[11px] font-mono text-neutral-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-black uppercase">
            <Truck className="w-3.5 h-3.5" />
            <span>Order in Transit / Preparation</span>
          </div>
          <p>
            Your order is currently {status.replace(/_/g, ' ')}. 7-day hassle-free returns and size exchanges unlock automatically upon official delivery.
          </p>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelling && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Are you sure you want to cancel this order?</h3>
            <div className="text-xs text-neutral-600 mb-4 space-y-1 font-mono">
              <p>
                Order <span className="font-bold text-black">#{orderNumber}</span>
              </p>
              <p className="text-[11px] text-neutral-500">
                Cancellation is permitted prior to parcel dispatch. Any reserved inventory will be safely released.
                Prepaid orders will receive an automated refund back to the original payment source.
              </p>
            </div>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  className="w-full border border-black p-2 text-xs focus:outline-none font-mono"
                >
                  <option value="">Select a reason...</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Wrong size">Wrong size</option>
                  <option value="Delivery taking too long">Delivery taking too long</option>
                  <option value="Found another product">Found another product</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={loading || !cancelReason}
                  className="flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 cursor-pointer"
                >
                  {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return / Exchange Modal */}
      {returning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-black max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-8">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-black uppercase tracking-tight">Return or Exchange Request</h3>
              <span className="font-mono text-xs text-neutral-500 font-bold">
                Order #{orderNumber}
              </span>
            </div>

            <div className="bg-neutral-50 border border-neutral-300 p-3 mb-4 text-xs font-mono text-neutral-700 space-y-1">
              <p className="font-bold text-black uppercase">
                Bubble Boom 7-Day Guarantee ({daysRemaining} days remaining)
              </p>
              <p>
                Garments must be in unworn, unwashed condition with original packaging where provided. For wholesale items shipped without brand tags, original folding and packaging condition apply.
              </p>
            </div>

            <form onSubmit={handleReturnOrder} className="space-y-4">
              {/* Type Switcher: Return vs Exchange */}
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1.5">
                  Request Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRequestType('return')}
                    className={`py-2 px-3 text-xs uppercase font-bold font-mono border transition-all ${
                      requestType === 'return'
                        ? 'border-2 border-black bg-black text-white'
                        : 'border-neutral-300 text-neutral-700 hover:border-black'
                    }`}
                  >
                    Return for Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('exchange')}
                    className={`py-2 px-3 text-xs uppercase font-bold font-mono border transition-all ${
                      requestType === 'exchange'
                        ? 'border-2 border-black bg-black text-white'
                        : 'border-neutral-300 text-neutral-700 hover:border-black'
                    }`}
                  >
                    Size / Colour Exchange
                  </button>
                </div>
              </div>

              {/* Item to Return */}
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Select Item
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value)
                    setExchangeVariantId('')
                  }}
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.product_name} ({item.variant_info?.size ? `Size: ${item.variant_info.size}` : ''} × {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem?.quantity || 1}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              {/* Exchange Replacement Selection */}
              {requestType === 'exchange' && (
                <div className="p-3 bg-[#F8F8F6] border border-black space-y-2">
                  <label className="block text-xs uppercase font-mono tracking-wider font-bold text-black">
                    Choose Replacement Size / Variant *
                  </label>
                  {availableVariants.length > 0 ? (
                    <select
                      value={exchangeVariantId}
                      onChange={(e) => setExchangeVariantId(e.target.value)}
                      required
                      className="w-full border border-black p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="">Select replacement size/color...</option>
                      {availableVariants.map((v) => (
                        <option key={v.id} value={v.id} disabled={v.stock < 1}>
                          {v.size} {v.color ? `— ${v.color}` : ''} {v.stock > 0 ? `(${v.stock} in stock)` : '(Sold Out)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-neutral-600 font-mono">
                      <p>
                        Current: {selectedItem?.variant_info?.size || 'Standard'} / {selectedItem?.variant_info?.color || 'Standard'}
                      </p>
                      <input
                        type="text"
                        placeholder="Specify requested replacement size (e.g. Size L, Color Black)"
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        className="w-full border border-black p-2 text-xs mt-1 bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Reason for {requestType === 'exchange' ? 'Exchange' : 'Return'}
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  <option value="Incorrect Size / Fit">Incorrect Size / Fit (Too large / small)</option>
                  <option value="Color or Silhouette not as expected">Color or Silhouette not as expected</option>
                  <option value="Defective Stitching / Fabric flaw">Defective Stitching / Fabric flaw</option>
                  <option value="Received Wrong Item">Received Wrong Item</option>
                  <option value="Quality not up to mark">Quality not up to mark</option>
                </select>
              </div>

              {/* COD Refund Bank Details (Required for Cash on Delivery Returns) */}
              {requestType === 'return' && isCod && (
                <div className="border border-black p-3 bg-[#FAF8F5] space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-black">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>COD Payout Details (Direct Bank or UPI)</span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    For Cash on Delivery orders, verified funds are credited via IMPS/NEFT or UPI once inspection passes.
                  </p>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-neutral-700 mb-0.5">
                        UPI ID (Fastest Payout)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., yourname@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full border border-black p-1.5 text-xs font-mono bg-white"
                      />
                    </div>

                    <div className="pt-1 border-t border-neutral-300">
                      <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block mb-1">
                        Or Bank Account Details
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Enter account holder name"
                          value={bankHolder}
                          onChange={(e) => setBankHolder(e.target.value)}
                          className="border border-black p-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Enter account number"
                          value={bankAccNumber}
                          onChange={(e) => setBankAccNumber(e.target.value)}
                          className="border border-black p-1.5 text-xs font-mono bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Enter IFSC code (e.g., HDFC0001234)"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                          className="border border-black p-1.5 text-xs font-mono uppercase bg-white col-span-1 sm:col-span-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Proof Upload */}
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Photo Proof (Optional, Recommended for Flaws)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer border border-black px-3 py-1.5 text-xs font-mono uppercase font-bold hover:bg-neutral-100 inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? 'Uploading...' : 'Add Photo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Max 5MB (PNG/JPG/WebP)
                  </span>
                </div>
                {uploadedImages.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative w-12 h-12 border border-black overflow-hidden bg-neutral-100">
                        <img src={img} alt="Proof" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Describe how we can help you"
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReturning(false)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImage}
                  className="flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Submitting...' : `Submit ${requestType === 'exchange' ? 'Exchange' : 'Return'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
