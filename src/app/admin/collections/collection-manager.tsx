'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
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
  Star,
  Search,
  ArrowUp,
  ArrowDown,
  Package,
  Check,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'
import { Collection } from '@/lib/collections'

interface CollectionManagerProps {
  initialCollections: Collection[]
}

interface ProductItem {
  id: string
  name: string
  slug: string
  selling_price: number
  mrp?: number
  image_url: string | null
  total_stock?: number
  is_active?: boolean
  is_published?: boolean
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export function CollectionManager({ initialCollections }: CollectionManagerProps) {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<Collection | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'featured'>('all')

  // Form states (Add / Edit)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugModified, setSlugModified] = useState(false)
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [mobileImageUrl, setMobileImageUrl] = useState<string | null>(null)

  // SEO Fields
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoImageUrl, setSeoImageUrl] = useState<string | null>(null)

  // Assigned Products
  const [assignedProducts, setAssignedProducts] = useState<ProductItem[]>([])
  const [loadingAssigned, setLoadingAssigned] = useState(false)

  // Product Picker Modal
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [uploadingSeo, setUploadingSeo] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [mobileError, setMobileError] = useState<string | null>(null)
  const [dragOverCover, setDragOverCover] = useState(false)
  const [dragOverMobile, setDragOverMobile] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const seoInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setName('')
    setSlug('')
    setSlugModified(false)
    setShortDescription('')
    setDescription('')
    setSortOrder(0)
    setIsVisible(true)
    setIsFeatured(false)
    setCoverImageUrl(null)
    setMobileImageUrl(null)
    setSeoTitle('')
    setSeoDescription('')
    setSeoImageUrl(null)
    setAssignedProducts([])
    setCoverError(null)
    setMobileError(null)
    setShowAddForm(false)
    setEditingCollection(null)
  }

  // Load assigned products when starting edit
  const loadAssignedProducts = async (collectionId: string) => {
    setLoadingAssigned(true)
    try {
      const res = await fetch(`/api/admin/collections?products=true&collection_id=${encodeURIComponent(collectionId)}`)
      const data = await res.json()
      if (res.ok && data.products) {
        const mapped: ProductItem[] = data.products.map((item: any) => {
          const p = item.products || item
          const primaryImg = p.images?.[0]?.image_url || p.product_images?.[0]?.image_url || p.image_url || null
          const totalStock = (p.variants || []).reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0)
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            selling_price: p.selling_price,
            mrp: p.mrp,
            image_url: primaryImg,
            total_stock: totalStock,
            is_active: p.is_active,
            is_published: p.is_published,
          }
        })
        setAssignedProducts(mapped)
      }
    } catch (err) {
      console.error('Failed to load collection products:', err)
    } finally {
      setLoadingAssigned(false)
    }
  }

  const startEdit = (col: Collection) => {
    setShowAddForm(false)
    setEditingCollection(col)
    setName(col.name)
    setSlug(col.slug)
    setSlugModified(true)
    setShortDescription(col.short_description || '')
    setDescription(col.description || '')
    setSortOrder(col.sort_order ?? 0)
    setIsVisible(col.is_visible)
    setIsFeatured(Boolean(col.is_featured))
    setCoverImageUrl(col.banner_image_url || null)
    setMobileImageUrl(col.mobile_banner_image_url || null)
    setSeoTitle(col.seo_title || '')
    setSeoDescription(col.seo_description || '')
    setSeoImageUrl(col.seo_image_url || null)
    setCoverError(null)
    setMobileError(null)

    loadAssignedProducts(col.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startNew = () => {
    resetForm()
    setShowAddForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Refresh collections list
  const refreshCollections = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/collections')
      const data = await res.json()
      if (res.ok && data.collections) {
        setCollections(data.collections)
        toast.success('Collections updated from database')
      }
    } catch {
      toast.error('Failed to refresh collections')
    } finally {
      setRefreshing(false)
    }
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

  const handleSeoImageUpload = async (file: File) => {
    setUploadingSeo(true)
    const toastId = toast.loading('Uploading social sharing image...')
    try {
      const url = await uploadImage(file)
      setSeoImageUrl(url)
      toast.success('SEO image uploaded!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'SEO image upload failed.', { id: toastId })
    } finally {
      setUploadingSeo(false)
    }
  }

  // Load catalog products for picker
  const openProductPicker = async () => {
    setSelectedProductIds(assignedProducts.map((p) => p.id))
    setShowProductPicker(true)
    setLoadingCatalog(true)
    try {
      const res = await fetch('/api/admin/collections?products=true')
      const data = await res.json()
      if (res.ok && data.products) {
        setCatalogProducts(data.products)
      }
    } catch (err) {
      console.error('Error fetching catalog products:', err)
      toast.error('Failed to load catalog products')
    } finally {
      setLoadingCatalog(false)
    }
  }

  const toggleSelectProduct = (product: ProductItem) => {
    if (selectedProductIds.includes(product.id)) {
      setSelectedProductIds((prev) => prev.filter((id) => id !== product.id))
    } else {
      setSelectedProductIds((prev) => [...prev, product.id])
    }
  }

  const handleConfirmProducts = () => {
    // Map selected IDs back to product items (preserving existing assigned order)
    const currentMap = new Map(assignedProducts.map((p) => [p.id, p]))
    const catalogMap = new Map(catalogProducts.map((p) => [p.id, p]))

    const newAssigned: ProductItem[] = []
    // Keep already assigned items in their order
    for (const p of assignedProducts) {
      if (selectedProductIds.includes(p.id)) {
        newAssigned.push(p)
      }
    }
    // Add newly selected items
    for (const id of selectedProductIds) {
      if (!currentMap.has(id) && catalogMap.has(id)) {
        newAssigned.push(catalogMap.get(id)!)
      }
    }

    setAssignedProducts(newAssigned)
    setShowProductPicker(false)
    toast.success(`${newAssigned.length} products assigned to drop`)
  }

  const removeProduct = (productId: string) => {
    setAssignedProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === assignedProducts.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...assignedProducts]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setAssignedProducts(updated)
  }

  // Save handler
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
      short_description: shortDescription.trim() || null,
      description: description.trim() || null,
      banner_image_url: coverImageUrl,
      mobile_banner_image_url: mobileImageUrl,
      sort_order: Number(sortOrder) || 0,
      is_visible: isVisible,
      is_featured: isFeatured,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      seo_image_url: seoImageUrl,
      product_ids: assignedProducts.map((p) => p.id),
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
          prev.map((c) =>
            c.id === editingCollection.id
              ? {
                  ...c,
                  ...payload,
                  slug: payload.slug || c.slug,
                  product_count: assignedProducts.length,
                }
              : c
          )
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

        setCollections((prev) => [
          ...prev,
          {
            ...data.collection,
            product_count: assignedProducts.length,
          },
        ])
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

  // Safe delete handler
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
      toast.success(`Collection "${col.name}" removed`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting collection')
    } finally {
      setDeletingId(null)
    }
  }

  // Toggle published status
  const handleTogglePublish = async (col: Collection) => {
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
      toast.success(`"${col.name}" is now ${newStatus ? 'Published' : 'Draft'}`)
    } catch (err: any) {
      toast.error(err.message || 'Could not update collection')
    }
  }

  // Toggle featured status
  const handleToggleFeatured = async (col: Collection) => {
    try {
      const newFeatured = !col.is_featured
      const res = await fetch('/api/admin/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: col.id,
          is_featured: newFeatured,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to toggle featured status')

      setCollections((prev) =>
        prev.map((c) => (c.id === col.id ? { ...c, is_featured: newFeatured } : c))
      )
      toast.success(
        `"${col.name}" ${newFeatured ? 'marked as Featured Capsule on Homepage' : 'unmarked from Featured'}`
      )
    } catch (err: any) {
      toast.error(err.message || 'Could not update featured status')
    }
  }

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesName = c.name.toLowerCase().includes(query)
        const matchesSlug = c.slug.toLowerCase().includes(query)
        const matchesDesc = c.description?.toLowerCase().includes(query)
        if (!matchesName && !matchesSlug && !matchesDesc) return false
      }

      // Status filter
      if (statusFilter === 'published' && !c.is_visible) return false
      if (statusFilter === 'draft' && c.is_visible) return false
      if (statusFilter === 'featured' && !c.is_featured) return false

      return true
    })
  }, [collections, searchQuery, statusFilter])

  const isFormActive = showAddForm || Boolean(editingCollection)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">Capsule Drops &amp; Collections</h1>
            <span className="text-xs font-mono bg-black text-white px-2 py-0.5 font-bold">
              {collections.length}
            </span>
          </div>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Curate drop themes, upload sneaker campaign photography, assign products, feature on homepage, or edit existing drops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshCollections}
            disabled={refreshing}
            title="Refresh from database"
            className="p-2.5 border border-black hover:bg-neutral-100 transition-colors inline-flex items-center justify-center min-w-[40px] min-h-[40px]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

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
      </div>

      {/* Add / Edit Form Panel */}
      {isFormActive && (
        <form
          onSubmit={handleSave}
          className="border-2 border-black bg-white p-5 sm:p-7 space-y-8 shadow-lg animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
                {editingCollection ? 'Editing Drop' : 'Create Drop'}
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight mt-0.5">
                {editingCollection ? editingCollection.name : 'New Capsule Collection'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold border ${
                  isVisible ? 'bg-black text-white border-black' : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                }`}
              >
                {isVisible ? 'Published' : 'Draft'}
              </span>
              {isFeatured && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 font-bold bg-amber-100 text-amber-900 border border-amber-400">
                  Featured
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2 border-b border-neutral-200 pb-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>1. Basic Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Collection Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!slugModified && !editingCollection) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)+/g, '')
                      )
                    }
                  }}
                  placeholder="e.g. BUBBLE BOOM – MONOCHROME KICKS"
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Slug (URL Path) *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugModified(true)
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-_]/g, '-')
                    )
                  }}
                  placeholder="e.g. bubble-boom-monochrome-kicks"
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 font-mono">/collections/{slug || '...'}</span>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 font-mono">Lower numbers show first (e.g. 1)</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Short Description (Cards &amp; Teaser)
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="e.g. Signature monochrome sneakers engineered for bold streetwear attitude."
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Status &amp; Homepage Feature
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVisible(!isVisible)}
                    className={`border p-2.5 text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-2 ${
                      isVisible
                        ? 'bg-black text-white border-black'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>{isVisible ? 'Published (Public)' : 'Draft (Hidden)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFeatured(!isFeatured)}
                    className={`border p-2.5 text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-2 ${
                      isFeatured
                        ? 'bg-amber-400 text-black border-black shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    <Star size={14} className={isFeatured ? 'fill-black' : ''} />
                    <span>{isFeatured ? 'Featured on Homepage' : 'Not Featured'}</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Full Description / Drop Narrative
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the drop story, campaign vision, materials, or design details..."
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Imagery & Media */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2 border-b border-neutral-200 pb-2">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>2. Campaign Photography &amp; Banners</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Desktop Cover */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-tight text-black">
                    Desktop Cover Image *
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">16:10 or 4:3 (Max 10MB)</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Appears on the homepage Featured Capsule banner and collection detail hero.
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
                {coverError && <p className="text-[11px] text-red-600 font-mono">{coverError}</p>}
              </div>

              {/* Mobile Banner */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-tight text-black">
                    Mobile Crop (Optional)
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">4:5 or 1:1</span>
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
                {mobileError && <p className="text-[11px] text-red-600 font-mono">{mobileError}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Collection Products Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                <span>3. Collection Products ({assignedProducts.length})</span>
              </h3>

              <button
                type="button"
                onClick={openProductPicker}
                className="bg-black text-white px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Assign Products</span>
              </button>
            </div>

            <p className="text-[11px] text-neutral-600 font-mono">
              Products assigned to this collection will appear on its detail page. Use the arrows to reorder them.
            </p>

            {loadingAssigned ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-black" />
                <span className="text-xs font-mono mt-2 block">Loading assigned products...</span>
              </div>
            ) : assignedProducts.length > 0 ? (
              <div className="border border-black divide-y divide-neutral-200 bg-white">
                {assignedProducts.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-neutral-400 w-5 text-center">
                        {idx + 1}
                      </span>
                      <div className="relative w-10 h-10 bg-neutral-100 border border-neutral-300 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="40px" />
                        ) : (
                          <Package className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase text-black truncate">{p.name}</div>
                        <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2">
                          <span>₹{p.selling_price}</span>
                          <span>•</span>
                          <span>Stock: {p.total_stock ?? '—'}</span>
                          <span>•</span>
                          <span className={p.is_active !== false ? 'text-emerald-700' : 'text-neutral-500'}>
                            {p.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveProduct(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 border border-neutral-300 hover:border-black disabled:opacity-30 disabled:hover:border-neutral-300"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProduct(idx, 'down')}
                        disabled={idx === assignedProducts.length - 1}
                        title="Move Down"
                        className="p-1 border border-neutral-300 hover:border-black disabled:opacity-30 disabled:hover:border-neutral-300"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.id)}
                        title="Remove product from collection"
                        className="p-1 border border-red-300 text-red-600 hover:bg-red-50 ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-neutral-300 p-8 text-center bg-[#F8F8F6]">
                <Package className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs font-mono font-bold uppercase text-neutral-700">No products assigned yet</p>
                <p className="text-[11px] font-mono text-neutral-500 mt-1">
                  Click &quot;Assign Products&quot; to link sneakers, apparel, or accessories to this capsule.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: SEO Metadata */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2 border-b border-neutral-200 pb-2">
              <Search className="w-3.5 h-3.5" />
              <span>4. SEO &amp; Social Sharing (Optional)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="e.g. Bubble Boom Monochrome Kicks | Official Drop"
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Social Sharing Image (OG Image)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seoImageUrl || ''}
                    onChange={(e) => setSeoImageUrl(e.target.value)}
                    placeholder="https://... or upload image"
                    className="flex-1 border border-black p-2.5 text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => seoInputRef.current?.click()}
                    disabled={uploadingSeo}
                    className="bg-neutral-100 border border-black px-3 py-2 text-xs font-mono font-bold uppercase hover:bg-neutral-200"
                  >
                    {uploadingSeo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  </button>
                  <input
                    ref={seoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleSeoImageUpload(file)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono uppercase font-bold text-neutral-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Meta description for search engine previews (recommended 150-160 characters)"
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
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
              className="bg-black text-white px-7 py-2.5 text-xs uppercase font-mono font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Collection...</span>
                </>
              ) : (
                <span>{editingCollection ? 'Save Changes' : 'Create Drop'}</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Product Selection Drawer / Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b-2 border-black flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight">Select Products for Capsule</h3>
                <span className="text-[11px] font-mono text-neutral-500">
                  {selectedProductIds.length} products selected
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProductPicker(false)}
                className="p-1.5 border border-neutral-300 hover:border-black"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-neutral-200">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by title or sku..."
                  className="w-full pl-9 pr-3 py-2 border border-black text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-100">
              {loadingCatalog ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-black" />
                  <span className="text-xs font-mono mt-2 block">Loading catalog products...</span>
                </div>
              ) : catalogProducts.length > 0 ? (
                catalogProducts
                  .filter((p) =>
                    !productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase().trim())
                  )
                  .map((p) => {
                    const isSelected = selectedProductIds.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSelectProduct(p)}
                        className={`py-2.5 px-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-black border-black text-white' : 'border-neutral-400 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={14} />}
                          </div>

                          <div className="relative w-10 h-10 bg-neutral-100 border border-neutral-300 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.image_url ? (
                              <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="40px" />
                            ) : (
                              <Package className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold uppercase text-black truncate">{p.name}</div>
                            <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2">
                              <span>₹{p.selling_price}</span>
                              <span>•</span>
                              <span>Stock: {p.total_stock ?? '—'}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                            p.is_active !== false ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                          }`}
                        >
                          {p.is_active !== false ? 'Active' : 'Draft'}
                        </span>
                      </div>
                    )
                  })
              ) : (
                <div className="py-8 text-center text-xs font-mono text-neutral-500">
                  No products found in catalog.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-black bg-neutral-50 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-600">
                {selectedProductIds.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductPicker(false)}
                  className="px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmProducts}
                  className="px-5 py-2 bg-black text-white text-xs font-mono uppercase font-bold hover:bg-neutral-800"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {confirmDeleteCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-neutral-100 border border-black flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">Delete Collection Drop</h3>
                <p className="text-xs text-neutral-700 font-mono">
                  Are you sure you want to remove collection{' '}
                  <span className="font-bold text-black">&quot;{confirmDeleteCol.name}&quot;</span>?
                </p>
                <div className="bg-neutral-50 border border-neutral-300 p-3 my-2 text-[11px] font-mono text-neutral-600 space-y-1">
                  <p className="font-bold text-black">Data Safety Guarantee:</p>
                  <p>• Underlying products, variants, and images will NOT be deleted.</p>
                  <p>• Customer order history is 100% preserved.</p>
                  <p>• Products will only be unlinked from this collection drop.</p>
                </div>
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
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-50 p-3 border border-black">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-9 pr-3 py-1.5 border border-black text-xs font-mono bg-white focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['all', 'published', 'draft', 'featured'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-mono uppercase font-bold tracking-wider transition-colors border ${
                statusFilter === tab
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Collections Table */}
      <div className="hidden md:block border border-black bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3 w-16">Cover</th>
                <th className="p-3">Collection Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3 text-center">Products</th>
                <th className="p-3 text-center">Order</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Featured</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredCollections.length > 0 ? (
                filteredCollections.map((col) => (
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
                        {col.short_description && (
                          <span className="text-[10px] text-neutral-500 font-normal line-clamp-1">
                            {col.short_description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="p-3 text-neutral-600">/collections/{col.slug}</td>

                    {/* Products Count */}
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 border border-neutral-300 font-bold text-neutral-800">
                        <Package size={12} />
                        <span>{col.product_count ?? 0}</span>
                      </span>
                    </td>

                    {/* Sort Order */}
                    <td className="p-3 text-center font-bold text-black">{col.sort_order ?? 0}</td>

                    {/* Visibility Status */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(col)}
                        title="Toggle visibility"
                        className={`text-[10px] uppercase font-mono px-2.5 py-1 font-bold transition-all border ${
                          col.is_visible
                            ? 'bg-black text-white border-black hover:bg-neutral-800'
                            : 'bg-neutral-200 text-neutral-700 border-neutral-300 hover:bg-neutral-300'
                        }`}
                      >
                        {col.is_visible ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    {/* Featured Toggle */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(col)}
                        title="Toggle homepage featured status"
                        className={`text-[10px] uppercase font-mono px-2 py-1 font-bold transition-all border inline-flex items-center gap-1 ${
                          col.is_featured
                            ? 'bg-amber-400 text-black border-black font-extrabold shadow-sm'
                            : 'bg-white text-neutral-400 border-neutral-200 hover:border-black hover:text-black'
                        }`}
                      >
                        <Star size={12} className={col.is_featured ? 'fill-black' : ''} />
                        <span>{col.is_featured ? 'Featured' : 'Standard'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(col)}
                          title="Edit collection"
                          className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors text-neutral-700 inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/collections/${col.slug}?preview=true`}
                          target="_blank"
                          title="View on storefront (Preview)"
                          className="p-1.5 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-colors inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCol(col)}
                          title="Delete collection"
                          className="p-1.5 border border-neutral-200 hover:border-red-600 hover:bg-red-600 hover:text-white transition-colors text-neutral-700 inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500 font-mono">
                    No collections match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Collection Cards */}
      <div className="md:hidden space-y-4">
        {filteredCollections.length > 0 ? (
          filteredCollections.map((col) => (
            <div key={col.id} className="border border-black bg-white p-4 space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="relative w-16 h-16 bg-neutral-100 border border-black overflow-hidden shrink-0 flex items-center justify-center">
                  {col.banner_image_url ? (
                    <Image
                      src={col.banner_image_url}
                      alt={col.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-neutral-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold uppercase text-black leading-snug">{col.name}</h3>
                  <p className="text-[10px] font-mono text-neutral-500 mt-0.5">/collections/{col.slug}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span
                      className={`text-[9px] uppercase font-mono px-2 py-0.5 font-bold border ${
                        col.is_visible ? 'bg-black text-white border-black' : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {col.is_visible ? 'Published' : 'Draft'}
                    </span>
                    {col.is_featured && (
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 font-bold bg-amber-400 text-black border border-black">
                        Featured
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-neutral-600 bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">
                      {col.product_count ?? 0} prods
                    </span>
                    <span className="text-[9px] font-mono text-neutral-500">
                      Order: {col.sort_order ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {col.description && (
                <p className="text-xs text-neutral-600 font-mono line-clamp-2">{col.description}</p>
              )}

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => startEdit(col)}
                  className="min-h-[40px] border border-black text-xs font-mono font-bold uppercase hover:bg-neutral-100 flex items-center justify-center gap-1"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <Link
                  href={`/collections/${col.slug}?preview=true`}
                  target="_blank"
                  className="min-h-[40px] border border-black text-xs font-mono font-bold uppercase hover:bg-neutral-100 flex items-center justify-center gap-1"
                >
                  <ExternalLink size={13} />
                  <span>View</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleTogglePublish(col)}
                  className={`min-h-[40px] border text-xs font-mono font-bold uppercase flex items-center justify-center ${
                    col.is_visible
                      ? 'bg-black text-white border-black'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                  }`}
                >
                  {col.is_visible ? 'Hide' : 'Pub'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCol(col)}
                  className="min-h-[40px] border border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-dashed border-neutral-300 p-8 text-center bg-white font-mono text-xs text-neutral-500">
            No collections found.
          </div>
        )}
      </div>
    </div>
  )
}
