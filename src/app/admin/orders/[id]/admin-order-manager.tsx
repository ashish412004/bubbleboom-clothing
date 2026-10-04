'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckCircle2, Truck, RotateCcw, AlertTriangle, Trash2, XCircle, Loader2 } from 'lucide-react'

interface AdminOrderManagerProps {
  order: any
}

export function AdminOrderManager({ order }: AdminOrderManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Status update
  const [selectedStatus, setSelectedStatus] = useState(order.status)

  // Tracking assignment
  const [courierPartner, setCourierPartner] = useState(order.carrier || 'Delhivery Express')
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '')

  // Refund state
  const [refundAmount, setRefundAmount] = useState(order.total_amount)
  const [refundReason, setRefundReason] = useState('Customer Return / Cancellation')
  const [showRefundModal, setShowRefundModal] = useState(false)

  // Cancel & Delete state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('Order cancelled by Bubble Boom administrator')

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

  const handleUpdateStatus = async () => {
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

      toast.success(`Order status updated to ${selectedStatus}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Status update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTracking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingNumber.trim()) {
      toast.error('Tracking number is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_TRACKING',
          orderId: order.id,
          courierPartner,
          trackingNumber,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign tracking')

      toast.success('AWB tracking assigned & order marked Shipped')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Tracking assignment failed')
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
      {/* Status Transition Control */}
      <div className="border border-black bg-white p-5">
        <h3 className="text-xs uppercase font-mono tracking-widest font-bold mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-black" />
          <span>Fulfillment State Machine</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 border border-black p-2 text-xs font-mono focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={handleUpdateStatus}
            disabled={loading || selectedStatus === order.status}
            className="bg-black text-white px-5 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors"
          >
            {loading ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>

      {/* Logistics & Tracking Assignment */}
      <div className="border border-black bg-white p-5">
        <h3 className="text-xs uppercase font-mono tracking-widest font-bold mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-black" />
          <span>Logistics Dispatch &amp; Waybill (AWB)</span>
        </h3>

        <form onSubmit={handleAssignTracking} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
                Courier Carrier
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
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
                AWB Tracking Number
              </label>
              <input
                type="text"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. DEL-889922001"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
          >
            Assign Tracking &amp; Mark Shipped
          </button>
        </form>
      </div>

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
              <span className="font-bold text-black">{order.order_number}</span>? Any reserved stock will be released back to the catalog.
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
