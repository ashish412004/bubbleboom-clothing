'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Tag, Check, X, Trash2, Loader2, AlertTriangle, Edit2, Calendar, Users } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  minimum_amount: number
  maximum_discount: number | null
  start_date?: string
  expiry_date: string
  usage_count: number
  usage_limit: number | null
  per_customer_limit?: number | null
  is_active: boolean
}

export function CouponManager({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCoupon, setConfirmDeleteCoupon] = useState<Coupon | null>(null)

  // Create Form State
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(10)
  const [minAmount, setMinAmount] = useState(999)
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('')
  const [usageLimit, setUsageLimit] = useState<number | ''>('')
  const [perCustomerLimit, setPerCustomerLimit] = useState<number | ''>(1)
  const [expiryDate, setExpiryDate] = useState('')

  // Edit Form State
  const [editCode, setEditCode] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDiscountType, setEditDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [editDiscountValue, setEditDiscountValue] = useState(10)
  const [editMinAmount, setEditMinAmount] = useState(999)
  const [editMaxDiscount, setEditMaxDiscount] = useState<number | ''>('')
  const [editUsageLimit, setEditUsageLimit] = useState<number | ''>('')
  const [editPerCustomerLimit, setEditPerCustomerLimit] = useState<number | ''>('')
  const [editExpiryDate, setEditExpiryDate] = useState('')

  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c)
    setEditCode(c.code)
    setEditDescription(c.description || '')
    setEditDiscountType(c.discount_type)
    setEditDiscountValue(c.discount_value)
    setEditMinAmount(c.minimum_amount || 0)
    setEditMaxDiscount(c.maximum_discount || '')
    setEditUsageLimit(c.usage_limit || '')
    setEditPerCustomerLimit(c.per_customer_limit || '')
    setEditExpiryDate(c.expiry_date ? c.expiry_date.slice(0, 10) : '')
  }

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
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
          discount_type: discountType,
          discount_value: discountValue,
          minimum_amount: minAmount,
          maximum_discount: maxDiscount || null,
          usage_limit: usageLimit || null,
          per_customer_limit: perCustomerLimit || null,
          expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon')

      toast.success('Coupon created successfully!')
      setCoupons((prev) => [data.coupon, ...prev])
      setShowAddForm(false)
      setCode('')
      setDescription('')
      setMaxDiscount('')
      setUsageLimit('')
      setExpiryDate('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating coupon')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCoupon) return
    setLoading(true)

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCoupon.id,
          code: editCode.trim().toUpperCase(),
          description: editDescription.trim() || null,
          discount_type: editDiscountType,
          discount_value: editDiscountValue,
          minimum_amount: editMinAmount,
          maximum_discount: editMaxDiscount || null,
          usage_limit: editUsageLimit || null,
          per_customer_limit: editPerCustomerLimit || null,
          expiry_date: editExpiryDate ? new Date(editExpiryDate).toISOString() : editingCoupon.expiry_date,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update coupon')

      toast.success(`Coupon ${editCode} updated!`)
      setCoupons((prev) =>
        prev.map((c) => (c.id === editingCoupon.id ? { ...c, ...data.coupon } : c))
      )
      setEditingCoupon(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error updating coupon')
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
                  Are you sure you want to delete coupon{' '}
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

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-sm font-black uppercase tracking-tight">Edit Coupon: {editingCoupon.code}</h3>
              <button
                onClick={() => setEditingCoupon(null)}
                className="p-1 hover:bg-neutral-100 border border-transparent hover:border-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    className="w-full border border-black p-2 uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold mb-1">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full border border-black p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase font-bold mb-1">Type</label>
                  <select
                    value={editDiscountType}
                    onChange={(e: any) => setEditDiscountType(e.target.value)}
                    className="w-full border border-black p-2 focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Cash (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase font-bold mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={editDiscountValue}
                    onChange={(e) => setEditDiscountValue(Number(e.target.value))}
                    className="w-full border border-black p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={editMinAmount}
                    onChange={(e) => setEditMinAmount(Number(e.target.value))}
                    className="w-full border border-black p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase font-bold mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={editMaxDiscount}
                    onChange={(e) => setEditMaxDiscount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="None"
                    className="w-full border border-black p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold mb-1">Total Limit</label>
                  <input
                    type="number"
                    value={editUsageLimit}
                    onChange={(e) => setEditUsageLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Unlimited"
                    className="w-full border border-black p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold mb-1">Per User Limit</label>
                  <input
                    type="number"
                    value={editPerCustomerLimit}
                    onChange={(e) => setEditPerCustomerLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="1"
                    className="w-full border border-black p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase font-bold mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full border border-black p-2 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="px-4 py-2 border border-black font-bold uppercase hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-black text-white font-bold uppercase hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-sm font-black uppercase tracking-tight">Active Promotions</h2>
          <p className="text-[11px] text-neutral-500 font-mono">Storewide, minimum spend &amp; seasonal promo codes</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 text-xs uppercase font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Max Discount Cap (₹)
              </label>
              <input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 500"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Total Uses Limit
              </label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 100"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Per User Limit
              </label>
              <input
                type="number"
                value={perCustomerLimit}
                onChange={(e) => setPerCustomerLimit(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 1"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
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
              className="bg-black text-white px-6 py-2 text-xs uppercase font-bold hover:bg-neutral-800 disabled:bg-neutral-400 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Activate Coupon'}
            </button>
          </div>
        </form>
      )}

      {/* Coupons Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[700px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Code &amp; Details</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Conditions</th>
                <th className="p-3">Redemptions</th>
                <th className="p-3">Expiry</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {coupons.map((c) => {
                const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date()

                return (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className="p-3">
                      <span className="font-bold text-sm uppercase block text-black">{c.code}</span>
                      {c.description && <span className="text-[10px] text-neutral-500">{c.description}</span>}
                    </td>
                    <td className="p-3 font-bold">
                      {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                      {c.maximum_discount ? (
                        <span className="block text-[10px] text-neutral-500 font-normal">
                          Max cap: ₹{c.maximum_discount}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      <div>Min Spend: ₹{c.minimum_amount?.toLocaleString('en-IN')}</div>
                      {c.per_customer_limit ? (
                        <div className="text-neutral-500 text-[10px]">{c.per_customer_limit} use/customer</div>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono">
                      <span className="font-bold">{c.usage_count}</span>
                      {c.usage_limit ? ` / ${c.usage_limit}` : ' (unlimited)'}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {c.expiry_date ? (
                        <span className={isExpired ? 'text-red-600 font-bold' : 'text-neutral-700'}>
                          {new Date(c.expiry_date).toLocaleDateString('en-IN')}
                          {isExpired && ' (Expired)'}
                        </span>
                      ) : (
                        <span className="text-neutral-400">Never</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold ${
                          c.is_active && !isExpired ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {isExpired ? 'Expired' : c.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit coupon"
                          className="border border-neutral-300 p-1.5 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700 min-w-[34px] min-h-[34px] inline-flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(c)}
                          className="border border-black px-2 py-1 text-[11px] uppercase font-bold hover:bg-black hover:text-white transition-colors min-h-[34px] inline-flex items-center cursor-pointer"
                        >
                          {c.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCoupon(c)}
                          title="Delete coupon"
                          className="border border-neutral-300 p-1.5 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700 min-w-[34px] min-h-[34px] inline-flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
