'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Sliders, RefreshCw, AlertCircle } from 'lucide-react'

interface VariantItem {
  id: string
  sku: string
  color: string
  size: string
  stock: number
  reserved: number
  available: number
  product_name: string
}

export function InventoryTable({ initialVariants }: { initialVariants: VariantItem[] }) {
  const router = useRouter()
  const [variants, setVariants] = useState<VariantItem[]>(initialVariants)
  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null)
  const [quantityChange, setQuantityChange] = useState<number>(0)
  const [movementType, setMovementType] = useState<'adjustment' | 'restock'>('adjustment')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpenAdjust = (v: VariantItem) => {
    setSelectedVariant(v)
    setQuantityChange(0)
    setNotes('')
    setMovementType('adjustment')
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariant) return
    if (quantityChange === 0) {
      toast.error('Adjustment quantity cannot be 0')
      return
    }
    if (!notes.trim()) {
      toast.error('Audit reason note is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          quantityChange: Number(quantityChange),
          movementType,
          notes,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock')

      toast.success('Inventory adjustment recorded in audit log')
      setVariants((prev) =>
        prev.map((v) =>
          v.id === selectedVariant.id
            ? {
                ...v,
                stock: data.updatedStock,
                available: data.updatedStock - v.reserved,
              }
            : v
        )
      )
      setSelectedVariant(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Adjustment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-black bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs font-mono min-w-[650px]">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Variant</th>
                <th className="p-3 text-center">Stock on Hand</th>
                <th className="p-3 text-center">Active Holds</th>
                <th className="p-3 text-center">Net Available</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {variants.map((v) => {
                const isCritical = v.available <= 3

                return (
                  <tr key={v.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold uppercase text-black">{v.product_name}</td>
                    <td className="p-3 text-neutral-600">{v.sku}</td>
                    <td className="p-3">
                      <span className="font-bold">{v.color}</span> / {v.size}
                    </td>
                    <td className="p-3 text-center font-bold">{v.stock}</td>
                    <td className="p-3 text-center text-neutral-500 font-bold">{v.reserved}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-bold ${
                          isCritical ? 'bg-black text-white' : 'bg-neutral-100 text-black border border-black'
                        }`}
                      >
                        {v.available} units
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenAdjust(v)}
                        className="inline-flex items-center gap-1.5 border border-black px-3 py-1.5 uppercase font-bold hover:bg-black hover:text-white transition-colors min-h-[38px] cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mx-3">
            <h3 className="text-base font-black uppercase tracking-tight mb-1">
              Adjust Inventory Stock
            </h3>
            <p className="text-xs text-neutral-600 font-mono mb-4">
              {selectedVariant.product_name} ({selectedVariant.color} / {selectedVariant.size}) • SKU: {selectedVariant.sku}
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 bg-neutral-100 border border-neutral-300">
                <div>
                  <span className="text-neutral-500 block text-[10px]">CURRENT STOCK</span>
                  <span className="font-bold text-base">{selectedVariant.stock} units</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">NEW STOCK PREVIEW</span>
                  <span className="font-bold text-base">
                    {Math.max(0, selectedVariant.stock + Number(quantityChange))} units
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Movement Category
                </label>
                <select
                  value={movementType}
                  onChange={(e: any) => setMovementType(e.target.value)}
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                >
                  <option value="adjustment">Stock Correction / Recount</option>
                  <option value="restock">Factory Restock Batch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Quantity Change (+ to add, - to subtract) *
                </label>
                <input
                  type="number"
                  required
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(Number(e.target.value))}
                  placeholder="e.g. +10 or -2"
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Audit Reason / Notes *
                </label>
                <input
                  type="text"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Discovered 5 additional units during shelf audit"
                  className="w-full border border-black p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
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
                  {loading ? 'Recording...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
