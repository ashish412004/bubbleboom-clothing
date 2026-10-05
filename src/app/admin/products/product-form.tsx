'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Plus,
  Trash2,
  ArrowLeft,
  Image as ImageIcon,
  Upload,
  Loader2,
  Star,
  ChevronLeft,
  ChevronRight,
  Link2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ProductFormProps {
  categories: Array<{ id: string; name: string; slug: string }>
  initialProduct?: any
}

export function ProductForm({ categories, initialProduct }: ProductFormProps) {
  const router = useRouter()
  const isEdit = Boolean(initialProduct?.id)
  const [loading, setLoading] = useState(false)

  // Basic info
  const [name, setName] = useState(initialProduct?.name || '')
  const [slug, setSlug] = useState(initialProduct?.slug || '')
  const [description, setDescription] = useState(initialProduct?.description || '')
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || categories[0]?.id || '')
  const [material, setMaterial] = useState(initialProduct?.material || '')
  const [fit, setFit] = useState(initialProduct?.fit || '')
  const [washCare, setWashCare] = useState(initialProduct?.wash_care || '')
  const [mrp, setMrp] = useState<number | ''>(initialProduct?.mrp ?? '')
  const [sellingPrice, setSellingPrice] = useState<number | ''>(initialProduct?.selling_price ?? '')
  const [isPublished, setIsPublished] = useState(initialProduct?.is_published ?? true)

  // Variants matrix
  const [variants, setVariants] = useState<
    Array<{ id?: string; color: string; size: string; sku: string; stock: number; is_active?: boolean }>
  >(
    initialProduct?.variants && initialProduct.variants.length > 0
      ? initialProduct.variants.map((v: any) => ({
          id: v.id,
          color: v.color || '',
          size: v.size || '',
          sku: v.sku || '',
          stock: v.stock ?? 0,
          is_active: v.is_active ?? true,
        }))
      : [{ color: 'Black', size: 'M', sku: '', stock: 0 }]
  )

  // Images
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialProduct?.images && initialProduct.images.length > 0
      ? initialProduct.images.map((img: any) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean)
      : []
  )
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [failedFiles, setFailedFiles] = useState<File[] | null>(null)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showManualUrl, setShowManualUrl] = useState(false)
  const [manualUrlInput, setManualUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!isEdit && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
    }
  }

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { color: '', size: 'M', sku: '', stock: 0 },
    ])
  }

  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  const updateVariantRow = (index: number, field: string, value: any) => {
    setVariants((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // Upload single file via direct signed upload to Supabase Storage, with fallback
  const uploadSingleFile = async (file: File): Promise<string> => {
    // 1. Prefer direct signed upload to avoid routing large payloads through Vercel Functions
    try {
      const signRes = await fetch('/api/admin/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })

      if (signRes.ok) {
        const signData = await signRes.json()
        if (signData.path && signData.token) {
          const supabase = createClient()
          const { error: uploadErr } = await supabase.storage
            .from('product-images')
            .uploadToSignedUrl(signData.path, signData.token, file, {
              contentType: file.type,
            })

          if (!uploadErr && signData.publicUrl) {
            return signData.publicUrl
          }
        }
      }
    } catch (directErr) {
      console.warn('[Direct Upload] Falling back to server upload:', directErr)
    }

    // 2. Fallback to server-side Supabase Storage upload
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload photo to Supabase Storage')
    }

    const publicUrl = data.url || data.urls?.[0]
    if (!publicUrl) {
      throw new Error('No public URL returned from upload')
    }
    return publicUrl
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (fileArray.length === 0) {
      toast.error('Please select valid image files (JPG, PNG, WEBP, AVIF, GIF)')
      return
    }

    setUploadingImages(true)
    setUploadError(null)
    setFailedFiles(null)
    const toastId = toast.loading(`Uploading ${fileArray.length} photo(s)...`)

    try {
      const newUrls: string[] = []
      for (let i = 0; i < fileArray.length; i++) {
        setUploadProgressText(`Uploading photo ${i + 1} of ${fileArray.length}...`)
        const uploadedUrl = await uploadSingleFile(fileArray[i])
        newUrls.push(uploadedUrl)
      }

      if (newUrls.length > 0) {
        setImageUrls((prev) => [...prev.filter(Boolean), ...newUrls])
        toast.success(`Uploaded ${newUrls.length} photo(s) to storage!`, { id: toastId })
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Image upload failed. Please try again.'
      setUploadError(errorMsg)
      setFailedFiles(fileArray)
      toast.error(errorMsg, { id: toastId })
    } finally {
      setUploadingImages(false)
      setUploadProgressText('')
    }
  }

  const triggerReplace = (index: number) => {
    setReplaceTargetIndex(index)
    replaceFileInputRef.current?.click()
  }

  const handleReplaceFile = async (file: File, index: number) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file.')
      return
    }

    setReplacingIndex(index)
    const toastId = toast.loading('Uploading replacement photo...')

    try {
      const newUrl = await uploadSingleFile(file)
      // Only update image list once new upload succeeds; previous image is retained until now!
      setImageUrls((prev) => {
        const next = [...prev]
        next[index] = newUrl
        return next
      })
      toast.success('Photo replaced successfully!', { id: toastId })
    } catch (err: any) {
      // Retain original image intact on failure
      toast.error(err.message || 'Replacement failed. Original photo kept.', { id: toastId })
    } finally {
      setReplacingIndex(null)
      setReplaceTargetIndex(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleAddManualUrl = () => {
    const trimmed = manualUrlInput.trim()
    if (!trimmed) return
    if (trimmed.includes('\\') || /^[a-zA-Z]:/.test(trimmed)) {
      toast.error('Local disk paths (e.g. C:\\...) cannot be entered as URLs. Please use the Upload button above!')
      return
    }
    setImageUrls((prev) => [...prev.filter(Boolean), trimmed])
    setManualUrlInput('')
    setShowManualUrl(false)
    toast.success('Image URL added')
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const makePrimary = (index: number) => {
    setImageUrls((prev) => {
      if (index === 0) return prev
      const next = [...prev]
      const [item] = next.splice(index, 1)
      return [item, ...next]
    })
  }

  const moveImage = (index: number, direction: 'prev' | 'next') => {
    setImageUrls((prev) => {
      const targetIdx = direction === 'prev' ? index - 1 : index + 1
      if (targetIdx < 0 || targetIdx >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(targetIdx, 0, item)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug || sellingPrice === '') {
      toast.error('Name, slug, and selling price are required')
      return
    }

    if (variants.length === 0) {
      toast.error('Add at least one size/color variant')
      return
    }

    const validImages = imageUrls.filter(Boolean)
    const hasDiskPath = validImages.some((img) => img && (img.includes('\\') || /^[a-zA-Z]:/.test(img)))
    if (hasDiskPath) {
      toast.error('Local disk paths cannot be viewed by browsers. Please use the Upload Photos button to upload directly from your computer!', { duration: 6000 })
      return
    }

    setLoading(true)

    try {
      const endpoint = '/api/admin/products'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            id: initialProduct?.id,
            name,
            slug,
            description,
            category_id: categoryId || null,
            material,
            fit,
            wash_care: washCare,
            mrp: Number(mrp) || Number(sellingPrice),
            selling_price: Number(sellingPrice),
            is_published: isPublished,
          },
          variants,
          images: imageUrls.filter(Boolean),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'} product`)

      toast.success(`Product ${isEdit ? 'updated' : 'created'} successfully!`)
      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error saving product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase font-bold hover:underline min-h-[38px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-5 sm:px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 cursor-pointer min-h-[44px]"
        >
          {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Publish Product'}
        </button>
      </div>

      {/* Basic Info */}
      <div className="border border-black bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-tight pb-2 border-b border-neutral-200">
          Core Product Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acid Wash Boxy Tee"
              className="w-full border border-black p-2.5 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              URL Slug *
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acid-wash-boxy-tee"
              className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of cut, drape, textile, and graphic details..."
            className="w-full border border-black p-2.5 text-xs focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-black p-2.5 text-xs focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              MRP (₹)
            </label>
            <input
              type="number"
              value={mrp}
              onChange={(e) => setMrp(Number(e.target.value))}
              className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Selling Price (₹) *
            </label>
            <input
              type="number"
              required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Material
            </label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full border border-black p-2.5 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Fit
            </label>
            <input
              type="text"
              value={fit}
              onChange={(e) => setFit(e.target.value)}
              className="w-full border border-black p-2.5 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Wash Care
            </label>
            <input
              type="text"
              value={washCare}
              onChange={(e) => setWashCare(e.target.value)}
              className="w-full border border-black p-2.5 text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded-none border border-black accent-black"
            />
            <span className="text-xs font-bold text-black uppercase font-mono">
              Published on Storefront
            </span>
          </label>
        </div>
      </div>

      {/* Variant Matrix */}
      <div className="border border-black bg-white p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">Variant Matrix (Color &amp; Sizing)</h2>
            <p className="text-[11px] text-neutral-500 font-mono">Variant-level inventory management</p>
          </div>
          <button
            type="button"
            onClick={addVariantRow}
            className="inline-flex items-center gap-1.5 border border-black px-3 py-1.5 text-xs font-mono uppercase font-bold hover:bg-black hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variant</span>
          </button>
        </div>

        <div className="space-y-2">
          {variants.map((v, idx) => (
            <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap items-end gap-2.5 sm:gap-3 p-3 bg-[#F8F8F6] border border-neutral-300">
              <div className="col-span-1 md:w-28">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">Color</label>
                <input
                  type="text"
                  value={v.color}
                  onChange={(e) => updateVariantRow(idx, 'color', e.target.value)}
                  className="w-full border border-black p-1.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div className="col-span-1 md:w-24">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">Size</label>
                <select
                  value={v.size}
                  onChange={(e) => updateVariantRow(idx, 'size', e.target.value)}
                  className="w-full border border-black p-1.5 text-xs bg-white font-mono focus:outline-none"
                >
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="30">30</option>
                  <option value="32">32</option>
                  <option value="34">34</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1 md:flex-1 md:min-w-[140px]">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">SKU (Optional)</label>
                <input
                  type="text"
                  value={v.sku}
                  onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                  placeholder="AUTO-GENERATED"
                  className="w-full border border-black p-1.5 text-xs font-mono bg-white focus:outline-none"
                />
              </div>

              <div className="col-span-1 md:w-24">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">Stock Qty</label>
                <input
                  type="number"
                  min="0"
                  value={v.stock}
                  onChange={(e) => updateVariantRow(idx, 'stock', Number(e.target.value))}
                  className="w-full border border-black p-1.5 text-xs font-mono bg-white focus:outline-none"
                />
              </div>

              <div className="col-span-1 flex justify-end md:self-end">
                <button
                  type="button"
                  onClick={() => removeVariantRow(idx)}
                  className="p-2 text-neutral-500 hover:text-black hover:bg-neutral-200 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Photography & Upload Section */}
      <div className="border border-black bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-200 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-black" />
              <h2 className="text-sm font-black uppercase tracking-tight">Product Photography &amp; Gallery</h2>
            </div>
            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
              Upload photos directly from your device — no image URLs required.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowManualUrl(!showManualUrl)}
            className="inline-flex items-center gap-1.5 border border-neutral-400 px-3 py-1.5 text-xs font-mono uppercase font-bold hover:border-black hover:bg-neutral-100 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{showManualUrl ? 'Hide URL Input' : 'Or Paste Image URL'}</span>
          </button>
        </div>

        {/* Hidden Input for Single Image Replacement */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0] && replaceTargetIndex !== null) {
              handleReplaceFile(e.target.files[0], replaceTargetIndex)
              e.target.value = ''
            }
          }}
        />

        {/* Failure / Retry Banner */}
        {uploadError && failedFiles && (
          <div className="border border-red-500 bg-red-50 p-3.5 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const retryList = failedFiles
                setUploadError(null)
                setFailedFiles(null)
                handleFiles(retryList)
              }}
              className="px-3.5 py-1.5 bg-red-600 text-white font-bold uppercase hover:bg-red-700 transition-colors self-start sm:self-auto min-h-[36px]"
            >
              Retry Upload
            </button>
          </div>
        )}

        {/* Dropzone / Upload Area */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files)
              e.target.value = ''
            }
          }}
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploadingImages && fileInputRef.current?.click()}
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            dragOver
              ? 'border-black bg-neutral-100 scale-[0.99]'
              : 'border-neutral-300 bg-[#FAFAFA] hover:border-black hover:bg-neutral-50'
          }`}
        >
          {uploadingImages ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
              <span className="text-xs font-mono uppercase tracking-wider font-bold">
                {uploadProgressText || 'Uploading photo(s) to storage...'}
              </span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full border border-neutral-300 bg-white flex items-center justify-center shadow-sm">
                <Upload className="w-6 h-6 text-black" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider font-mono">
                  Click to choose photos or drag &amp; drop files here
                </p>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Supports JPG, PNG, WEBP, AVIF (up to 10MB each). Direct Supabase Storage uploads.
                </p>
              </div>
              <button
                type="button"
                className="mt-1 bg-black text-white px-4 py-2 text-xs uppercase font-mono font-bold hover:bg-neutral-800 transition-colors pointer-events-none"
              >
                Select Photos from Device
              </button>
            </>
          )}
        </div>

        {/* Optional Manual URL Accordion */}
        {showManualUrl && (
          <div className="p-4 bg-neutral-50 border border-neutral-300 space-y-2">
            <label className="block text-xs uppercase font-mono tracking-wider font-bold">
              Paste External Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddManualUrl()
                  }
                }}
                placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                className="flex-1 border border-black p-2 text-xs font-mono bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddManualUrl}
                className="bg-black text-white px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Add URL
              </button>
            </div>
          </div>
        )}

        {/* Photo Gallery Grid Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase font-bold text-neutral-600">
              Attached Photos ({imageUrls.filter(Boolean).length})
            </span>
            {imageUrls.filter(Boolean).length > 0 && (
              <span className="text-[10px] font-mono text-neutral-500">
                First photo is used as main catalog cover
              </span>
            )}
          </div>

          {imageUrls.filter(Boolean).length === 0 ? (
            <div className="border border-neutral-200 bg-neutral-50 p-6 text-center text-xs font-mono text-neutral-500">
              No photos added yet. Click &quot;Select Photos from Device&quot; above to upload product images.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imageUrls.filter(Boolean).map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="group relative border border-black bg-white flex flex-col overflow-hidden shadow-sm"
                >
                  {/* Image container */}
                  <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Product photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
                      }}
                    />

                    {/* Replacing Overlay */}
                    {replacingIndex === idx && (
                      <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white z-10 gap-1.5 p-2 text-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Replacing...</span>
                      </div>
                    )}

                    {/* Badge */}
                    <div className="absolute top-2 left-2">
                      {idx === 0 ? (
                        <span className="bg-black text-white text-[10px] font-mono font-bold px-2 py-0.5 tracking-wider">
                          COVER
                        </span>
                      ) : (
                        <span className="bg-white/90 text-black border border-black text-[10px] font-mono font-bold px-1.5 py-0.2">
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-2 bg-[#F8F8F6] border-t border-black flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => makePrimary(idx)}
                          title="Set as Primary Cover"
                          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-black cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerReplace(idx)}
                        disabled={replacingIndex !== null || uploadingImages}
                        title="Replace Photo with New Upload"
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-black cursor-pointer disabled:opacity-30"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${replacingIndex === idx ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveImage(idx, 'prev')}
                        title="Move Left"
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-black disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === imageUrls.filter(Boolean).length - 1}
                        onClick={() => moveImage(idx, 'next')}
                        title="Move Right"
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-700 hover:text-black disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      title="Remove Photo"
                      className="p-1 hover:bg-red-50 text-neutral-600 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
