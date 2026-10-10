'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Upload,
  ImageIcon,
  X,
  Edit2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react'

export interface Collection {
  id: string
  name: string
  slug: string
  description?: string | null
  banner_image_url?: string | null
  mobile_banner_image_url?: string | null
  is_visible: boolean
  sort_order: number
}

interface CollectionManagerProps {
  initialCollections: Collection[]
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export function CollectionManager({ initialCollections }: CollectionManagerProps) {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<Collection | null>(null)

  // Form states (used for both Add and Edit)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [mobileImageUrl, setMobileImageUrl] = useState<string | null>(null)

  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [mobileError, setMobileError] = useState<string | null>(null)
  const [dragOverCover, setDragOverCover] = useState(false)
  const [dragOverMobile, setDragOverMobile] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setName('')
    setSlug('')
    setDescription('')
    setSortOrder(0)
    setIsVisible(true)
    setCoverImageUrl(null)
    setMobileImageUrl(null)
    setCoverError(null)
    setMobileError(null)
    setShowAddForm(false)
    setEditingCollection(null)
  }

  const startEdit = (col: Collection) => {
    setShowAddForm(false)
    setEditingCollection(col)
    setName(col.name)
    setSlug(col.slug)
    setDescription(col.description || '')
    setSortOrder(col.sort_order ?? 0)
    setIsVisible(col.is_visible)
    setCoverImageUrl(col.banner_image_url || null)
    setMobileImageUrl(col.mobile_banner_image_url || null)
    setCoverError(null)
    setMobileError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startNew = () => {
    resetForm()
    setShowAddForm(true)
  }

  // Upload file helper to Supabase Storage via /api/admin/upload
  const uploadImage = async (file: File): Promise<string> => {
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      throw new Error(`Invalid format "${file.type}". Allowed: JPG, PNG, WEBP, AVIF.`)
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Image exceeds 10MB limit. Please upload a smaller file.')
    }

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload image.')
    }

