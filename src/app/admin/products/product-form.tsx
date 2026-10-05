'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

interface ProductFormProps {
  categories: Array<{ id: string; name: string; slug: string }>
}

export function ProductForm({ categories }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Basic info
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [material, setMaterial] = useState('100% Combed Cotton, 240 GSM')
  const [fit, setFit] = useState('Boxy Oversized Cut')
  const [washCare, setWashCare] = useState('Machine wash cold inside-out, do not iron directly on graphics')
  const [mrp, setMrp] = useState(2499)
  const [sellingPrice, setSellingPrice] = useState(1499)
  const [isPublished, setIsPublished] = useState(true)

  // Variants matrix
  const [variants, setVariants] = useState<Array<{ color: string; size: string; sku: string; stock: number }>>([
    { color: 'Black', size: 'S', sku: '', stock: 20 },
    { color: 'Black', size: 'M', sku: '', stock: 25 },
    { color: 'Black', size: 'L', sku: '', stock: 25 },
    { color: 'Black', size: 'XL', sku: '', stock: 15 },
  ])

  // Images
  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
  ])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
    }
  }

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { color: 'Black', size: 'M', sku: '', stock: 10 },
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

  const addImageRow = () => {
    setImageUrls((prev) => [...prev, ''])
  }

  const updateImageRow = (index: number, val: string) => {
    setImageUrls((prev) => {
      const next = [...prev]
      next[index] = val
      return next
    })
  }

  const removeImageRow = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug || !sellingPrice) {
      toast.error('Name, slug, and selling price are required')
      return
    }

    if (variants.length === 0) {
      toast.error('Add at least one size/color variant')
      return
    }

    const hasDiskPath = imageUrls.some((img) => img && (img.includes('\\') || /^[a-zA-Z]:/.test(img)))
    if (hasDiskPath) {
      toast.error('Local disk paths (e.g. C:\\...) cannot be viewed by browsers. Please use web URLs (https://...) or store images in /images/products/...', { duration: 6000 })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name,
            slug,
            description,
            category_id: categoryId || null,
            material,
            fit,
            wash_care: washCare,
            mrp: Number(mrp),
            selling_price: Number(sellingPrice),
            is_published: isPublished,
          },
          variants,
          images: imageUrls.filter(Boolean),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save product')

      toast.success('Product and variants created successfully!')
      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-black">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
        >
          {loading ? 'Saving...' : 'Publish Product'}
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
            <div key={idx} className="flex flex-wrap items-center gap-3 p-3 bg-[#F8F8F6] border border-neutral-300">
              <div className="w-28">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">Color</label>
                <input
                  type="text"
                  value={v.color}
                  onChange={(e) => updateVariantRow(idx, 'color', e.target.value)}
                  className="w-full border border-black p-1.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div className="w-24">
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

              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">SKU (Optional)</label>
                <input
                  type="text"
                  value={v.sku}
                  onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                  placeholder="AUTO-GENERATED"
                  className="w-full border border-black p-1.5 text-xs font-mono bg-white focus:outline-none"
                />
              </div>

              <div className="w-24">
                <label className="block text-[10px] uppercase font-mono text-neutral-500">Stock Qty</label>
                <input
                  type="number"
                  min="0"
                  value={v.stock}
                  onChange={(e) => updateVariantRow(idx, 'stock', Number(e.target.value))}
                  className="w-full border border-black p-1.5 text-xs font-mono bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => removeVariantRow(idx)}
                className="self-end p-2 text-neutral-500 hover:text-black hover:bg-neutral-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Image Gallery URLs */}
      <div className="border border-black bg-white p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">Product Photography URLs</h2>
            <p className="text-[11px] text-neutral-500 font-mono">Cloudinary or hosted product image URLs</p>
          </div>
          <button
            type="button"
            onClick={addImageRow}
            className="inline-flex items-center gap-1.5 border border-black px-3 py-1.5 text-xs font-mono uppercase font-bold hover:bg-black hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Image URL</span>
          </button>
        </div>

        <div className="space-y-2">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs font-mono text-neutral-500 w-6">#{idx + 1}</span>
              <input
                type="url"
                value={url}
                onChange={(e) => updateImageRow(idx, e.target.value)}
                placeholder="https://res.cloudinary.com/... or https://images.unsplash.com/..."
                className="flex-1 border border-black p-2 text-xs font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeImageRow(idx)}
                className="p-2 text-neutral-500 hover:text-black"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </form>
  )
}
