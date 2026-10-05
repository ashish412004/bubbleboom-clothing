'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Tag, Check, X, Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  minimum_amount: number
  maximum_discount: number | null
  expiry_date: string
  usage_count: number
  usage_limit: number | null
  is_active: boolean
}

export function CouponManager({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCoupon, setConfirmDeleteCoupon] = useState<Coupon | null>(null)

  // Form State
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(10)
  const [minAmount, setMinAmount] = useState(999)
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('')
  const [usageLimit, setUsageLimit] = useState<number | ''>('')

  const handleDelete = async (coupon: Coupon) => {
    setDeletingId(coupon.id)
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(coupon.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete coupon')

      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id))
      setConfirmDeleteCoupon(null)
      toast.success(`Coupon ${coupon.code} deleted`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting coupon')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description,
          discount_type: discountType,
          discount_value: discountValue,
          minimum_amount: minAmount,
          maximum_discount: maxDiscount || null,
          usage_limit: usageLimit || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon')

      toast.success('Coupon created!')
      setCoupons((prev) => [data.coupon, ...prev])
      setShowAddForm(false)
      setCode('')
      setDescription('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating coupon')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (coupon: Coupon) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          is_active: !coupon.is_active,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to toggle')

      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      )
      toast.success(`Coupon ${coupon.code} ${!coupon.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Could not toggle coupon status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {confirmDeleteCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Delete Coupon</h3>
                <p className="text-xs text-neutral-600 font-mono">
                  Are you sure you want to permanently delete coupon{' '}
                  <span className="font-bold text-black">"{confirmDeleteCoupon.code}"</span>?
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  Customers will no longer be able to apply this discount code at checkout.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setConfirmDeleteCoupon(null)}
                disabled={deletingId !== null}
                className="min-h-[44px] px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteCoupon)}
                disabled={deletingId !== null}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 bg-black text-white px-5 py-2 text-xs font-mono uppercase font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Coupon</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-sm font-black uppercase tracking-tight">Active Promotions</h2>
          <p className="text-[11px] text-neutral-500 font-mono">Storewide and minimum spend promo codes</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 text-xs uppercase font-bold hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Close Form' : 'Create Coupon'}</span>
        </button>
      </div>

      {/* Create form */}
      {showAddForm && (
        <form onSubmit={handleCreateCoupon} className="border-2 border-black bg-white p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black uppercase tracking-tight">New Coupon Code</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. BOOM20"
                className="w-full border border-black p-2 text-xs font-mono uppercase focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 20% off all drops above ₹1,999"
                className="w-full border border-black p-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e: any) => setDiscountType(e.target.value)}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Flat Cash (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder={discountType === 'percentage' ? '15 (for 15%)' : '200 (for ₹200)'}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Minimum Spend (₹)
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(Number(e.target.value))}
                placeholder="999"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="border border-neutral-300 px-4 py-2 text-xs uppercase font-bold hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-6 py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
            >
              {loading ? 'Creating...' : 'Activate Coupon'}
            </button>
          </div>
        </form>
      )}

      {/* Coupons Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[600px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Min Spend</th>
                <th className="p-3">Redemptions</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="p-3">
                    <span className="font-bold text-sm uppercase block text-black">{c.code}</span>
                    {c.description && <span className="text-[10px] text-neutral-500">{c.description}</span>}
                  </td>
                  <td className="p-3 font-bold">
                    {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                  </td>
                  <td className="p-3 font-mono">₹{c.minimum_amount?.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono">{c.usage_count} uses</td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold ${
                        c.is_active ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(c)}
                        className="border border-black px-2.5 py-1.5 text-[11px] uppercase font-bold hover:bg-black hover:text-white transition-colors min-h-[36px] inline-flex items-center"
                      >
                        {c.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteCoupon(c)}
                        title="Delete coupon"
                        className="border border-neutral-300 p-1 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700 min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
