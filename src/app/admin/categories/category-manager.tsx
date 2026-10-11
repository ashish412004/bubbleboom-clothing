'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'
import {
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Check,
  Edit2,
  X,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpDown,
  Home,
  RefreshCw,
} from 'lucide-react'
import { CategoryWithCover } from '@/lib/categories'

interface CategoryManagerProps {
  initialCategories: CategoryWithCover[]
  products?: any[]
}

export function CategoryManager({ initialCategories, products = [] }: CategoryManagerProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newFileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<CategoryWithCover[]>(initialCategories)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCover | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<CategoryWithCover | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editFeaturedProductId, setEditFeaturedProductId] = useState<string | null>(null)
  const [editAutoImage, setEditAutoImage] = useState(true)
  const [editShowOnHomepage, setEditShowOnHomepage] = useState(false)
  const [editHomepageOrder, setEditHomepageOrder] = useState(1)
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [editIsActive, setEditIsActive] = useState(true)

  // New category form state
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [newFeaturedProductId, setNewFeaturedProductId] = useState<string | null>(null)
  const [newAutoImage, setNewAutoImage] = useState(true)
  const [newShowOnHomepage, setNewShowOnHomepage] = useState(false)
  const [newHomepageOrder, setNewHomepageOrder] = useState(categories.length + 1)
  const [newSortOrder, setNewSortOrder] = useState(categories.length + 1)

  const startEdit = (cat: CategoryWithCover) => {
    setEditingCategory(cat)
    setShowAddForm(false)
    setEditName(cat.name)
    setEditSlug(cat.slug)
    setEditDescription(cat.description || '')
    setEditImageUrl(cat.image_url || null)
    setEditFeaturedProductId(cat.featured_product_id || null)
    setEditAutoImage(cat.auto_image !== false)
    setEditShowOnHomepage(Boolean(cat.show_on_homepage))
    setEditHomepageOrder(cat.homepage_order ?? 1)
    setEditSortOrder(cat.sort_order ?? 0)
    setEditIsActive(cat.is_active)
  }

  const cancelEdit = () => {
    setEditingCategory(null)
  }

  const uploadFile = async (file: File): Promise<string> => {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image exceeds 10MB limit.')
    }
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to upload image')
    const url = data.url || data.urls?.[0]
    if (!url) throw new Error('No public URL returned')
    return url
  }

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Uploading cover image to Supabase Storage...')
    try {
      const url = await uploadFile(file)
      setEditImageUrl(url)
      toast.success('Cover image uploaded!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: toastId })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Uploading cover image to Supabase Storage...')
    try {
      const url = await uploadFile(file)
      setNewImageUrl(url)
      toast.success('Cover image uploaded!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: toastId })
    } finally {
      setUploading(false)
      if (newFileInputRef.current) newFileInputRef.current.value = ''
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !editName.trim()) return

    setLoading(true)
    const toastId = toast.loading('Saving category changes...')
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategory.id,
          name: editName.trim(),
          slug: editSlug.trim() || undefined,
          description: editDescription.trim() || null,
          image_url: editImageUrl,
          featured_product_id: editFeaturedProductId || null,
          auto_image: editAutoImage,
          show_on_homepage: editShowOnHomepage,
          homepage_order: Number(editHomepageOrder) || 1,
          sort_order: Number(editSortOrder) || 0,
          is_active: editIsActive,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update category')

      // Update local state
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id === editingCategory.id) {
            const updated = {
              ...c,
              name: editName.trim(),
              slug: editSlug.trim() || c.slug,
              description: editDescription.trim() || null,
              image_url: editImageUrl,
              featured_product_id: editFeaturedProductId || null,
              auto_image: editAutoImage,
              show_on_homepage: editShowOnHomepage,
              homepage_order: Number(editHomepageOrder) || 1,
              sort_order: Number(editSortOrder) || 0,
              is_active: editIsActive,
              cover_image: editImageUrl || c.cover_image,
              image_source: editImageUrl ? ('custom' as const) : c.image_source,
            }
            return updated
          }
          return c
        })
      )

      toast.success(`Category "${editName}" updated successfully!`, { id: toastId })
      setEditingCategory(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error updating category', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setLoading(true)
    const toastId = toast.loading('Creating category...')
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim() || undefined,
          description: newDescription.trim() || null,
          image_url: newImageUrl,
          featured_product_id: newFeaturedProductId || null,
          auto_image: newAutoImage,
          show_on_homepage: newShowOnHomepage,
          homepage_order: Number(newHomepageOrder) || 1,
          sort_order: Number(newSortOrder) || 0,
          is_active: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create category')

      const createdCat = {
        ...data.category,
        cover_image: newImageUrl,
        image_source: newImageUrl ? ('custom' as const) : ('fallback' as const),
      }

      setCategories((prev) => [...prev, createdCat])
      toast.success(`Category "${newName}" created successfully!`, { id: toastId })
      setNewName('')
      setNewSlug('')
      setNewDescription('')
      setNewImageUrl(null)
      setNewFeaturedProductId(null)
      setNewAutoImage(true)
      setNewShowOnHomepage(false)
      setShowAddForm(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating category', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (cat: CategoryWithCover) => {
    setDeletingId(cat.id)
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(cat.id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete category')

      setCategories((prev) => prev.filter((c) => c.id !== cat.id && c.slug !== cat.slug))
      setConfirmDeleteCat(null)
      if (editingCategory?.id === cat.id) setEditingCategory(null)
      toast.success(`Category "${cat.name}" deleted`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting category')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (cat: CategoryWithCover) => {
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

  const handleToggleHomepage = async (cat: CategoryWithCover) => {
    try {
      const newStatus = !cat.show_on_homepage
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat.id,
          show_on_homepage: newStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update homepage status')

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, show_on_homepage: newStatus } : c))
      )
      toast.success(`Category "${cat.name}" ${newStatus ? 'added to' : 'removed from'} homepage`)
    } catch (err: any) {
      toast.error(err.message || 'Could not update homepage status')
    }
  }

  // Count stats
  const totalCategories = categories.length
  const featuredCount = categories.filter((c) => c.show_on_homepage && c.is_active).length
  const customImageCount = categories.filter((c) => Boolean(c.image_url)).length

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Category Architecture</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Curate the 8 featured homepage drops, manage automatic product images, or upload custom covers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false)
              } else {
                setEditingCategory(null)
                setShowAddForm(true)
              }
            }}
            className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Form' : 'New Category'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-neutral-300">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">Total Categories</span>
          <span className="text-2xl font-black text-black">{totalCategories}</span>
        </div>
        <div className="p-4 bg-white border border-neutral-300">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">Homepage Featured</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-black">{featuredCount}</span>
            <span className="text-xs font-mono text-neutral-500">/ 8 slots</span>
          </div>
        </div>
        <div className="p-4 bg-white border border-neutral-300">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">Custom Cover Uploads</span>
          <span className="text-2xl font-black text-black">{customImageCount}</span>
        </div>
        <div className="p-4 bg-white border border-neutral-300">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">Automatic Fallback</span>
          <span className="text-2xl font-black text-black">{totalCategories - customImageCount}</span>
        </div>
      </div>

      {/* Edit Category Drawer / Form */}
      {editingCategory && (
        <div className="border-2 border-black bg-white p-6 space-y-6 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Category Editor</span>
              <h3 className="text-lg font-black uppercase tracking-tight">Edit: {editingCategory.name}</h3>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="p-1 hover:bg-neutral-100 border border-neutral-300"
              title="Close editor"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-6">
            {/* Row 1: Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                  Slug (URL identifier)
                </label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. Streetwear hoodies and pullovers"
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Row 2: Cover Image & Automation Strategy */}
            <div className="border border-neutral-300 p-4 bg-[#FBFBFA] space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                Category Cover Image & Automation Priority
              </h4>
              <p className="text-[11px] font-mono text-neutral-600">
                1. Custom Upload &nbsp;→&nbsp; 2. Featured Product &nbsp;→&nbsp; 3. Auto Primary Product &nbsp;→&nbsp; 4. Branded Fallback
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Custom Cover Image Upload */}
                <div className="space-y-3">
                  <span className="block text-[11px] font-mono uppercase font-bold text-black">
                    1. Custom Uploaded Cover Image
                  </span>

                  {editImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative aspect-[4/3] w-full max-w-xs border border-black overflow-hidden bg-neutral-100">
                        <Image
                          src={editImageUrl}
                          alt="Cover preview"
                          fill
                          className="object-cover"
                          sizes="300px"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 bg-black text-white px-3 py-1.5 text-xs font-mono uppercase font-bold hover:bg-neutral-800 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleEditImageUpload}
                            disabled={uploading}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditImageUrl(null)}
                          className="px-3 py-1.5 border border-red-600 text-red-600 text-xs font-mono uppercase font-bold hover:bg-red-50 transition-colors"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-neutral-300 p-6 text-center space-y-2 max-w-sm bg-white">
                      <ImageIcon className="w-8 h-8 mx-auto text-neutral-400" />
                      <p className="text-xs font-mono text-neutral-600">No custom cover image uploaded</p>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-neutral-800 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploading ? 'Uploading...' : 'Upload Cover Image'}</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleEditImageUpload}
                          disabled={uploading}
                        />
                      </label>
                      <p className="text-[10px] font-mono text-neutral-500">Max 10MB (JPG, PNG, WEBP, AVIF)</p>
                    </div>
                  )}
                </div>

                {/* Right: Featured Product & Auto Image Toggles */}
                <div className="space-y-4">
                  <span className="block text-[11px] font-mono uppercase font-bold text-black">
                    2 & 3. Product-Based Image Automation
                  </span>

                  {/* Toggle: Automatically use product image */}
                  <label className="flex items-start gap-3 p-3 bg-white border border-neutral-200 cursor-pointer hover:border-black transition-colors">
                    <input
                      type="checkbox"
                      checked={editAutoImage}
                      onChange={(e) => setEditAutoImage(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-black"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold uppercase text-black">
                        Automatically Use Primary Product Image
                      </span>
                      <p className="text-[11px] font-mono text-neutral-500">
                        When enabled, Bubble Boom automatically selects the primary image of an active published product from this category deterministically.
                      </p>
                    </div>
                  </label>

                  {/* Select: Featured Product */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase text-neutral-600">
                      Or Select Specific Featured Product
                    </label>
                    <select
                      value={editFeaturedProductId || ''}
                      onChange={(e) => setEditFeaturedProductId(e.target.value || null)}
                      className="w-full border border-black p-2 text-xs font-mono focus:outline-none bg-white"
                    >
                      <option value="">— None (Use Automatic Product Selection) —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.category?.name ? `(${p.category.name})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] font-mono text-neutral-500">
                      If selected and no custom image exists, this product's cover is used.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Homepage Curation & Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-neutral-300 p-4 bg-[#FBFBFA]">
              {/* Homepage Toggle */}
              <label className="flex items-start gap-3 p-2 bg-white border border-neutral-200 cursor-pointer hover:border-black transition-colors">
                <input
                  type="checkbox"
                  checked={editShowOnHomepage}
                  onChange={(e) => setEditShowOnHomepage(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-black"
                />
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-black">Show on Homepage</span>
                  <p className="text-[10px] font-mono text-neutral-500">
                    Feature this category in the curated 8-drop homepage section.
                  </p>
                </div>
              </label>

              {/* Homepage Order */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                  Homepage Display Order (1 to 8)
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={editHomepageOrder}
                  onChange={(e) => setEditHomepageOrder(Number(e.target.value))}
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
                <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  Order 1 appears first on desktop (4x2) and mobile (2x4).
                </p>
              </div>

              {/* General Sort Order */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                  All Categories Sort Order
                </label>
                <input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(Number(e.target.value))}
                  className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
                />
                <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  Order in the "View All Categories" page.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={loading}
                className="px-5 py-2.5 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 text-xs font-mono uppercase font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="border-2 border-black bg-white p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <h3 className="text-sm font-black uppercase tracking-tight">Create Garment Category</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-neutral-100 border border-neutral-300"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Knitwear & Sweaters"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Slug (Optional)
              </label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="e.g. knitwear-sweaters"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-600 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short tagline"
                className="w-full border border-black p-2 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <label className="flex items-center gap-2 p-2 border border-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newShowOnHomepage}
                onChange={(e) => setNewShowOnHomepage(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              <span className="text-xs font-mono uppercase font-bold">Show on Homepage</span>
            </label>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-600 mb-0.5">
                Homepage Order
              </label>
              <input
                type="number"
                value={newHomepageOrder}
                onChange={(e) => setNewHomepageOrder(Number(e.target.value))}
                className="w-full border border-black p-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-600 mb-0.5">
                Sort Order
              </label>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value))}
                className="w-full border border-black p-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-neutral-200">
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

      {/* Confirmation Delete Modal */}
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
                className="px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 transition-colors"
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
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[750px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3 w-16">Cover</th>
                <th className="p-3">Category Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3 text-center">Homepage</th>
                <th className="p-3 text-center">Cover Source</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {categories.length > 0 ? (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                    {/* Cover Thumbnail */}
                    <td className="p-3">
                      <div className="relative w-12 h-14 bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center">
                        {c.cover_image ? (
                          <Image
                            src={c.cover_image}
                            alt={c.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <span className="text-[9px] font-black text-neutral-500 font-mono">BOOM</span>
                        )}
                      </div>
                    </td>

                    {/* Category Name & Description */}
                    <td className="p-3">
                      <div className="font-bold uppercase text-black text-sm">{c.name}</div>
                      {c.description && <div className="text-[11px] text-neutral-500 font-mono">{c.description}</div>}
                    </td>

                    {/* Slug */}
                    <td className="p-3 text-neutral-600">/{c.slug}</td>

                    {/* Homepage Status */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleHomepage(c)}
                        title="Toggle homepage featured status"
                        className={`text-[10px] font-mono uppercase px-2.5 py-1 font-bold transition-all border ${
                          c.show_on_homepage
                            ? 'bg-black text-white border-black hover:bg-neutral-800'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                        }`}
                      >
                        {c.show_on_homepage ? `Featured (#${c.homepage_order ?? '-'})` : 'All Only'}
                      </button>
                    </td>

                    {/* Cover Source */}
                    <td className="p-3 text-center">
                      <span
                        className={`text-[9px] uppercase font-mono px-2 py-0.5 border ${
                          c.image_source === 'custom'
                            ? 'border-black bg-neutral-900 text-white'
                            : c.image_source === 'featured_product'
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : c.image_source === 'auto_product'
                            ? 'border-neutral-400 bg-neutral-100 text-neutral-800'
                            : 'border-neutral-300 bg-white text-neutral-400'
                        }`}
                      >
                        {c.image_source === 'custom'
                          ? 'Custom Upload'
                          : c.image_source === 'featured_product'
                          ? 'Featured Prod'
                          : c.image_source === 'auto_product'
                          ? 'Auto Product'
                          : 'Fallback'}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c)}
                        title="Toggle category visibility"
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold transition-all border ${
                          c.is_active
                            ? 'bg-black text-white border-black hover:bg-neutral-800'
                            : 'bg-neutral-200 text-neutral-600 border-neutral-300 hover:bg-neutral-300'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          title="Edit category"
                          className="p-1.5 border border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors text-black inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCat(c)}
                          title="Delete category"
                          className="p-1.5 border border-neutral-300 hover:border-red-600 hover:bg-red-600 hover:text-white transition-colors text-neutral-600 inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
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
