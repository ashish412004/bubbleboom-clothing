'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, Loader2, AlertTriangle, FolderPlus, Eye, EyeOff } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  sort_order: number
  is_active: boolean
}

interface CategoryManagerProps {
  initialCategories: Category[]
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_active: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create category')

      setCategories((prev) => [...prev, data.category])
      toast.success(`Category "${name}" created`)
      setName('')
      setSlug('')
      setDescription('')
      setShowAddForm(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating category')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    setDeletingId(cat.id)
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(cat.id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete category')

      setCategories((prev) => prev.filter((c) => c.id !== cat.id && c.slug !== cat.slug))
      setConfirmDeleteCat(null)
      toast.success(`Category "${cat.name}" deleted`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting category')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (cat: Category) => {
    try {
      const newStatus = !cat.is_active
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat.id,
          is_active: newStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status')

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: newStatus } : c))
      )
      toast.success(`Category "${cat.name}" ${newStatus ? 'activated' : 'hidden'}`)
    } catch (err: any) {
      toast.error(err.message || 'Could not update category')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Category Architecture</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Organize the Bubble Boom wardrobe hierarchy, add categories, or delete outdated styles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cancel' : 'New Category'}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="border-2 border-black bg-white p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-tight">Create Garment Category</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hoodies & Sweats"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Slug (Optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. hoodies-sweats"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short tagline"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-6 py-2 text-xs uppercase font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Save Category'}
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      {confirmDeleteCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Delete Category</h3>
                <p className="text-xs text-neutral-600 font-mono">
                  Are you sure you want to permanently delete category{' '}
                  <span className="font-bold text-black">"{confirmDeleteCat.name}"</span>?
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  Products assigned to this category will become uncategorized.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setConfirmDeleteCat(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteCat)}
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
                    <span>Delete Category</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Category Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Sort Order</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {categories.length > 0 ? (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-bold uppercase text-black">{c.name}</td>
                    <td className="p-3 text-neutral-600">/{c.slug}</td>
                    <td className="p-3 text-neutral-500">{c.description || '—'}</td>
                    <td className="p-3 text-center">{c.sort_order}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(c)}
                        title="Toggle category status"
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold transition-all border ${
                          c.is_active
                            ? 'bg-black text-white border-black hover:bg-neutral-800'
                            : 'bg-neutral-200 text-neutral-700 border-neutral-300 hover:bg-neutral-300'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCat(c)}
                        title="Delete category"
                        className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-500 font-mono">
                    No categories found. Create a category above.
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