    const url = data.url || data.urls?.[0]
    if (!url) throw new Error('No public URL returned from upload.')
    return url
  }

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    setCoverError(null)
    const toastId = toast.loading('Uploading collection cover image...')
    try {
      const url = await uploadImage(file)
      setCoverImageUrl(url)
      toast.success('Cover image uploaded!', { id: toastId })
    } catch (err: any) {
      const msg = err.message || 'Cover upload failed.'
      setCoverError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setUploadingCover(false)
    }
  }

  const handleMobileUpload = async (file: File) => {
    setUploadingMobile(true)
    setMobileError(null)
    const toastId = toast.loading('Uploading mobile banner image...')
    try {
      const url = await uploadImage(file)
      setMobileImageUrl(url)
      toast.success('Mobile banner image uploaded!', { id: toastId })
    } catch (err: any) {
      const msg = err.message || 'Mobile upload failed.'
      setMobileError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setUploadingMobile(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Collection name is required.')
      return
    }

    setLoading(true)
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || null,
      banner_image_url: coverImageUrl,
      mobile_banner_image_url: mobileImageUrl,
      sort_order: Number(sortOrder) || 0,
      is_visible: isVisible,
    }

    try {
      if (editingCollection) {
        // Edit flow
        const res = await fetch('/api/admin/collections', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCollection.id,
            ...payload,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update collection')

        setCollections((prev) =>
          prev.map((c) => (c.id === editingCollection.id ? { ...c, ...data.collection } : c))
        )
        toast.success(`Collection "${name}" updated successfully!`)
      } else {
        // Create flow
        const res = await fetch('/api/admin/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create collection')

        setCollections((prev) => [...prev, data.collection])
        toast.success(`Collection "${name}" created successfully!`)
      }

      resetForm()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save collection.')
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

  const isFormActive = showAddForm || Boolean(editingCollection)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Capsule Drops &amp; Collections</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Curate drop themes, upload sneaker campaign photography, launch limited releases, or edit existing drops.
          </p>
        </div>

        {!isFormActive ? (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 border border-black text-black px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {isFormActive && (
        <form onSubmit={handleSave} className="border-2 border-black bg-white p-5 sm:p-7 space-y-6 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-black pb-3">
            <h3 className="text-sm font-black uppercase tracking-tight">
              {editingCollection ? `Edit Collection: ${editingCollection.name}` : 'Create Capsule Drop'}
            </h3>
            <span className="text-[11px] font-mono uppercase text-neutral-500">
              {editingCollection ? 'Editing Existing' : 'New Drop'}
            </span>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Collection Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!editingCollection && !slug) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
                  }
                }}
                placeholder="e.g. BUBBLE BOOM – MONOCHROME KICKS"
                className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Slug (URL Identifier)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. bubble-boom-monochrome-kicks"
                className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
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
                className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Description / Drop Narrative
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the drop story, campaign vision, or design details..."
                className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Visibility
              </label>
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className={`w-full border p-2.5 text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-2 ${
                  isVisible ? 'bg-black text-white border-black' : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                }`}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{isVisible ? 'Published (Public)' : 'Hidden (Draft)'}</span>
              </button>
            </div>
          </div>

          {/* Image Uploaders Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-neutral-200">
            {/* Desktop Collection Cover Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-tight text-black">
                  Desktop Collection Cover Image *
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  Recommended: 4:3 or 16:10 (Max 10MB)
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Appears on the homepage Featured Capsule banner and collection header.
              </p>

              {coverImageUrl ? (
                <div className="relative aspect-[16/10] bg-neutral-900 border-2 border-black overflow-hidden group">
                  <Image
                    src={coverImageUrl}
                    alt="Collection Cover"
                    fill
                    className="object-cover"
                    sizes="500px"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="bg-white text-black px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-neutral-200 transition-colors"
                    >
                      Replace Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl(null)}
                      className="bg-black text-white border border-white px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-neutral-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverCover(true)
                  }}
                  onDragLeave={() => setDragOverCover(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverCover(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleCoverUpload(file)
                  }}
                  onClick={() => coverInputRef.current?.click()}
                  className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[160px] ${
                    dragOverCover ? 'border-black bg-neutral-100' : 'border-neutral-300 hover:border-black bg-[#F8F8F6]'
                  }`}
                >
                  {uploadingCover ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-black" />
                      <span className="text-xs font-mono uppercase font-bold">Uploading Cover...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-neutral-400 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-wider text-black">
                        Upload Cover Image
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500 mt-1">
                        Drag and drop or click to browse (JPG, PNG, WebP)
                      </span>
                    </>
                  )}
                </div>
              )}

              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCoverUpload(file)
                  e.target.value = ''
                }}
              />
              {coverError && (
                <p className="text-[11px] text-red-600 font-mono">{coverError}</p>
              )}
            </div>

            {/* Optional Mobile Banner Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-tight text-black">
                  Mobile Banner Image (Optional)
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  Recommended: 4:5 or 1:1
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Optional separate vertical crop for small screens. Falls back to desktop cover when omitted.
              </p>

              {mobileImageUrl ? (
                <div className="relative aspect-[16/10] bg-neutral-900 border-2 border-black overflow-hidden group">
                  <Image
                    src={mobileImageUrl}
                    alt="Mobile Banner"
                    fill
                    className="object-cover"
                    sizes="500px"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => mobileInputRef.current?.click()}
                      disabled={uploadingMobile}
                      className="bg-white text-black px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-neutral-200 transition-colors"
                    >
                      Replace Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileImageUrl(null)}
                      className="bg-black text-white border border-white px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-neutral-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverMobile(true)
                  }}
                  onDragLeave={() => setDragOverMobile(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverMobile(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleMobileUpload(file)
                  }}
                  onClick={() => mobileInputRef.current?.click()}
                  className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[160px] ${
                    dragOverMobile ? 'border-black bg-neutral-100' : 'border-neutral-300 hover:border-black bg-[#F8F8F6]'
                  }`}
                >
                  {uploadingMobile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-black" />
                      <span className="text-xs font-mono uppercase font-bold">Uploading Mobile Image...</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-neutral-400 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-wider text-black">
                        Upload Mobile Crop (Optional)
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500 mt-1">
                        Drag and drop or click to browse
                      </span>
                    </>
                  )}
                </div>
              )}

              <input
                ref={mobileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleMobileUpload(file)
                  e.target.value = ''
                }}
              />
              {mobileError && (
                <p className="text-[11px] text-red-600 font-mono">{mobileError}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading || uploadingCover || uploadingMobile}
              className="px-5 py-2.5 border border-black text-xs uppercase font-mono font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingCover || uploadingMobile}
              className="bg-black text-white px-6 py-2.5 text-xs uppercase font-mono font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>{editingCollection ? 'Save Changes' : 'Create Drop'}</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Delete Collection</h3>
                <p className="text-xs text-neutral-600 font-mono">
                  Are you sure you want to permanently delete collection{' '}
                  <span className="font-bold text-black">&quot;{confirmDeleteCol.name}&quot;</span>?
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  This will unbind products from this collection. Individual products will remain in the catalog.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setConfirmDeleteCol(null)}
                disabled={deletingId !== null}
                className="min-h-[44px] px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteCol)}
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
                    <span>Delete Collection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections Table */}
      <div className="border border-black bg-white shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[700px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3 w-16">Cover</th>
                <th className="p-3">Collection Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Order</th>
                <th className="p-3 text-center">Visibility</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {collections.length > 0 ? (
                collections.map((col) => (
                  <tr key={col.id} className="hover:bg-neutral-50 transition-colors">
                    {/* Thumbnail */}
                    <td className="p-3">
                      <div className="relative w-12 h-12 bg-neutral-100 border border-black overflow-hidden flex items-center justify-center">
                        {col.banner_image_url ? (
                          <Image
                            src={col.banner_image_url}
                            alt={col.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="p-3 font-bold uppercase text-black">
                      <div className="flex flex-col">
                        <span>{col.name}</span>
                        {col.slug === 'bubble-boom-monochrome-kicks' && (
                          <span className="text-[9px] uppercase font-bold text-neutral-500 bg-neutral-100 px-1 py-0.5 w-fit mt-0.5 border border-neutral-300">
                            Homepage Featured
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="p-3 text-neutral-600">/collections/{col.slug}</td>

                    {/* Description */}
                    <td className="p-3 text-neutral-500 max-w-xs truncate">{col.description || '—'}</td>

                    {/* Sort Order */}
                    <td className="p-3 text-center font-bold text-black">{col.sort_order ?? 0}</td>

                    {/* Visibility */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(col)}
                        title="Toggle visibility"
                        className={`text-[10px] uppercase font-mono px-2.5 py-1 font-bold transition-all border ${
                          col.is_visible
                            ? 'bg-black text-white border-black hover:bg-neutral-800'
                            : 'bg-neutral-200 text-neutral-700 border-neutral-300 hover:bg-neutral-300'
                        }`}
                      >
                        {col.is_visible ? 'Public' : 'Draft'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(col)}
                          title="Edit collection"
                          className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700 inline-flex items-center justify-center min-w-[34px] min-h-[34px]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/collections/${col.slug}`}
                          target="_blank"
                          title="View on storefront"
                          className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors inline-flex items-center justify-center min-w-[34px] min-h-[34px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCol(col)}
                          title="Delete collection"
                          className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700 inline-flex items-center justify-center min-w-[34px] min-h-[34px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
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
