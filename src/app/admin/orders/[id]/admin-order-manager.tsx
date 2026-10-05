'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  CheckCircle2,
  Truck,
  RotateCcw,
  AlertTriangle,
  Trash2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Calendar,
  Package,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'

interface AdminOrderManagerProps {
  order: any
}

export function AdminOrderManager({ order }: AdminOrderManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)

  // Status update
  const [selectedStatus, setSelectedStatus] = useState(order.status)

  // Logistics & Tracking
  const [courierPartner, setCourierPartner] = useState(order.carrier || 'Delhivery Express')
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '')
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url || '')
  const [dispatchDate, setDispatchDate] = useState(
    order.dispatch_date ? order.dispatch_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [packageWeightGrams, setPackageWeightGrams] = useState(order.package_weight_grams || 450)
  const [dimLength, setDimLength] = useState(order.package_dimensions?.length || 30)
  const [dimWidth, setDimWidth] = useState(order.package_dimensions?.width || 25)
  const [dimHeight, setDimHeight] = useState(order.package_dimensions?.height || 5)
  const [estimatedDeliveryMin, setEstimatedDeliveryMin] = useState(order.estimated_delivery_min || '')
  const [estimatedDeliveryMax, setEstimatedDeliveryMax] = useState(order.estimated_delivery_max || '')

  // Refund state
  const [refundAmount, setRefundAmount] = useState(order.total_amount)
  const [refundReason, setRefundReason] = useState('Customer Return / Cancellation')
  const [showRefundModal, setShowRefundModal] = useState(false)

  // Cancel & Delete state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('Order cancelled by Bubble Boom administrator')

  const isOnlineUnpaid = order.payment_method === 'cashfree' && order.payment_status !== 'paid'
  const isDispatchAttemptBlocked = isOnlineUnpaid && ['shipped', 'out_for_delivery'].includes(selectedStatus)

  // Copy Courier Summary
  const handleCopyCourierSummary = () => {
    const addr = order.shipping_address as any || {}
    const items = order.order_items || []
    const itemsFormatted = items.map((it: any) => {
      const v = it.variant_info || {}
      const parts = [v.size ? `Size: ${v.size}` : '', v.color ? `Color: ${v.color}` : ''].filter(Boolean).join(', ')
      return `• ${it.quantity}x ${it.product_name || 'Apparel'} ${parts ? `(${parts})` : ''}`
    }).join('\n')

    const isCod = order.payment_method === 'cod'
    const codAmount = isCod ? `₹${(order.total_amount || 0).toLocaleString('en-IN')}` : '₹0 (PREPAID - DO NOT COLLECT)'
    const phone = order.guest_phone || addr.phone || 'N/A'

    const summaryText = `BUBBLE BOOM — COURIER DISPATCH SUMMARY
========================================
Order Reference : ${order.order_number}
Order Date      : ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}

RECIPIENT & DELIVERY DETAILS
----------------------------------------
Name            : ${addr.full_name || 'Customer'}
Phone           : ${phone}
Address Line 1  : ${addr.address_line1 || ''}
${addr.address_line2 ? `Address Line 2  : ${addr.address_line2}\n` : ''}${addr.landmark ? `Landmark        : ${addr.landmark}\n` : ''}City            : ${addr.city || ''}
State           : ${addr.state || ''}
PIN Code        : ${addr.pin_code || ''}
Country         : ${addr.country || 'India'}

PACKAGE & SHIPMENT SPECIFICATIONS
----------------------------------------
Items Ordered   :
${itemsFormatted || '• Streetwear Apparel (1 item)'}
Package Weight  : ${packageWeightGrams} g
Dimensions      : ${dimLength}x${dimWidth}x${dimHeight} cm
Courier Partner : ${courierPartner}
AWB / Tracking  : ${trackingNumber || 'Pending Assignment'}
${trackingUrl ? `Tracking URL    : ${trackingUrl}\n` : ''}
PAYMENT & COLLECTION
----------------------------------------
Payment Method  : ${order.payment_method === 'cod' ? 'CASH ON DELIVERY (COD)' : 'ONLINE (PREPAID CASHFREE)'}
Payment Status  : ${order.payment_status?.toUpperCase()}
Collectable COD : ${codAmount}
========================================`

    navigator.clipboard.writeText(summaryText)
    setCopiedSummary(true)
    toast.success('Courier dispatch summary copied to clipboard!')
    setTimeout(() => setCopiedSummary(false), 2500)
  }

  const handleUpdateStatus = async () => {
    if (isDispatchAttemptBlocked) {
      toast.error('Cannot dispatch order: Online payment is not confirmed.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          orderId: order.id,
          status: selectedStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update order status')

      toast.success(`Order status updated to ${selectedStatus.replace(/_/g, ' ')}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Status update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLogistics = async (e: React.FormEvent) => {
    e.preventDefault()

    if (trackingUrl && trackingUrl.trim() && !trackingUrl.startsWith('https://')) {
      toast.error('Tracking URL must be a valid secure HTTPS link (e.g. https://track.delhivery.com/...)')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_FULFILLMENT',
          orderId: order.id,
          courierPartner,
          trackingNumber,
          trackingUrl: trackingUrl.trim() || null,
          dispatchDate: dispatchDate ? new Date(dispatchDate).toISOString() : null,
          packageWeightGrams: Number(packageWeightGrams) || 450,
          packageDimensions: {
            length: Number(dimLength) || 30,
            width: Number(dimWidth) || 25,
            height: Number(dimHeight) || 5,
          },
          estimatedDeliveryMin: estimatedDeliveryMin || null,
          estimatedDeliveryMax: estimatedDeliveryMax || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update logistics details')

      toast.success('Logistics & AWB details saved (Order status preserved)')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Logistics update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL_ORDER',
          orderId: order.id,
          refundReason: cancelReason,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order')

      toast.success('Order successfully cancelled')
      setShowCancelModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling order')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOrder = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders?orderId=${encodeURIComponent(order.id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete order')

      toast.success('Order permanently deleted')
      router.push('/admin/orders')
    } catch (err: any) {
      toast.error(err.message || 'Error deleting order')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROCESS_REFUND',
          orderId: order.id,
          refundAmountPaise: Math.round(Number(refundAmount) * 100),
          refundReason,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch refund')

      toast.success('Refund transaction processed')
      setShowRefundModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Refund processing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1-Click Copy Courier Summary Card */}
      <div className="border-2 border-black bg-[#F8F8F6] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs uppercase font-mono tracking-widest font-black flex items-center gap-2">
              <Package className="w-4 h-4 text-black" />
              <span>Courier Booking Manifest</span>
            </h3>
            <p className="text-[11px] text-neutral-600 font-mono mt-1">
              Copy complete shipping, address, item weight, and COD collection details formatted for pasting into Shiprocket, Delhivery, Blue Dart, or DTDC.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCourierSummary}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 text-xs uppercase font-mono font-bold tracking-wider hover:bg-neutral-800 transition-colors shrink-0"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSummary ? 'Copied to Clipboard' : 'Copy Courier Summary'}</span>
          </button>
        </div>
      </div>

      {/* Fulfillment State Machine Control */}
      <div className="border border-black bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase font-mono tracking-widest font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>Fulfilment State Machine</span>
          </h3>
          <span className="text-[10px] font-mono uppercase bg-neutral-100 border border-black px-2 py-0.5 font-bold">
            Current: {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        {isOnlineUnpaid && (
          <div className="mb-4 p-3 bg-neutral-100 border-l-4 border-black text-xs font-mono flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-black" />
            <div>
              <span className="font-bold uppercase block text-black">Online Payment Unverified</span>
              This order used Cashfree online payment but is marked <strong>{order.payment_status}</strong>. Dispatching to "Shipped" is guarded and blocked until online payment is confirmed or verified.
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 border border-black p-2 text-xs font-mono focus:outline-none"
            >
              <option value="pending">Pending (New)</option>
              <option value="confirmed">Confirmed</option>
              <option value="unfulfilled">Unfulfilled</option>
              <option value="packed">Packed</option>
              <option value="pickup_scheduled">Pickup Scheduled</option>
              <option value="shipped">Shipped (In Transit)</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="delivery_exception">Delivery Exception</option>
              <option value="return_to_origin">Return to Origin (RTO)</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={handleUpdateStatus}
              disabled={loading || selectedStatus === order.status || isDispatchAttemptBlocked}
              className="bg-black text-white px-6 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>

          {isDispatchAttemptBlocked && (
            <p className="text-[11px] text-neutral-600 font-mono italic">
              Cannot advance to Shipped while online payment status is "{order.payment_status}".
            </p>
          )}
        </div>
      </div>

      {/* Logistics & Tracking Details (Manual Courier Entry) */}
      <div className="border border-black bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase font-mono tracking-widest font-bold flex items-center gap-2">
            <Truck className="w-4 h-4 text-black" />
            <span>Courier Logistics &amp; Waybill (AWB)</span>
          </h3>
          <span className="text-[10px] font-mono text-neutral-500">
            Manual Booking Entry
          </span>
        </div>
        <p className="text-[11px] text-neutral-600 font-mono mb-4">
          Enter waybill tracking details after booking with your courier dashboard. Saving here records the AWB without automatically marking the parcel as shipped.
        </p>

        <form onSubmit={handleSaveLogistics} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
                Courier Partner / Carrier
              </label>
              <select
                value={courierPartner}
                onChange={(e) => setCourierPartner(e.target.value)}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              >
                <option value="Delhivery Express">Delhivery Express</option>
                <option value="BlueDart Air">BlueDart Air</option>
                <option value="Shiprocket Direct">Shiprocket Direct</option>
                <option value="DTDC Courier">DTDC Courier</option>
                <option value="India Post Speed">India Post Speed</option>
                <option value="Shadowfax">Shadowfax</option>
                <option value="Xpressbees">Xpressbees</option>
                <option value="Custom Courier">Other / Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
                AWB / Waybill Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. DEL-889922001 or 143288921"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
              Direct HTTPS Tracking URL (Optional)
            </label>
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://track.delhivery.com/tracking?awb=DEL-889922001"
              className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
            />
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-black underline mt-1"
              >
                <span>Test tracking link in new tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
                Package Weight (Grams)
              </label>
              <input
                type="number"
                min="50"
                step="10"
                value={packageWeightGrams}
                onChange={(e) => setPackageWeightGrams(Number(e.target.value))}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
                Dimensions L × W × H (cm)
              </label>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  placeholder="L"
                  value={dimLength}
                  onChange={(e) => setDimLength(Number(e.target.value))}
                  className="border border-black p-2 text-xs font-mono text-center focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="W"
                  value={dimWidth}
                  onChange={(e) => setDimWidth(Number(e.target.value))}
                  className="border border-black p-2 text-xs font-mono text-center focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="H"
                  value={dimHeight}
                  onChange={(e) => setDimHeight(Number(e.target.value))}
                  className="border border-black p-2 text-xs font-mono text-center focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
                Dispatch Date
              </label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
                Estimated Delivery Min Date (Optional)
              </label>
              <input
                type="date"
                value={estimatedDeliveryMin}
                onChange={(e) => setEstimatedDeliveryMin(e.target.value)}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1 font-bold">
                Estimated Delivery Max Date (Optional)
              </label>
              <input
                type="date"
                value={estimatedDeliveryMax}
                onChange={(e) => setEstimatedDeliveryMax(e.target.value)}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
            >
              {loading ? 'Saving Logistics...' : 'Save Logistics Details (Keeps Current Status)'}
            </button>
          </div>
        </form>
      </div>

      {/* Status History Timeline */}
      {Array.isArray(order.status_history) && order.status_history.length > 0 && (
        <div className="border border-black bg-white p-5">
          <h3 className="text-xs uppercase font-mono tracking-widest font-bold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-black" />
            <span>Fulfilment Audit History</span>
          </h3>
          <div className="space-y-2 font-mono text-xs divide-y divide-neutral-100">
            {order.status_history.map((entry: any, idx: number) => (
              <div key={idx} className="pt-2 flex justify-between items-center text-neutral-700">
                <div>
                  <span className="font-bold text-black uppercase">{entry.to?.replace(/_/g, ' ')}</span>
                  {entry.from && (
                    <span className="text-neutral-500 text-[10px] ml-2">(from {entry.from.replace(/_/g, ' ')})</span>
                  )}
                </div>
                <div className="text-[10px] text-neutral-500">
                  {new Date(entry.timestamp).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Cancellation & Deletion Operations */}
      <div className="border border-black bg-white p-5 space-y-4">
        <div>
          <h3 className="text-xs uppercase font-mono tracking-widest font-bold text-neutral-900">
            Order Maintenance &amp; Deletion
          </h3>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Cancel active customer orders or permanently delete testing records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 border border-black px-4 py-2 text-xs uppercase font-bold hover:bg-neutral-100 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Order</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 border border-neutral-300 px-4 py-2 text-xs uppercase font-bold hover:border-black hover:bg-black hover:text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Order</span>
          </button>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-base font-black uppercase tracking-tight mb-2">Cancel Order</h3>
            <p className="text-xs text-neutral-600 mb-4 font-mono">
              Are you sure you want to cancel order{' '}
              <span className="font-bold text-black">{order.order_number}</span>? Any reserved stock will be released back to the catalog. Note: Cancellation does not automatically issue a payment refund.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                  Cancellation Reason
                </label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={loading}
                  className="border border-neutral-300 px-4 py-2 text-xs uppercase font-bold hover:bg-neutral-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white px-5 py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Permanently Delete Order</h3>
                <p className="text-xs text-neutral-600 font-mono">
                  Are you sure you want to permanently delete order{' '}
                  <span className="font-bold text-black">{order.order_number}</span>?
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  This action is irreversible. All order line items and historical payment snapshots will be purged.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="border border-neutral-300 px-4 py-2 text-xs uppercase font-bold hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Trigger */}
      <div className="border border-black bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs uppercase font-mono tracking-widest font-bold">Refund Operations</h3>
            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
              Online Cashfree reversal or COD manual bank transfer
            </p>
          </div>
          <button
            onClick={() => setShowRefundModal(true)}
            className="border border-black px-4 py-2 text-xs uppercase font-bold hover:bg-black hover:text-white transition-colors"
          >
            Issue Refund
          </button>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Process Refund</h3>
            <p className="text-xs text-neutral-600 mb-4">
              Order: <span className="font-mono font-bold text-black">{order.order_number}</span> ({order.payment_method.toUpperCase()})
            </p>

            <form onSubmit={handleExecuteRefund} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  max={order.total_amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full border border-black p-2 text-xs font-mono"
                />
                <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
                  Max allowable refund ceiling: ₹{order.total_amount}
                </span>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Audit Reason
                </label>
                <input
                  type="text"
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Size mismatch return after quality check"
                  className="w-full border border-black p-2 text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 border border-neutral-300 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
