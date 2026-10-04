'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'

interface Collection {
  id: string
  name: string
  slug: string
  description?: string | null
  is_visible: boolean
  sort_order: number
}

interface CollectionManagerProps {
  initialCollections: Collection[]
}

export function CollectionManager({ initialCollections }: CollectionManagerProps) {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<Collection | null>(null)

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
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_visible: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create collection')

      setCollections((prev) => [...prev, data.collection])
      toast.success(`Collection "${name}" created`)
      setName('')
      setSlug('')
      setDescription('')
      setShowAddForm(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating collection')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (col: Collection) => {
    setDeletingId(col.id)
    try {
      const res = await fetch(`/api/admin/collections?id=${encodeURIComponent(col.id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete collection')

      setCollections((prev) => prev.filter((c) => c.id !== col.id && c.slug !== col.slug))
      setConfirmDeleteCol(null)
      toast.success(`Collection "${col.name}" deleted`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting collection')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (col: Collection) => {
    try {
      const newStatus = !col.is_visible
      const res = await fetch('/api/admin/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: col.id,
          is_visible: newStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status')

      setCollections((prev) =>
        prev.map((c) => (c.id === col.id ? { ...c, is_visible: newStatus } : c))
      )
      toast.success(`Collection "${col.name}" ${newStatus ? 'published' : 'hidden'}`)
    } catch (err: any) {
      toast.error(err.message || 'Could not update collection')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Capsule Drops &amp; Collections</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Curate drop themes, launch limited release groupings, or delete legacy drops.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cancel' : 'New Collection'}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="border-2 border-black bg-white p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-tight">Create Capsule Drop</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Collection Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acid Monochrome"
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
                placeholder="e.g. acid-monochrome"
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
                placeholder="Drop narrative"
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
              {loading ? 'Creating...' : 'Save Collection'}
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      {confirmDeleteCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Delete Collection</h3>
                <p className="text-xs text-neutral-600 font-mono">
                  Are you sure you want to permanently delete collection{' '}
                  <span className="font-bold text-black">"{confirmDeleteCol.name}"</span>?
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  This will unbind products from this collection. Individual products will remain in the catalog.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setConfirmDeleteCol(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteCol)}
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
                    <span>Delete Collection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Collection Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Visibility</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {collections.length > 0 ? (
                collections.map((col) => (
                  <tr key={col.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-bold uppercase text-black">{col.name}</td>
                    <td className="p-3 text-neutral-600">/collections/{col.slug}</td>
                    <td className="p-3 text-neutral-500 max-w-xs truncate">{col.description || '—'}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(col)}
                        title="Toggle visibility"
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold transition-all border ${
                          col.is_visible
                            ? 'bg-black text-white border-black hover:bg-neutral-800'
                            : 'bg-neutral-200 text-neutral-700 border-neutral-300 hover:bg-neutral-300'
                        }`}
                      >
                        {col.is_visible ? 'Public' : 'Draft'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/collections/${col.slug}`}
                          target="_blank"
                          title="View on storefront"
                          className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCol(col)}
                          title="Delete collection"
                          className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500 font-mono">
                    No collections found. Create a collection above.
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
