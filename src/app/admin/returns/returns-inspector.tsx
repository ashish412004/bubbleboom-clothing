'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Check,
  X,
  RotateCcw,
  Truck,
  Package,
  CreditCard,
  Send,
  ExternalLink,
  Search,
  Filter,
  Eye,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { ReturnRecord } from '@/lib/returns'

export function ReturnsInspector({ initialReturns }: { initialReturns: ReturnRecord[] }) {
  const router = useRouter()
  const [returnsList, setReturnsList] = useState<ReturnRecord[]>(initialReturns)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'requested' | 'approved' | 'pickup_scheduled' | 'received' | 'inspected' | 'completed'>('all')
  const [loading, setLoading] = useState(false)

  // Modals state
  const [inspectingReturn, setInspectingReturn] = useState<ReturnRecord | null>(null)
  const [inspectDecision, setInspectDecision] = useState<'approved' | 'rejected'>('approved')
  const [restockDecision, setRestockDecision] = useState(true)
  const [adminNotes, setAdminNotes] = useState('Item inspected: unworn condition with original packaging intact.')

  const [pickupReturn, setPickupReturn] = useState<ReturnRecord | null>(null)
  const [courierName, setCourierName] = useState('Shiprocket / Delhivery')
  const [reverseAwb, setReverseAwb] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')

  const [refundReturn, setRefundReturn] = useState<ReturnRecord | null>(null)
  const [refundAmountPaise, setRefundAmountPaise] = useState(0)
  const [bankReference, setBankReference] = useState('')

  const [exchangeReturn, setExchangeReturn] = useState<ReturnRecord | null>(null)
  const [exchangeCarrier, setExchangeCarrier] = useState('Delhivery Surface')
  const [exchangeTrackingNum, setExchangeTrackingNum] = useState('')

  // Filter list
  const filteredList = returnsList.filter((r) => {
    const matchesSearch =
      r.return_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (activeTab === 'all') return true
    if (activeTab === 'completed') return ['refunded', 'exchange_dispatched', 'completed'].includes(r.status)
    return r.status === activeTab
  })

  // Action: Approve or Reject Claim
  const handleApproveReject = async (returnId: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Enter reason for rejecting return claim:') : null
    if (action === 'reject' && !reason) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId,
          action,
          rejection_reason: reason,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')

      toast.success(`Claim marked as ${action}d`)
      setReturnsList((prev) =>
        prev.map((r) => (r.id === returnId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r))
      )
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    } finally {
      setLoading(false)
    }
  }

  // Action: Schedule Courier Reverse Pickup
  const handleSchedulePickup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pickupReturn || !reverseAwb.trim()) {
      toast.error('Please enter reverse AWB tracking number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: pickupReturn.id,
          action: 'schedule_pickup',
          courier_name: courierName,
          reverse_awb: reverseAwb,
          tracking_url: trackingUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to schedule pickup')

      toast.success('Reverse pickup scheduled & customer notified')
      setReturnsList((prev) =>
        prev.map((r) =>
          r.id === pickupReturn.id
            ? {
                ...r,
                status: 'pickup_scheduled',
                pickup_status: 'scheduled',
                courier_name: courierName,
                reverse_awb: reverseAwb,
                tracking_url: trackingUrl || `https://shiprocket.co/tracking/${reverseAwb}`,
              }
            : r
        )
      )
      setPickupReturn(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error scheduling pickup')
    } finally {
      setLoading(false)
    }
  }

  // Action: Mark Return Received at Warehouse
  const handleMarkReceived = async (returnId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId,
          action: 'mark_received',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')

      toast.success('Item marked as received at warehouse')
      setReturnsList((prev) =>
        prev.map((r) => (r.id === returnId ? { ...r, status: 'received', pickup_status: 'picked_up' } : r))
      )
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    } finally {
      setLoading(false)
    }
  }

  // Action: Quality Inspection
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectingReturn) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: inspectingReturn.id,
          action: 'inspect',
          decision: inspectDecision,
          restockDecision,
          adminNotes,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Inspection submission failed')

      toast.success(`Inspection completed: ${inspectDecision.toUpperCase()}`)
      setReturnsList((prev) =>
        prev.map((r) =>
          r.id === inspectingReturn.id
            ? {
                ...r,
                status: inspectDecision === 'approved' ? 'inspected' : 'rejected',
                inspection_result: inspectDecision === 'approved' ? 'pass' : 'fail',
                restock_decision: restockDecision,
                inspection_notes: adminNotes,
              }
            : r
        )
      )
      setInspectingReturn(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error processing inspection')
    } finally {
      setLoading(false)
    }
  }

  // Action: Dispatch Exchange Replacement
  const handleDispatchExchange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exchangeReturn || !exchangeTrackingNum.trim()) {
      toast.error('Tracking number is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: exchangeReturn.id,
          action: 'dispatch_exchange',
          carrier: exchangeCarrier,
          tracking_number: exchangeTrackingNum,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch exchange')

      toast.success('Exchange replacement dispatched!')
      setReturnsList((prev) =>
        prev.map((r) => (r.id === exchangeReturn.id ? { ...r, status: 'exchange_dispatched' } : r))
      )
      setExchangeReturn(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error dispatching exchange')
    } finally {
      setLoading(false)
    }
  }

  // Action: Release Refund
  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundReturn) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: refundReturn.id,
          action: 'execute_refund',
          amount_paise: refundAmountPaise,
          bank_reference: bankReference,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to issue refund')

      toast.success('Refund processed & confirmation email queued')
      setReturnsList((prev) =>
        prev.map((r) =>
          r.id === refundReturn.id
            ? { ...r, status: 'refunded', refund_status: 'successful' }
            : r
        )
      )
      setRefundReturn(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error issuing refund')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {/* Pipeline Tabs */}
        <div className="flex flex-wrap border border-black bg-white p-1 gap-1 text-xs font-mono uppercase font-bold">
          {(
            [
              ['all', 'All'],
              ['requested', 'Requested'],
              ['approved', 'Approved'],
              ['pickup_scheduled', 'Pickup Ready'],
              ['received', 'Warehouse'],
              ['inspected', 'Inspected'],
              ['completed', 'Completed'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 transition-colors ${
                activeTab === key ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search Reference, Order, Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-black pl-9 pr-3 py-2 text-xs font-mono bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[900px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Reference / Date</th>
                <th className="p-3">Order Number</th>
                <th className="p-3">Type</th>
                <th className="p-3">Item &amp; Reason</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredList.length > 0 ? (
                filteredList.map((r) => {
                  const isExchange = r.request_type === 'exchange'
                  const isRefunded = r.status === 'refunded'
                  const isDispatched = r.status === 'exchange_dispatched'
                  const isRejected = r.status === 'rejected'

                  return (
                    <tr key={r.id} className="hover:bg-neutral-50">
                      <td className="p-3">
                        <div className="font-bold text-black">{r.return_reference}</div>
                        <div className="text-[10px] text-neutral-500">
                          {new Date(r.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="p-3 font-bold uppercase">
                        {r.order?.order_number || r.order_id}
                        {r.order?.payment_method && (
                          <div className="text-[10px] font-normal text-neutral-500">
                            {r.order.payment_method.toUpperCase()}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                            isExchange
                              ? 'bg-neutral-100 border border-black text-black'
                              : 'bg-black text-white'
                          }`}
                        >
                          {isExchange ? 'Exchange' : 'Return'}
                        </span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-neutral-900 truncate">
                          {r.items?.[0]?.order_item?.product_name || 'Apparel Item'}
                          {r.items?.[0]?.quantity ? ` (×${r.items[0].quantity})` : ''}
                        </div>
                        <div className="text-neutral-600 text-[11px] truncate">{r.reason}</div>
                        {r.customer_notes && (
                          <div className="text-neutral-500 text-[10px] italic truncate">
                            &ldquo;{r.customer_notes}&rdquo;
                          </div>
                        )}
                      </td>

                      <td className="p-3 font-bold font-mono">
                        {isExchange ? (
                          <span className="text-neutral-500">Replacement</span>
                        ) : (
                          `₹${r.refund_amount?.toLocaleString('en-IN')}`
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 inline-block ${
                            isRejected
                              ? 'bg-red-600 text-white'
                              : isRefunded || isDispatched
                              ? 'bg-black text-white'
                              : 'bg-neutral-200 text-black'
                          }`}
                        >
                          {r.status.replace(/_/g, ' ')}
                        </span>

                        {r.reverse_awb && (
                          <div className="text-[10px] text-neutral-500 mt-1 font-mono">
                            AWB: {r.reverse_awb}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* 1. Requested: Approve / Reject */}
                          {r.status === 'requested' && (
                            <>
                              <button
                                onClick={() => handleApproveReject(r.id, 'approve')}
                                disabled={loading}
                                className="bg-black text-white px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-neutral-800"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveReject(r.id, 'reject')}
                                disabled={loading}
                                className="border border-neutral-300 text-neutral-700 px-2 py-1 text-[10px] uppercase font-bold hover:bg-neutral-100"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* 2. Approved: Schedule Reverse Pickup */}
                          {r.status === 'approved' && (
                            <button
                              onClick={() => {
                                setPickupReturn(r)
                                setReverseAwb(`BB-REV-${Date.now().toString().slice(-6)}`)
                              }}
                              className="bg-black text-white px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-neutral-800 inline-flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" />
                              Book Pickup
                            </button>
                          )}

                          {/* 3. Pickup Scheduled: Mark Received at Warehouse */}
                          {r.status === 'pickup_scheduled' && (
                            <button
                              onClick={() => handleMarkReceived(r.id)}
                              disabled={loading}
                              className="bg-black text-white px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-neutral-800 inline-flex items-center gap-1"
                            >
                              <Package className="w-3 h-3" />
                              Mark Received
                            </button>
                          )}

                          {/* 4. Received: Quality Inspection */}
                          {r.status === 'received' && (
                            <button
                              onClick={() => {
                                setInspectingReturn(r)
                                setInspectDecision('approved')
                                setRestockDecision(true)
                              }}
                              className="bg-black text-white px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-neutral-800"
                            >
                              Inspect Quality
                            </button>
                          )}

                          {/* 5. Inspected (Return): Issue Refund */}
                          {r.status === 'inspected' && !isExchange && (
                            <button
                              onClick={() => {
                                setRefundReturn(r)
                                setRefundAmountPaise(r.refund_amount * 100)
                              }}
                              className="bg-black text-white px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-neutral-800 inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              Release Refund
                            </button>
                          )}

                          {/* 6. Inspected (Exchange): Dispatch Replacement */}
                          {r.status === 'inspected' && isExchange && (
                            <button
                              onClick={() => {
                                setExchangeReturn(r)
                                setExchangeTrackingNum(`BB-EXC-${Date.now().toString().slice(-6)}`)
                              }}
                              className="bg-black text-white px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-neutral-800 inline-flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Dispatch Exchange
                            </button>
                          )}

                          {/* Completed or view info */}
                          {(isRefunded || isDispatched || isRejected) && (
                            <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                              Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                    No returns found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Schedule Courier Reverse Pickup */}
      {pickupReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-base font-black uppercase tracking-tight mb-2">Book Courier Reverse Pickup</h3>
            <p className="text-xs text-neutral-600 font-mono mb-4">
              Return Ref: {pickupReturn.return_reference} • Order #{pickupReturn.order?.order_number}
            </p>

            <form onSubmit={handleSchedulePickup} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Courier Partner
                </label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  <option value="Shiprocket / Delhivery">Shiprocket / Delhivery</option>
                  <option value="Shiprocket / Blue Dart">Shiprocket / Blue Dart</option>
                  <option value="Delhivery Express">Delhivery Express</option>
                  <option value="Blue Dart Express">Blue Dart Express</option>
                  <option value="Manual / Local Courier">Manual / Local Courier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Reverse AWB Tracking Number *
                </label>
                <input
                  type="text"
                  required
                  value={reverseAwb}
                  onChange={(e) => setReverseAwb(e.target.value)}
                  placeholder="e.g. 142389100293 or SHIPROCKET-AWB"
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Custom Tracking URL (Optional)
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="Defaults to courier tracking portal"
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPickupReturn(null)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2 text-xs uppercase font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Booking...' : 'Confirm Pickup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quality Inspection */}
      {inspectingReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-base font-black uppercase tracking-tight mb-2">Quality Inspection &amp; Restock Decision</h3>
            <p className="text-xs text-neutral-600 font-mono mb-4">
              Return Ref: {inspectingReturn.return_reference} • Order #{inspectingReturn.order?.order_number}
            </p>

            <form onSubmit={handleSubmitInspection} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Inspection Outcome
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectDecision('approved')
                      setRestockDecision(true)
                    }}
                    className={`py-2 px-3 text-xs uppercase font-bold font-mono border transition-all ${
                      inspectDecision === 'approved'
                        ? 'border-2 border-black bg-black text-white'
                        : 'border-neutral-300 text-neutral-600'
                    }`}
                  >
                    Pass Inspection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectDecision('rejected')
                      setRestockDecision(false)
                    }}
                    className={`py-2 px-3 text-xs uppercase font-bold font-mono border transition-all ${
                      inspectDecision === 'rejected'
                        ? 'border-2 border-black bg-black text-white'
                        : 'border-neutral-300 text-neutral-600'
                    }`}
                  >
                    Fail / Reject
                  </button>
                </div>
              </div>

              {inspectDecision === 'approved' && (
                <div className="p-3 bg-neutral-100 border border-neutral-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restockDecision}
                      onChange={(e) => setRestockDecision(e.target.checked)}
                      className="h-4 w-4 rounded-none border border-black accent-black"
                    />
                    <span className="text-xs font-bold text-black uppercase font-mono">
                      Restock units back to active inventory?
                    </span>
                  </label>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">
                    Units will atomically increment active product variant stock.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Inspector Quality Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record condition of fabric, packaging, cleanliness..."
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectingReturn(null)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2 text-xs uppercase font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Submitting...' : 'Commit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Release Refund */}
      {refundReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-base font-black uppercase tracking-tight mb-2">Execute Refund</h3>
            <p className="text-xs text-neutral-600 font-mono mb-4">
              Return Ref: {refundReturn.return_reference} • Order #{refundReturn.order?.order_number}
            </p>

            <form onSubmit={handleExecuteRefund} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  value={refundAmountPaise / 100}
                  onChange={(e) => setRefundAmountPaise(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="w-full border border-black p-2 text-xs font-mono font-bold"
                />
              </div>

              {refundReturn.order?.payment_method === 'cod' ? (
                <div className="p-3 bg-[#FAF8F5] border border-black space-y-2 text-xs font-mono">
                  <div className="font-bold text-black uppercase">COD Manual Bank Payout</div>
                  {refundReturn.bank_details ? (
                    <div className="text-[11px] text-neutral-700 space-y-0.5">
                      {refundReturn.bank_details.upi_id && <div>UPI: <strong>{refundReturn.bank_details.upi_id}</strong></div>}
                      {refundReturn.bank_details.account_number && (
                        <div>
                          Bank A/C: <strong>{refundReturn.bank_details.account_number}</strong> ({refundReturn.bank_details.ifsc_code})
                          <br />
                          Holder: {refundReturn.bank_details.account_holder_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-neutral-500">No bank details recorded by customer.</div>
                  )}

                  <div className="pt-2">
                    <label className="block text-[10px] uppercase font-bold text-neutral-700 mb-1">
                      Bank Transfer Reference / UTR *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IMPS/UTR-12849182390"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      className="w-full border border-black p-1.5 text-xs bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-neutral-100 border border-neutral-300 text-xs font-mono">
                  <div className="font-bold text-black uppercase">Online Cashfree Refund</div>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    Funds will automatically reverse through Cashfree API to customer&apos;s source card/UPI account.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundReturn(null)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2 text-xs uppercase font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Processing...' : 'Release Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Exchange Replacement */}
      {exchangeReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-base font-black uppercase tracking-tight mb-2">Dispatch Exchange Replacement</h3>
            <p className="text-xs text-neutral-600 font-mono mb-4">
              Return Ref: {exchangeReturn.return_reference} • Order #{exchangeReturn.order?.order_number}
            </p>

            <form onSubmit={handleDispatchExchange} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Forward Courier Carrier
                </label>
                <select
                  value={exchangeCarrier}
                  onChange={(e) => setExchangeCarrier(e.target.value)}
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  <option value="Delhivery Surface">Delhivery Surface</option>
                  <option value="Blue Dart Express">Blue Dart Express</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Shadowfax">Shadowfax</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Forward AWB / Tracking Number *
                </label>
                <input
                  type="text"
                  required
                  value={exchangeTrackingNum}
                  onChange={(e) => setExchangeTrackingNum(e.target.value)}
                  placeholder="e.g. 192849182390"
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExchangeReturn(null)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2 text-xs uppercase font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Dispatching...' : 'Dispatch Replacement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
