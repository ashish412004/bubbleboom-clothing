'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'
import {
  Sliders,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Search,
  CheckSquare,
  Square,
  Loader2,
  RefreshCw,
  X,
  PackageX,
  CheckCircle2,
} from 'lucide-react'

export interface VariantItem {
  id: string
  product_id?: string
  sku: string
  color: string
  size: string
  stock: number
  reserved: number
  available: number
  product_name: string
  product_slug?: string
  thumbnail?: string | null
  is_published?: boolean
  is_product_active?: boolean
}

type FilterTab = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'hidden'

export function InventoryTable({ initialVariants }: { initialVariants: VariantItem[] }) {
  const router = useRouter()
  const [variants, setVariants] = useState<VariantItem[]>(initialVariants)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal State for stock edit
  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null)
  const [stockMode, setStockMode] = useState<'adjust' | 'override'>('override')
  const [overrideValue, setOverrideValue] = useState<number>(0)
  const [quantityChange, setQuantityChange] = useState<number>(0)
  const [movementType, setMovementType] = useState<'adjustment' | 'restock'>('adjustment')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Safe delete modal
  const [itemToDelete, setItemToDelete] = useState<VariantItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = v.product_name.toLowerCase().includes(q)
        const matchSku = v.sku.toLowerCase().includes(q)
        const matchColor = v.color.toLowerCase().includes(q)
        const matchSize = v.size.toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchColor && !matchSize) return false
      }

      // 2. Tab Filter
      if (activeFilter === 'in_stock') return v.available > 0
      if (activeFilter === 'low_stock') return v.available > 0 && v.available <= 3
      if (activeFilter === 'out_of_stock') return v.available === 0
      if (activeFilter === 'hidden') return v.is_published === false

      return true
    })
  }, [variants, searchQuery, activeFilter])

  // Count summaries for tabs
  const countAll = variants.length
  const countInStock = variants.filter((v) => v.available > 0).length
  const countLowStock = variants.filter((v) => v.available > 0 && v.available <= 3).length
  const countOutOfStock = variants.filter((v) => v.available === 0).length
  const countHidden = variants.filter((v) => v.is_published === false).length

  // Select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredVariants.length && filteredVariants.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredVariants.map((v) => v.id)))
    }
  }

  const handleToggleSelectItem = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleOpenAdjust = (v: VariantItem) => {
    setSelectedVariant(v)
    setOverrideValue(v.stock)
    setQuantityChange(0)
    setNotes('')
    setStockMode('override')
    setMovementType('adjustment')
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariant) return

    setLoading(true)
    try {
      let body: any = {
        variantId: selectedVariant.id,
        notes: notes.trim() || (stockMode === 'override' ? `Physical stock set to ${overrideValue}` : `Stock adjusted by ${quantityChange}`),
      }

      if (stockMode === 'override') {
        body.exactStock = overrideValue
      } else {
        if (quantityChange === 0) {
          toast.error('Adjustment quantity cannot be 0')
          setLoading(false)
          return
        }
        body.quantityChange = quantityChange
        body.movementType = movementType
      }

      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update stock')

      toast.success('Inventory updated successfully!')
      setVariants((prev) =>
        prev.map((v) =>
          v.id === selectedVariant.id
            ? {
                ...v,
                stock: data.updatedStock,
                available: Math.max(0, data.updatedStock - v.reserved),
              }
            : v
        )
      )
      setSelectedVariant(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Stock update failed')
    } finally {
      setLoading(false)
    }
  }

  // Quick action: Set stock to 0
  const handleQuickSetZero = async (v: VariantItem) => {
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_out_of_stock',
          variantIds: [v.id],
          reason: 'Marked Out of Stock by Admin',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set stock to 0')

      toast.success(`${v.sku} marked Out of Stock (0)`)
      setVariants((prev) =>
        prev.map((item) =>
          item.id === v.id ? { ...item, stock: 0, available: 0 } : item
        )
      )
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    }
  }

  // Quick action: Toggle product publication
  const handleTogglePublish = async (v: VariantItem) => {
    if (!v.product_id) return
    const nextPublished = !v.is_published

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextPublished ? 'publish_product' : 'unpublish_product',
          productIds: [v.product_id],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update product visibility')

      toast.success(
        nextPublished
          ? `Product published on storefront`
          : `Product hidden & unpublished from storefront`
      )
      setVariants((prev) =>
        prev.map((item) =>
          item.product_id === v.product_id
            ? { ...item, is_published: nextPublished }
            : item
        )
      )
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Visibility toggle failed')
    }
  }

  // Batch action: Set selected to 0
  const handleBatchSetZero = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_out_of_stock',
          variantIds: ids,
          reason: 'Batch Marked Out of Stock by Admin',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Batch update failed')

      toast.success(`${ids.length} items marked Out of Stock (0)`)
      setVariants((prev) =>
        prev.map((item) =>
          selectedIds.has(item.id) ? { ...item, stock: 0, available: 0 } : item
        )
      )
      setSelectedIds(new Set())
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Batch action failed')
    }
  }

  // Batch action: Hide selected products
  const handleBatchHide = async () => {
    if (selectedIds.size === 0) return
    const productIdsToHide = Array.from(
      new Set(
        variants
          .filter((v) => selectedIds.has(v.id) && v.product_id)
          .map((v) => v.product_id!)
      )
    )

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unpublish_product',
          productIds: productIdsToHide,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Batch hide failed')

      toast.success(`${productIdsToHide.length} products hidden from storefront`)
      setVariants((prev) =>
        prev.map((item) =>
          item.product_id && productIdsToHide.includes(item.product_id)
            ? { ...item, is_published: false }
            : item
        )
      )
      setSelectedIds(new Set())
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Batch hide failed')
    }
  }

  // Safe delete handler
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)

    try {
      const res = await fetch(`/api/admin/inventory?variantId=${encodeURIComponent(itemToDelete.id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete')
      }

      toast.success('Item deleted successfully')
      setVariants((prev) => prev.filter((v) => v.id !== itemToDelete.id))
      setItemToDelete(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Could not delete item')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Safe Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Delete Inventory Item</h3>
                <p className="text-xs text-neutral-600 font-mono">
                  Are you sure you want to permanently delete SKU{' '}
                  <span className="font-bold text-black font-mono">"{itemToDelete.sku}"</span>?
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  Note: If historical customer orders depend on this item, permanent deletion will be prevented to protect audit logs, and you will be advised to Unpublish/Hide instead.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 font-mono text-xs">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 border border-black font-bold uppercase hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 bg-black text-white font-bold uppercase hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? 'Checking...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust / Override Stock Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mx-3">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <h3 className="text-sm font-black uppercase tracking-tight">
                Manage Stock Level
              </h3>
              <button
                onClick={() => setSelectedVariant(null)}
                className="p-1 hover:bg-neutral-100 border border-transparent hover:border-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 font-mono mb-4">
              <span className="font-bold text-black">{selectedVariant.product_name}</span> ({selectedVariant.color} / {selectedVariant.size}) • SKU: {selectedVariant.sku}
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-100 border border-neutral-300">
                <div>
                  <span className="text-neutral-500 block text-[10px]">CURRENT STOCK</span>
                  <span className="font-bold text-base">{selectedVariant.stock} units</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">NET AVAILABLE</span>
                  <span className="font-bold text-base">{selectedVariant.available} units</span>
                </div>
              </div>

              {/* Stock Mode Switch */}
              <div className="flex border border-black">
                <button
                  type="button"
                  onClick={() => setStockMode('override')}
                  className={`flex-1 py-1.5 font-bold uppercase text-[11px] ${
                    stockMode === 'override' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  Set Exact Stock
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode('adjust')}
                  className={`flex-1 py-1.5 font-bold uppercase text-[11px] border-l border-black ${
                    stockMode === 'adjust' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  Adjust (+ / -)
                </button>
              </div>

              {stockMode === 'override' ? (
                <div>
                  <label className="block uppercase font-bold mb-1">
                    Exact Physical Stock on Hand *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(Number(e.target.value))}
                    placeholder="e.g. 0 to mark Out of Stock"
                    className="w-full border border-black p-2 focus:outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setOverrideValue(0)}
                      className="px-2 py-1 border border-neutral-300 text-[10px] uppercase font-bold hover:border-black"
                    >
                      Set to 0 (Out of Stock)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideValue(5)}
                      className="px-2 py-1 border border-neutral-300 text-[10px] uppercase font-bold hover:border-black"
                    >
                      Set to 5
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideValue(10)}
                      className="px-2 py-1 border border-neutral-300 text-[10px] uppercase font-bold hover:border-black"
                    >
                      Set to 10
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block uppercase font-bold mb-1">
                      Quantity Change (+ to add, - to subtract) *
                    </label>
                    <input
                      type="number"
                      required
                      value={quantityChange}
                      onChange={(e) => setQuantityChange(Number(e.target.value))}
                      placeholder="e.g. +10 or -2"
                      className="w-full border border-black p-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block uppercase font-bold mb-1">
                      Movement Reason
                    </label>
                    <select
                      value={movementType}
                      onChange={(e: any) => setMovementType(e.target.value)}
                      className="w-full border border-black p-2 focus:outline-none"
                    >
                      <option value="adjustment">Physical Shelf Recount</option>
                      <option value="restock">Factory Restock Batch</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block uppercase font-bold mb-1">
                  Audit Reason / Notes *
                </label>
                <input
                  type="text"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Physical warehouse count reconciliation"
                  className="w-full border border-black p-2 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
                  disabled={loading}
                  className="flex-1 border border-neutral-300 py-2 uppercase font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-2 uppercase font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {loading ? 'Saving...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 font-bold uppercase transition-colors border ${
              activeFilter === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
            }`}
          >
            All Items ({countAll})
          </button>
          <button
            onClick={() => setActiveFilter('in_stock')}
            className={`px-3 py-1.5 font-bold uppercase transition-colors border ${
              activeFilter === 'in_stock'
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
            }`}
          >
            In Stock ({countInStock})
          </button>
          <button
            onClick={() => setActiveFilter('low_stock')}
            className={`px-3 py-1.5 font-bold uppercase transition-colors border ${
              activeFilter === 'low_stock'
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
            }`}
          >
            Low Stock ({countLowStock})
          </button>
          <button
            onClick={() => setActiveFilter('out_of_stock')}
            className={`px-3 py-1.5 font-bold uppercase transition-colors border ${
              activeFilter === 'out_of_stock'
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
            }`}
          >
            Out of Stock ({countOutOfStock})
          </button>
          <button
            onClick={() => setActiveFilter('hidden')}
            className={`px-3 py-1.5 font-bold uppercase transition-colors border ${
              activeFilter === 'hidden'
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
            }`}
          >
            Hidden / Unpublished ({countHidden})
          </button>
        </div>

        {/* Search input and selection status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, SKU, size, or color..."
              className="w-full border border-black pl-9 pr-3 py-2 text-xs font-mono focus:outline-none bg-white"
            />
          </div>

          {/* Batch Actions Bar (Visible when items selected) */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-neutral-100 p-1.5 border border-black text-xs font-mono">
              <span className="font-bold px-2">{selectedIds.size} selected</span>
              <button
                onClick={handleBatchSetZero}
                className="px-2.5 py-1 bg-black text-white uppercase font-bold hover:bg-neutral-800"
              >
                Set to 0
              </button>
              <button
                onClick={handleBatchHide}
                className="px-2.5 py-1 border border-black uppercase font-bold hover:bg-neutral-200"
              >
                Hide Products
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2 text-neutral-500 hover:text-black font-bold"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs font-mono min-w-[750px]">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3 w-8">
                  <button onClick={handleToggleSelectAll} title="Select All">
                    {selectedIds.size === filteredVariants.length && filteredVariants.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-black" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                </th>
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Variant</th>
                <th className="p-3 text-center">On Hand</th>
                <th className="p-3 text-center">Holds</th>
                <th className="p-3 text-center">Available</th>
                <th className="p-3 text-center">Visibility</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredVariants.length > 0 ? (
                filteredVariants.map((v) => {
                  const isOutOfStock = v.available === 0
                  const isCritical = v.available > 0 && v.available <= 3
                  const isSelected = selectedIds.has(v.id)

                  return (
                    <tr key={v.id} className={`hover:bg-neutral-50 ${isSelected ? 'bg-neutral-50' : ''}`}>
                      <td className="p-3">
                        <button onClick={() => handleToggleSelectItem(v.id)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-black" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {v.thumbnail ? (
                            <div className="w-9 h-11 bg-neutral-100 relative shrink-0 overflow-hidden border border-neutral-200">
                              <Image
                                src={v.thumbnail}
                                alt={v.product_name}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-11 bg-neutral-900 flex items-center justify-center shrink-0 text-[9px] font-bold text-neutral-400">
                              BOOM
                            </div>
                          )}
                          <div>
                            <span className="font-bold uppercase text-black block leading-tight">
                              {v.product_name}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {v.color} • {v.size}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-neutral-600 font-mono">{v.sku}</td>
                      <td className="p-3">
                        <span className="font-bold">{v.color}</span> / {v.size}
                      </td>
                      <td className="p-3 text-center font-bold">{v.stock}</td>
                      <td className="p-3 text-center text-neutral-500 font-bold">{v.reserved}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-bold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : isCritical
                              ? 'bg-black text-white'
                              : 'bg-neutral-100 text-black border border-black'
                          }`}
                        >
                          {v.available} {v.available === 1 ? 'unit' : 'units'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold ${
                            v.is_published
                              ? 'bg-neutral-100 text-neutral-800'
                              : 'bg-neutral-200 text-neutral-500 line-through'
                          }`}
                        >
                          {v.is_published ? 'Published' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAdjust(v)}
                            title="Edit Stock"
                            className="inline-flex items-center gap-1 border border-black px-2 py-1 uppercase font-bold hover:bg-black hover:text-white transition-colors text-[11px] cursor-pointer"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleQuickSetZero(v)}
                            title="Set Stock to 0"
                            disabled={v.stock === 0}
                            className="p-1 border border-neutral-300 hover:border-black hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <PackageX className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleTogglePublish(v)}
                            title={v.is_published ? 'Hide from Storefront' : 'Publish to Storefront'}
                            className="p-1 border border-neutral-300 hover:border-black hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors cursor-pointer"
                          >
                            {v.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setItemToDelete(v)}
                            title="Delete"
                            className="p-1 border border-neutral-300 hover:border-red-600 hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs font-mono text-neutral-500">
                    No inventory records match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
