'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Check, X, RotateCcw, AlertCircle } from 'lucide-react'

interface ReturnItem {
  id: string
  order_id: string
  status: string
  reason: string
  notes: string | null
  refund_amount: number
  refund_status: string | null
  created_at: string
  order_number?: string
  order?: {
    order_number: string
  } | null
}

export function ReturnsInspector({ initialReturns }: { initialReturns: ReturnItem[] }) {
  const router = useRouter()
  const [returnsList, setReturnsList] = useState<ReturnItem[]>(initialReturns)
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null)
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [restockDecision, setRestockDecision] = useState(true)
  const [adminNotes, setAdminNotes] = useState('Item inspected: pristine condition, original tags present.')
  const [loading, setLoading] = useState(false)

  const handleOpenInspect = (ret: ReturnItem) => {
    setSelectedReturn(ret)
    setDecision('approved')
    setRestockDecision(true)
    setAdminNotes('Item inspected: pristine condition, original tags present.')
  }

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReturn) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: selectedReturn.id,
          decision,
          restockDecision,
          adminNotes,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Inspection submission failed')

      toast.success(`Return marked as ${decision}`)
      setReturnsList((prev) =>
        prev.map((r) =>
          r.id === selectedReturn.id
            ? { ...r, status: decision === 'approved' ? 'received' : 'rejected' }
            : r
        )
      )
      setSelectedReturn(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error processing return')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Return ID</th>
                <th className="p-3">Order Number</th>
                <th className="p-3">Claim Reason</th>
                <th className="p-3">Refund Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {returnsList.length > 0 ? (
                returnsList.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold">{r.id.slice(0, 8)}...</td>
                    <td className="p-3 font-bold uppercase">{r.order?.order_number || r.order_id}</td>
                    <td className="p-3 text-neutral-700">{r.reason}</td>
                    <td className="p-3 font-bold font-mono">₹{r.refund_amount?.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span className="bg-black text-white text-[10px] uppercase px-2 py-0.5 font-bold">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {r.status === 'requested' ? (
                        <button
                          onClick={() => handleOpenInspect(r)}
                          className="bg-black text-white px-3 py-1 text-[11px] uppercase font-bold hover:bg-neutral-800"
                        >
                          Inspect &amp; Decide
                        </button>
                      ) : (
                        <span className="text-neutral-500 text-[10px] uppercase font-bold">
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-500 font-mono">
                    No return claims submitted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-base font-black uppercase tracking-tight mb-2">
              Quality Inspection &amp; Restock Decision
            </h3>
            <p className="text-xs text-neutral-600 font-mono mb-4">
              Return Reference: {selectedReturn.id} • Order: {selectedReturn.order?.order_number}
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
                      setDecision('approved')
                      setRestockDecision(true)
                    }}
                    className={`py-2 px-3 text-xs uppercase font-bold border ${
                      decision === 'approved'
                        ? 'border-2 border-black bg-black text-white'
                        : 'border-neutral-300 text-neutral-600'
                    }`}
                  >
                    Approve Return
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecision('rejected')
                      setRestockDecision(false)
                    }}
                    className={`py-2 px-3 text-xs uppercase font-bold border ${
                      decision === 'rejected'
                        ? 'border-2 border-black bg-black text-white'
                        : 'border-neutral-300 text-neutral-600'
                    }`}
                  >
                    Reject Claim
                  </button>
                </div>
              </div>

              {decision === 'approved' && (
                <div className="p-3 bg-neutral-100 border border-neutral-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restockDecision}
                      onChange={(e) => setRestockDecision(e.target.checked)}
                      className="h-4 w-4 rounded-none border border-black accent-black"
                    />
                    <span className="text-xs font-bold text-black uppercase font-mono">
                      Restock item back to inventory?
                    </span>
                  </label>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">
                    If checked, units will atomically increment active stock on hand.
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
                  placeholder="Record condition of packaging, tags, scent, and fabric condition..."
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
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
    </div>
  )
}
