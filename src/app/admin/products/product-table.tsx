'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Trash2, ExternalLink, Search, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react'

interface ProductTableProps {
  initialProducts: any[]
}

export function ProductTable({ initialProducts }: ProductTableProps) {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<any | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Collect unique categories for filter
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.category?.name || 'Uncategorized')
        .filter(Boolean)
    )
  )

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || (p.category?.name || 'Uncategorized') === selectedCategory
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'published' && p.is_published) ||
      (selectedStatus === 'draft' && !p.is_published)

    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleDelete = async (product: any) => {
    setDeletingId(product.id)
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product')
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id && p.slug !== product.slug))
      setConfirmDeleteProduct(null)
      toast.success(`"${product.name}" deleted successfully`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting product')
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublish = async (product: any) => {
    setUpdatingId(product.id)
    try {
      const newStatus = !product.is_published
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          is_published: newStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update publication status')
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_published: newStatus } : p))
      )
      toast.success(`Product ${newStatus ? 'published' : 'moved to draft'}`)
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-neutral-50 p-3 border border-neutral-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-neutral-300 pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-black"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-neutral-300 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-black"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-neutral-300 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-black"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Delete Product</h3>
                <p className="text-xs text-neutral-600 font-mono">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-black">"{confirmDeleteProduct.name}"</span>?
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  This will remove all associated variants, inventory records, and product imagery from the catalog.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteProduct)}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2 text-xs font-mono uppercase font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price / MRP</th>
                <th className="p-3">Variants</th>
                <th className="p-3">Total Stock</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p: any) => {
                  const firstImage =
                    p.images?.[0]?.image_url ||
                    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
                  const totalStock =
                    p.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0
                  const isUpdating = updatingId === p.id

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-14 bg-neutral-100 border border-neutral-300 shrink-0 overflow-hidden">
                            <Image src={firstImage} alt={p.name} fill className="object-cover" />
                          </div>
                          <div>
                            <span className="font-bold uppercase text-black block">{p.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">/{p.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 uppercase">{p.category?.name || 'Uncategorized'}</td>
                      <td className="p-3">
                        <span className="font-black text-black">
                          ₹{p.selling_price?.toLocaleString('en-IN')}
                        </span>
                        {p.mrp > p.selling_price && (
                          <span className="text-neutral-400 line-through ml-2">
                            ₹{p.mrp?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.variants?.length || 0} variants
                        <div className="text-[10px] text-neutral-500">
                          {p.variants
                            ?.map((v: any) => v.size)
                            .filter((val: any, idx: number, arr: any[]) => arr.indexOf(val) === idx)
                            .join(', ')}
                        </div>
                      </td>
                      <td className="p-3 font-bold">
                        <span className={totalStock <= 10 ? 'text-neutral-900 font-black' : ''}>
                          {totalStock} units
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(p)}
                          disabled={isUpdating}
                          title="Click to toggle publish status"
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold transition-all border ${
                            p.is_published
                              ? 'bg-black text-white border-black hover:bg-neutral-800'
                              : 'bg-neutral-200 text-neutral-700 border-neutral-300 hover:bg-neutral-300'
                          }`}
                        >
                          {isUpdating ? '...' : p.is_published ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            title="View on storefront"
                            className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProduct(p)}
                            title="Delete product"
                            className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700"
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
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                    {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                      ? 'No products match the selected filters.'
                      : 'No products found in catalog. Create your first product above.'}
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
