'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Printer, XCircle, RotateCcw, AlertCircle, Download } from 'lucide-react'

interface OrderActionsProps {
  orderId: string
  orderNumber: string
  status: string
  items: Array<{
    id: string
    product_name: string
    quantity: number
  }>
}

export function OrderActions({ orderId, orderNumber, status, items }: OrderActionsProps) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [returning, setReturning] = useState(false)
  const [loading, setLoading] = useState(false)

  // Cancellation state
  const [cancelReason, setCancelReason] = useState('')

  // Return state
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '')
  const [returnQty, setReturnQty] = useState(1)
  const [returnReason, setReturnReason] = useState('Incorrect Size / Fit')
  const [returnNotes, setReturnNotes] = useState('')

  const canCancel = ['pending', 'confirmed', 'packed'].includes(status)
  const canReturn = status === 'delivered'

  const handlePrint = () => {
    window.print()
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
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit return request')

      toast.success('Return request initiated for review')
      setReturning(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error requesting return')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
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

      {/* Cancel Order */}
      {canCancel && (
        <button
          onClick={() => setCancelling(true)}
          className="w-full flex items-center justify-center gap-2 border border-black bg-white hover:bg-black hover:text-white text-black py-2.5 px-4 text-xs uppercase tracking-wider font-bold transition-colors"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel Order</span>
        </button>
      )}

      {/* Return Request */}
      {canReturn && (
        <button
          onClick={() => setReturning(true)}
          className="w-full flex items-center justify-center gap-2 border border-black bg-white hover:bg-black hover:text-white text-black py-2.5 px-4 text-xs uppercase tracking-wider font-bold transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Request Return / Exchange</span>
        </button>
      )}

      {/* Cancellation Modal */}
      {cancelling && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Cancel Order</h3>
            <p className="text-xs text-neutral-600 mb-4">
              Order <span className="font-mono font-bold text-black">{orderNumber}</span> will be halted and any reserved stock released back to inventory.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  <option value="">Select a reason...</option>
                  <option value="Changed my mind">Changed my mind</option>
                  <option value="Ordered incorrect size / item">Ordered incorrect size / item</option>
                  <option value="Delivery timeframe too long">Delivery timeframe too long</option>
                  <option value="Found alternative product">Found alternative product</option>
                  <option value="Payment / checkout mistake">Payment / checkout mistake</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returning && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Initiate 7-Day Return</h3>
            <p className="text-xs text-neutral-600 mb-4">
              Bubble Boom items can be returned within 7 days of delivery in unwashed, original condition with all tags intact.
            </p>

            <form onSubmit={handleReturnOrder} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Select Item to Return
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.product_name} (Purchased: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={returnQty}
                  onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Reason for Return
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  <option value="Incorrect Size / Fit">Incorrect Size / Fit</option>
                  <option value="Color or Silhouette not as expected">Color or Silhouette not as expected</option>
                  <option value="Defective Stitching / Fabric flaw">Defective Stitching / Fabric flaw</option>
                  <option value="Received Wrong Item">Received Wrong Item</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Tell us more about the fit or defect..."
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReturning(false)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
