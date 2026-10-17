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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { parseProductImage } from '@/lib/utils'
import { validateProductForLive, isProductTest } from '@/lib/product-mode'

interface ProductFormProps {
  categories: Array<{ id: string; name: string; slug: string }>
  collections?: Array<{ id: string; name: string; slug: string }>
  initialProduct?: any
}

export function ProductForm({ categories, collections = [], initialProduct }: ProductFormProps) {
  const router = useRouter()
  const isEdit = Boolean(initialProduct?.id)
  const [loading, setLoading] = useState(false)

  // Basic info
  const [name, setName] = useState(initialProduct?.name || '')
  const [slug, setSlug] = useState(initialProduct?.slug || '')
  const [description, setDescription] = useState(initialProduct?.description || '')
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || categories[0]?.id || '')
  const [collectionId, setCollectionId] = useState<string>(
    initialProduct?.collection_id || (initialProduct?.collection_ids && initialProduct.collection_ids[0]) || ''
  )
  const [material, setMaterial] = useState(initialProduct?.material || '')
  const [fit, setFit] = useState(initialProduct?.fit || '')
  const [washCare, setWashCare] = useState(initialProduct?.wash_care || '')
  const [mrp, setMrp] = useState<number | ''>(initialProduct?.mrp ?? '')
  const [sellingPrice, setSellingPrice] = useState<number | ''>(initialProduct?.selling_price ?? '')
  const [isPublished, setIsPublished] = useState(initialProduct?.is_published ?? true)
  const [productMode, setProductMode] = useState<'test' | 'live'>(() => {
    if (initialProduct) {
      return isProductTest(initialProduct) ? 'test' : 'live'
    }
    return 'test'
  })
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState(false)
  const [liveValidationErrors, setLiveValidationErrors] = useState<string[]>([])
  const [showValidationModal, setShowValidationModal] = useState(false)

  const [department, setDepartment] = useState<'men' | 'women' | 'unisex'>(() => {
    if (initialProduct?.department) {
      const d = initialProduct.department.toLowerCase().trim()
      if (d === 'men' || d === 'women' || d === 'unisex') return d
    }
    const tags = Array.isArray(initialProduct?.tags) ? initialProduct.tags.map((t: string) => t.toLowerCase()) : []
    if (tags.includes('men') && !tags.includes('women')) return 'men'
    if (tags.includes('women') && !tags.includes('men')) return 'women'
    return 'unisex'
  })

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
  interface AdminProductImage {
    id?: string
    image_url: string
    storage_path?: string | null
    color: string // '' for unassigned
    alt_text?: string
    sort_order?: number
    is_primary?: boolean
  }

  const [images, setImages] = useState<AdminProductImage[]>(() => {
    if (initialProduct?.images && initialProduct.images.length > 0) {
      return initialProduct.images
        .map((img: any, idx: number) => {
          const parsed = parseProductImage(img)
          return {
            id: typeof img === 'object' ? img.id : undefined,
            image_url: parsed?.image_url || (typeof img === 'string' ? img : img.image_url),
            storage_path: parsed?.storage_path || (typeof img === 'object' ? img.storage_path : null),
            color: parsed?.color || (typeof img === 'object' && img.color ? img.color.trim() : ''),
            alt_text: parsed?.alt_text || (typeof img === 'object' ? img.alt_text : ''),
            sort_order: typeof img === 'object' && typeof img.sort_order === 'number' ? img.sort_order : idx,
            is_primary: parsed?.is_primary || (typeof img === 'object' ? Boolean(img.is_primary) : false),
          }
        })
        .filter((img: AdminProductImage) => Boolean(img.image_url))
    }
    return []
  })
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('all')
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

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const isFootwearCat =
    selectedCategory?.slug === 'footwear' ||
    (selectedCategory?.name || '').toLowerCase().includes('footwear')
  const isAccessoriesCat =
    selectedCategory?.slug === 'accessories' ||
    (selectedCategory?.name || '').toLowerCase().includes('accessories')

  const categorySizes = isFootwearCat
    ? ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12']
    : isAccessoriesCat
    ? ['One Size', 'Standard']
    : ['XS', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36']

  const addVariantRow = () => {
    const defaultSize = isFootwearCat ? 'UK 8' : isAccessoriesCat ? 'One Size' : 'M'
    setVariants((prev) => [
      ...prev,
      { color: prev[0]?.color || '', size: defaultSize, sku: '', stock: 0 },
    ])
  }

  const handlePopulateStandardSizes = () => {
    const defaultColor = variants[0]?.color || 'Black'
    const newVariants = categorySizes.map((sz) => ({
      color: defaultColor,
      size: sz,
      sku: '',
      stock: 5,
    }))
    setVariants(newVariants)
    toast.success(`Generated ${categorySizes.length} standard ${isFootwearCat ? 'footwear' : 'clothing'} sizes!`)
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
      const newItems: AdminProductImage[] = []
      const defaultColor =
        selectedColorFilter !== 'all' && selectedColorFilter !== 'unassigned'
          ? selectedColorFilter
          : distinctColors[0] || ''

      for (let i = 0; i < fileArray.length; i++) {
        setUploadProgressText(`Uploading photo ${i + 1} of ${fileArray.length}...`)
        const uploadedUrl = await uploadSingleFile(fileArray[i])
        const hasExistingForColor =
          defaultColor &&
          images.some((img) => img.color?.trim().toLowerCase() === defaultColor.trim().toLowerCase())

        newItems.push({
          image_url: uploadedUrl,
          color: defaultColor,
          sort_order: images.length + i,
          is_primary: !hasExistingForColor && i === 0,
        })
      }

      if (newItems.length > 0) {
        setImages((prev) => [...prev, ...newItems])
        toast.success(`Uploaded ${newItems.length} photo(s) to storage!`, { id: toastId })
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
      setImages((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], image_url: newUrl }
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
    const defaultColor =
      selectedColorFilter !== 'all' && selectedColorFilter !== 'unassigned'
        ? selectedColorFilter
        : distinctColors[0] || ''

    setImages((prev) => [
      ...prev,
      {
        image_url: trimmed,
        color: defaultColor,
        sort_order: prev.length,
      },
    ])
    setManualUrlInput('')
    setShowManualUrl(false)
    toast.success('Image URL added')
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const updateImageColor = (index: number, newColor: string) => {
    setImages((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], color: newColor }
      return next
    })
  }

  const makePrimary = (index: number) => {
    setImages((prev) => {
      const target = prev[index]
      if (!target) return prev
      const targetColor = target.color ? target.color.trim().toLowerCase() : ''

      // 1. Mark target as is_primary = true, and all other photos with targetColor as is_primary = false
      const updated = prev.map((img, i) => {
        if (i === index) {
          return { ...img, is_primary: true }
        }
        const imgColor = img.color ? img.color.trim().toLowerCase() : ''
        if (targetColor && imgColor === targetColor) {
          return { ...img, is_primary: false }
        }
        return img
      })

      // 2. Reorder target to the front of its colour group so it is sort_order 0 for that colour
      const item = updated[index]
      const without = updated.filter((_, i) => i !== index)
      if (!targetColor) {
        return [item, ...without]
      }
      const firstIndexOfColor = without.findIndex(
        (img) => img.color?.trim().toLowerCase() === targetColor
      )
      if (firstIndexOfColor === -1) {
        return [item, ...without]
      }
      without.splice(firstIndexOfColor, 0, item)
      return without
    })
    toast.success('Set as primary cover photo!')
  }

  const moveImage = (index: number, direction: 'prev' | 'next') => {
    setImages((prev) => {
      // Find all indices matching the current filter
      const matchingIndices: number[] = []
      prev.forEach((img, i) => {
        if (selectedColorFilter === 'all') {
          matchingIndices.push(i)
        } else if (selectedColorFilter === 'unassigned') {
          if (!img.color || img.color.trim() === '') matchingIndices.push(i)
        } else {
          if (img.color?.trim().toLowerCase() === selectedColorFilter.toLowerCase()) {
            matchingIndices.push(i)
          }
        }
      })

      const posInFiltered = matchingIndices.indexOf(index)
      if (posInFiltered === -1) return prev

      const targetPosInFiltered = direction === 'prev' ? posInFiltered - 1 : posInFiltered + 1
      if (targetPosInFiltered < 0 || targetPosInFiltered >= matchingIndices.length) return prev

      const targetGlobalIdx = matchingIndices[targetPosInFiltered]
      const next = [...prev]
      const temp = next[index]
      next[index] = next[targetGlobalIdx]
      next[targetGlobalIdx] = temp
      return next
    })
  }

  const distinctColors = Array.from(
    new Set(variants.map((v) => v.color.trim()).filter(Boolean))
  )

  const handleSelectLiveMode = () => {
    const validImages = images.filter((img) => Boolean(img.image_url))
    const validation = validateProductForLive(
      {
        name,
        slug,
        description,
        selling_price: sellingPrice,
        mrp,
        category_id: categoryId,
        is_published: isPublished,
      },
      variants,
      validImages
    )

    if (!validation.valid) {
      setLiveValidationErrors(validation.errors)
      setShowValidationModal(true)
      return
    }

    if (productMode === 'test') {
      setShowLiveConfirmModal(true)
    } else {
      setProductMode('live')
    }
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

    const validImages = images.filter((img) => Boolean(img.image_url))
    const hasDiskPath = validImages.some(
      (img) => img.image_url && (img.image_url.includes('\\') || /^[a-zA-Z]:/.test(img.image_url))
    )
    if (hasDiskPath) {
      toast.error('Local disk paths cannot be viewed by browsers. Please use the Upload Photos button to upload directly from your computer!', { duration: 6000 })
      return
    }

    if (productMode === 'live') {
      const validation = validateProductForLive(
        {
          name,
          slug,
          description,
          selling_price: sellingPrice,
          mrp,
          category_id: categoryId,
          is_published: isPublished,
        },
        variants,
        validImages
      )
      if (!validation.valid) {
        setLiveValidationErrors(validation.errors)
        setShowValidationModal(true)
        return
      }
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
            collection_id: collectionId || null,
            collection_ids: collectionId ? [collectionId] : [],
            material,
            fit,
            wash_care: washCare,
            mrp: Number(mrp) || Number(sellingPrice),
            selling_price: Number(sellingPrice),
            is_published: isPublished,
            department,
            product_mode: productMode,
            is_test: productMode === 'test',
            tags: (() => {
              const existingTags: string[] = Array.isArray(initialProduct?.tags)
                ? initialProduct.tags.filter((t: string) => !['men', 'women', 'unisex', 'mode:test', 'mode:live', 'test-product', 'live-product'].includes(t.toLowerCase()))
                : []
              const modeTags = productMode === 'live' ? ['mode:live', 'live-product'] : ['mode:test', 'test-product']
              return [...existingTags, department, ...modeTags]
            })(),
          },
          variants,
          images: validImages.map((img, idx) => {
            const color = img.color ? img.color.trim() : null
            // Check if primary
            const isFirstOfColor = color
              ? validImages.findIndex((o) => o.color?.trim().toLowerCase() === color.toLowerCase()) === idx
              : idx === 0
            const isPrimary = Boolean(img.is_primary || isFirstOfColor)
            const cleanAlt = (img.alt_text || name)
              .replace(/\[color:[^\]]+\]/gi, '')
              .replace(/\[primary\]/gi, '')
              .trim()
            let altText = cleanAlt
            if (isPrimary) altText = `[primary] ${altText}`.trim()
            if (color) altText = `[color:${color}] ${altText}`.trim()

            return {
              id: img.id,
              image_url: img.image_url,
              storage_path: img.storage_path || null,
              color,
              alt_text: altText,
              sort_order: idx,
              is_primary: isPrimary,
            }
          }),
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

      {/* Product Mode Selection */}
      <div className="border-2 border-black bg-white p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-200">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider font-bold text-neutral-500 block">
              Catalog Classification
            </span>
            <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-2 mt-0.5">
              <span>Product Mode</span>
              <span
                className={`text-[10px] px-2.5 py-0.5 font-bold uppercase font-mono border ${
                  productMode === 'live'
                    ? 'bg-black text-white border-black'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {productMode === 'live' ? '● Live Storefront Mode' : '▲ Test / Demo Mode'}
              </span>
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            {productMode === 'live'
              ? 'Real customer purchasing & Google SEO enabled'
              : 'Safe sandbox testing & Google noindex active'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option: Test / Demo Mode */}
          <div
            onClick={() => setProductMode('test')}
            className={`p-4 border-2 cursor-pointer transition-all ${
              productMode === 'test'
                ? 'border-black bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'border-neutral-300 hover:border-black bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="product_mode_select"
                checked={productMode === 'test'}
                onChange={() => setProductMode('test')}
                className="mt-1 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="font-black text-xs uppercase tracking-wider block text-black">
                  Test / Demo Product (Default)
                </span>
                <p className="text-[11px] text-neutral-600 font-mono leading-relaxed">
                  Preserves product for layout, variant, image, wishlist, and cart testing.
                </p>
                <div className="pt-1.5 space-y-0.5 text-[10px] font-mono text-neutral-700">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <span>✓</span>
                    <span>Excluded from Google Index &amp; Sitemap</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-800">
                    <span>✓</span>
                    <span>Blocks real payments &amp; COD in production</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-800">
                    <span>✓</span>
                    <span>No misleading Product schema rich results</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Option: Live Product */}
          <div
            onClick={handleSelectLiveMode}
            className={`p-4 border-2 cursor-pointer transition-all ${
              productMode === 'live'
                ? 'border-black bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'border-neutral-300 hover:border-black bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="product_mode_select"
                checked={productMode === 'live'}
                onChange={handleSelectLiveMode}
                className="mt-1 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="font-black text-xs uppercase tracking-wider block text-black">
                  Live Product (Genuine Inventory)
                </span>
                <p className="text-[11px] text-neutral-600 font-mono leading-relaxed">
                  Published for genuine customer orders with verified physical stock.
                </p>
                <div className="pt-1.5 space-y-0.5 text-[10px] font-mono text-neutral-700">
                  <div className="flex items-center gap-1.5 text-black font-bold">
                    <span>✓</span>
                    <span>Included in public Sitemap &amp; Google SEO</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-black">
                    <span>✓</span>
                    <span>Real Cashfree payment &amp; COD enabled</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-black">
                    <span>✓</span>
                    <span>Emits Schema.org Product structured data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Department / Audience *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as 'men' | 'women' | 'unisex')}
              className="w-full border border-black p-2.5 text-xs bg-white font-bold focus:outline-none"
            >
              <option value="unisex">Unisex (Men &amp; Women)</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </select>
            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Controls Men &amp; Women storefront catalog routing</p>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Capsule Drop / Collection
            </label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
            >
              <option value="">None (Standard Catalog)</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-200">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">Variant Matrix (Color &amp; Sizing)</h2>
            <p className="text-[11px] text-neutral-500 font-mono">
              {isFootwearCat ? 'Configuring Footwear UK Sizes' : isAccessoriesCat ? 'Configuring Accessories' : 'Configuring Apparel Sizing'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePopulateStandardSizes}
              className="inline-flex items-center gap-1.5 border border-dashed border-neutral-400 px-3 py-1.5 text-xs font-mono uppercase font-bold hover:border-black hover:bg-neutral-100 transition-colors"
            >
              <span>+ Standard {isFootwearCat ? 'Shoe Sizes (UK 6–12)' : 'Sizes (XS–XXL)'}</span>
            </button>
            <button
              type="button"
              onClick={addVariantRow}
              className="inline-flex items-center gap-1.5 border border-black px-3 py-1.5 text-xs font-mono uppercase font-bold hover:bg-black hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </button>
          </div>
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

              <div className="col-span-1 md:w-28">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">
                  {isFootwearCat ? 'Shoe Size' : 'Size'}
                </label>
                <select
                  value={v.size}
                  onChange={(e) => updateVariantRow(idx, 'size', e.target.value)}
                  className="w-full border border-black p-1.5 text-xs bg-white font-mono focus:outline-none"
                >
                  {categorySizes.map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                  {!categorySizes.includes(v.size) && v.size && (
                    <option value={v.size}>{v.size}</option>
                  )}
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
                {selectedColorFilter !== 'all' && selectedColorFilter !== 'unassigned' && (
                  <div className="inline-block bg-black text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                    Direct Upload Target: {selectedColorFilter}
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-wider font-mono">
                  {selectedColorFilter !== 'all' && selectedColorFilter !== 'unassigned'
                    ? `Click to add photos for ${selectedColorFilter} or drag & drop`
                    : 'Click to choose photos or drag & drop files here'}
                </p>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Supports JPG, PNG, WEBP, AVIF (up to 10MB each). Direct Supabase Storage uploads.
                </p>
              </div>
              <button
                type="button"
                className="mt-1 bg-black text-white px-4 py-2 text-xs uppercase font-mono font-bold hover:bg-neutral-800 transition-colors pointer-events-none"
              >
                {selectedColorFilter !== 'all' && selectedColorFilter !== 'unassigned'
                  ? `Select Photos for ${selectedColorFilter}`
                  : 'Select Photos from Device'}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-mono uppercase font-bold text-neutral-800">
                Attached Photos ({images.length})
              </span>
              <p className="text-[10px] font-mono text-neutral-500">
                Assign each photo to a colour variant (e.g. Black, Gray) to sync with customer colour selection.
              </p>
            </div>
          </div>

          {/* Unmapped Images Warning Banner */}
          {images.some((img) => !img.color || img.color.trim() === '') && (
            <div className="mb-4 border border-amber-400 bg-amber-50 p-3.5 text-xs font-mono text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-wider">
                  {images.filter((img) => !img.color || img.color.trim() === '').length} photo(s) are unmapped!
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  These photos are not assigned to any colour. Use the &quot;Assigned Colour&quot; dropdown on each photo card below to link them to your variants so customer galleries synchronize correctly.
                </p>
              </div>
            </div>
          )}

          {/* Colour Filter Tabs */}
          {images.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-200 pb-3 mb-4 text-xs font-mono">
              <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1">View by colour:</span>
              <button
                type="button"
                onClick={() => setSelectedColorFilter('all')}
                className={`px-2.5 py-1 text-xs uppercase font-bold border transition-colors ${
                  selectedColorFilter === 'all'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
                }`}
              >
                All ({images.length})
              </button>
              {distinctColors.map((color) => {
                const count = images.filter((img) => img.color?.trim().toLowerCase() === color.toLowerCase()).length
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColorFilter(color)}
                    className={`px-2.5 py-1 text-xs uppercase font-bold border transition-colors ${
                      selectedColorFilter === color
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
                    }`}
                  >
                    {color} ({count})
                  </button>
                )
              })}
              {images.some((img) => !img.color || img.color.trim() === '') && (
                <button
                  type="button"
                  onClick={() => setSelectedColorFilter('unassigned')}
                  className={`px-2.5 py-1 text-xs uppercase font-bold border transition-colors ${
                    selectedColorFilter === 'unassigned'
                      ? 'bg-amber-500 text-black border-amber-600'
                      : 'bg-amber-100 text-amber-900 border-amber-300 hover:border-amber-500'
                  }`}
                >
                  ⚠️ Unmapped ({images.filter((img) => !img.color || img.color.trim() === '').length})
                </button>
              )}
            </div>
          )}

          {images.length === 0 ? (
            <div className="border border-neutral-200 bg-neutral-50 p-6 text-center text-xs font-mono text-neutral-500">
              No photos added yet. Click &quot;Select Photos from Device&quot; above to upload product images.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images
                .map((img, globalIdx) => ({ img, globalIdx }))
                .filter(({ img }) => {
                  if (selectedColorFilter === 'all') return true
                  if (selectedColorFilter === 'unassigned') return !img.color || img.color.trim() === ''
                  return img.color?.trim().toLowerCase() === selectedColorFilter.toLowerCase()
                })
                .map(({ img, globalIdx }, filterIdx, filteredArr) => {
                  const colorMatches = img.color
                    ? images.filter((other) => other.color?.trim().toLowerCase() === img.color.trim().toLowerCase())
                    : []
                  const anyExplicitColorPrimary = colorMatches.some((other) => other.is_primary)
                  const isColorPrimary = img.color
                    ? Boolean(img.is_primary || (!anyExplicitColorPrimary && colorMatches[0] === img))
                    : Boolean(img.is_primary || globalIdx === 0)

                  const isFirstInFilter = filterIdx === 0
                  const isLastInFilter = filterIdx === filteredArr.length - 1

                  return (
                    <div
                      key={`${img.image_url}-${globalIdx}`}
                      className={`group relative border bg-white flex flex-col overflow-hidden shadow-sm transition-all ${
                        isColorPrimary ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-black'
                      }`}
                    >
                      {/* Image container */}
                      <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.image_url}
                          alt={img.alt_text || `Product photo ${globalIdx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
                          }}
                        />

                        {/* Replacing Overlay */}
                        {replacingIndex === globalIdx && (
                          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white z-10 gap-1.5 p-2 text-center">
                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Replacing...</span>
                          </div>
                        )}

                        {/* Status Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[85%]">
                          {globalIdx === 0 && (
                            <span className="bg-black text-white text-[9px] font-mono font-black px-1.5 py-0.5 tracking-wider shadow-sm">
                              CATALOG COVER
                            </span>
                          )}
                          {isColorPrimary ? (
                            <span className="bg-emerald-600 text-white text-[9px] font-mono font-black px-1.5 py-0.5 tracking-wider shadow-sm flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              PRIMARY FOR {img.color ? img.color.toUpperCase() : 'CATALOG'}
                            </span>
                          ) : img.color ? (
                            <span className="bg-black/90 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 tracking-wider">
                              {img.color.toUpperCase()}
                            </span>
                          ) : (
                            <span className="bg-amber-500 text-black text-[9px] font-mono font-black px-1.5 py-0.5 tracking-wider shadow-sm">
                              ⚠️ UNMAPPED
                            </span>
                          )}
                        </div>

                        {/* Position in filtered gallery */}
                        <div className="absolute top-2 right-2 bg-black/75 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 tracking-wider">
                          {filterIdx + 1}/{filteredArr.length}
                        </div>
                      </div>

                      {/* Card Content & Assignment */}
                      <div className="p-2.5 bg-[#F8F8F6] border-t border-black space-y-2 flex-1 flex flex-col justify-between">
                        {/* Assigned Colour Dropdown */}
                        <div>
                          <label className="block text-[9px] uppercase font-mono font-bold text-neutral-500 mb-0.5">
                            Assigned Colour:
                          </label>
                          <select
                            value={img.color || ''}
                            onChange={(e) => updateImageColor(globalIdx, e.target.value)}
                            className={`w-full text-xs font-mono font-bold border p-1.5 focus:outline-none transition-colors ${
                              !img.color
                                ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                                : 'border-black bg-white text-black'
                            }`}
                          >
                            <option value="">⚠️ (Unmapped / General)</option>
                            {distinctColors.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Actions Bar */}
                        <div className="pt-2 border-t border-neutral-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => makePrimary(globalIdx)}
                              title={
                                img.color
                                  ? `Make primary cover photo for ${img.color}`
                                  : 'Make overall catalog cover'
                              }
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                                isColorPrimary
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'border border-neutral-300 bg-white hover:border-black text-neutral-700 hover:text-black'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${isColorPrimary ? 'fill-white' : ''}`} />
                              <span>{isColorPrimary ? 'Primary' : 'Set Primary'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerReplace(globalIdx)}
                              disabled={replacingIndex !== null || uploadingImages}
                              title="Replace photo with new file"
                              className="inline-flex items-center gap-1 px-2 py-1 border border-neutral-300 bg-white hover:border-black text-[10px] font-mono font-bold uppercase text-neutral-700 hover:text-black rounded transition-colors disabled:opacity-30 cursor-pointer"
                            >
                              <RefreshCw className={`w-3 h-3 ${replacingIndex === globalIdx ? 'animate-spin' : ''}`} />
                              <span>Replace</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isFirstInFilter}
                                onClick={() => moveImage(globalIdx, 'prev')}
                                title="Move Left / Earlier in Gallery"
                                className="p-1 border border-neutral-300 bg-white hover:border-black hover:bg-neutral-100 rounded text-neutral-700 hover:text-black disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLastInFilter}
                                onClick={() => moveImage(globalIdx, 'next')}
                                title="Move Right / Later in Gallery"
                                className="p-1 border border-neutral-300 bg-white hover:border-black hover:bg-neutral-100 rounded text-neutral-700 hover:text-black disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeImage(globalIdx)}
                              title="Remove Photo"
                              className="p-1 hover:bg-red-50 text-neutral-500 hover:text-red-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* Live Mode Confirmation Dialog */}
      {showLiveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">Confirm Live Mode Conversion</h3>
                <p className="text-xs text-neutral-600 font-mono mt-1">
                  You are preparing to publish <strong className="text-black">"{name || 'This Product'}"</strong> in <span className="font-bold text-black uppercase">Live Mode</span>.
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-300 p-4 space-y-2 text-xs font-mono text-neutral-700">
              <div className="font-bold uppercase text-black text-[11px] mb-1">Live Mode Checklist Verified:</div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Selling Price: ₹{Number(sellingPrice).toLocaleString('en-IN')} (verified)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Physical Inventory: {variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)} units declared</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Photographs: {images.filter((img) => Boolean(img.image_url)).length} product images uploaded</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Search Engine: Google Indexing &amp; Sitemap will be activated upon save</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 font-mono leading-relaxed">
              Once saved, real customers can place genuine orders with Cashfree payment and COD fulfillment.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowLiveConfirmModal(false)}
                className="px-4 py-2 border border-black text-xs font-mono uppercase font-bold hover:bg-neutral-100 min-h-[40px] cursor-pointer"
              >
                Keep In Test Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductMode('live')
                  setShowLiveConfirmModal(false)
                  toast.success('Product mode set to LIVE!')
                }}
                className="bg-black text-white px-5 py-2 text-xs font-mono uppercase font-bold hover:bg-neutral-800 min-h-[40px] cursor-pointer flex items-center gap-2"
              >
                <span>Confirm Live Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Mode Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-900" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">Live Mode Requirements Missing</h3>
                <p className="text-xs text-neutral-600 font-mono mt-0.5">
                  The following requirements must be resolved before converting to Live mode:
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 space-y-2 text-xs font-mono text-red-900">
              {liveValidationErrors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold text-red-700">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-neutral-500 font-mono">
              You can keep this product in <strong className="text-black">Test / Demo Mode</strong> to test images, layout, and variants without completing these requirements.
            </p>

            <div className="flex items-center justify-end pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowValidationModal(false)}
                className="bg-black text-white px-5 py-2 text-xs font-mono uppercase font-bold hover:bg-neutral-800 min-h-[40px] cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
