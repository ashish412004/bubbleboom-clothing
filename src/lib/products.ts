import { createClient as createServerClient, createServiceClient, createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { generateSlug, parseProductImage } from './utils'
import { MOCK_PRODUCTS } from './mock-data'
import { cache } from 'react'
import fs from 'fs'
import path from 'path'

const productsCache = new Map<string, { data: any[]; timestamp: number }>()
const productSlugCache = new Map<string, { data: any; timestamp: number }>()
const relatedProductsCache = new Map<string, { data: any[]; timestamp: number }>()
const categoryLookupCache = new Map<string, { id: string | null; isTagFallback?: boolean; timestamp: number }>()
const collectionLookupCache = new Map<string, { id: string | null; productIds?: string[]; timestamp: number }>()
const PRODUCTS_TTL_MS = 60 * 1000
const LOOKUP_TTL_MS = 5 * 60 * 1000

export function clearProductCache() {
  productsCache.clear()
  productSlugCache.clear()
  relatedProductsCache.clear()
  categoryLookupCache.clear()
  collectionLookupCache.clear()
}

export function getDeletedProductIds(): Set<string> {
  try {
    const file = path.join(process.cwd(), '.next', 'bb_deleted_products.json')
    if (fs.existsSync(file)) {
      const arr = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return new Set(arr)
    }
  } catch {}
  return new Set()
}

export function saveDeletedProductId(id: string) {
  try {
    const dir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'bb_deleted_products.json')
    let current: string[] = []
    if (fs.existsSync(file)) {
      try {
        current = JSON.parse(fs.readFileSync(file, 'utf-8'))
      } catch {}
    }
    if (!current.includes(id)) {
      current.push(id)
      fs.writeFileSync(file, JSON.stringify(current, null, 2), 'utf-8')
    }
  } catch {}
}

export function getDevProducts(): any[] {
  try {
    const file = path.join(process.cwd(), '.next', 'bb_dev_products.json')
    if (fs.existsSync(file)) {
      const arr = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return arr
    }
  } catch {}
  return []
}

export function saveDevProduct(prod: any) {
  try {
    const dir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'bb_dev_products.json')
    let current: any[] = []
    if (fs.existsSync(file)) {
      try {
        current = JSON.parse(fs.readFileSync(file, 'utf-8'))
      } catch {}
    }
    const normalized = {
      ...prod,
      slug:
        prod.slug ||
        (prod.name
          ? prod.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          : prod.id),
      is_published: prod.is_published ?? true,
      is_active: prod.is_active ?? true,
      images: Array.isArray(prod.images) ? prod.images : [],
      variants: Array.isArray(prod.variants) ? prod.variants : [],
    }
    current = [normalized, ...current.filter((p: any) => p.id !== normalized.id && p.slug !== normalized.slug)]
    fs.writeFileSync(file, JSON.stringify(current, null, 2), 'utf-8')
  } catch {}
}

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type ProductVariant = Database['public']['Tables']['product_variants']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']

export interface ProductFilterOptions {
  category?: string
  collection?: string
  search?: string
  size?: string
  color?: string
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
  saleOnly?: boolean
  sortBy?: 'created_at' | 'selling_price' | 'name' | 'best_selling'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

function filterMockProducts(filters?: ProductFilterOptions) {
  const deletedIds = getDeletedProductIds()
  const devProducts = getDevProducts()
  let result = [...devProducts, ...MOCK_PRODUCTS]
    .filter((p) => !deletedIds.has(p.id) && !deletedIds.has(p.slug))
    .map((p) => ({
      ...p,
      images: (((p as any).images || []) as any[])
        .map(parseProductImage)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      variants: (p as any).variants || [],
    }))

  if (filters?.category) {
    const cat = filters.category.toLowerCase()
    result = result.filter(
      (p) =>
        p.category_id === filters.category ||
        p.category?.slug === cat ||
        p.tags?.some((t: string) => t.toLowerCase() === cat)
    )
  }

  if (filters?.collection) {
    const col = filters.collection.toLowerCase()
    if (col === 'monochrome-originals') {
      result = result.filter((p) =>
        ['p1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000006'].includes(p.id)
      )
    } else if (col === 'urban-essentials') {
      result = result.filter((p) =>
        ['p1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000005'].includes(p.id)
      )
    }
  }

  if (filters?.search) {
    const term = filters.search.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(term))
    )
  }

  if (filters?.minPrice !== undefined) {
    result = result.filter((p) => p.selling_price >= filters.minPrice!)
  }
  if (filters?.maxPrice !== undefined) {
    result = result.filter((p) => p.selling_price <= filters.maxPrice!)
  }

  if (filters?.size) {
    const requestedSize = filters.size.toLowerCase()
    result = result.filter((p) =>
      p.variants?.some(
        (v: any) => v.is_active && v.size.toLowerCase() === requestedSize && v.stock > 0
      )
    )
  }

  if (filters?.color) {
    const requestedColor = filters.color.toLowerCase()
    result = result.filter((p) =>
      p.variants?.some(
        (v: any) => v.is_active && v.color.toLowerCase().includes(requestedColor)
      )
    )
  }

  if (filters?.inStockOnly) {
    result = result.filter((p) =>
      p.variants?.some((v: any) => v.is_active && v.stock > 0)
    )
  }

  if (filters?.saleOnly) {
    result = result.filter((p) => p.mrp > p.selling_price)
  }

  if (filters?.sortBy === 'selling_price') {
    result.sort((a, b) =>
      filters.sortOrder === 'asc' ? a.selling_price - b.selling_price : b.selling_price - a.selling_price
    )
  } else if (filters?.sortBy === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (filters?.limit) {
    result = result.slice(0, filters.limit)
  }

  return result
}

export async function getProducts(filters?: ProductFilterOptions) {
  const cacheKey = JSON.stringify(filters || {})
  const cached = productsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < PRODUCTS_TTL_MS) {
    const deletedIds = getDeletedProductIds()
    return cached.data.filter((p) => !deletedIds.has(p.id) && !deletedIds.has(p.slug))
  }

  if (!isSupabaseConfigured()) {
    const mock = filterMockProducts(filters)
    productsCache.set(cacheKey, { data: mock, timestamp: Date.now() })
    return mock
  }

  try {
    const supabase = createPublicClient()

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        mrp,
        selling_price,
        category_id,
        tags,
        is_published,
        is_active,
        created_at,
        updated_at,
        category:categories(id, name, slug),
        images:product_images(id, product_id, image_url, alt_text, sort_order, storage_path),
        variants:product_variants(id, product_id, sku, color, size, stock, is_active)
      `)
      .eq('is_published', true)
      .eq('is_active', true)

    // 1. Category filter (handles both slug and UUID, case-insensitive, with in-memory lookup cache)
    if (filters?.category) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        filters.category
      )
      if (isUuid) {
        query = query.eq('category_id', filters.category)
      } else {
        const catTarget = filters.category.toLowerCase().trim()
        const cachedLookup = categoryLookupCache.get(catTarget)
        if (cachedLookup && Date.now() - cachedLookup.timestamp < LOOKUP_TTL_MS) {
          if (cachedLookup.id) {
            query = query.eq('category_id', cachedLookup.id)
          } else if (cachedLookup.isTagFallback) {
            query = query.contains('tags', [catTarget])
          }
        } else {
          // Find category by slug (case-insensitive) or name
          const { data: catBySlug } = await supabase
            .from('categories')
            .select('id')
            .ilike('slug', catTarget)
            .maybeSingle()

          if (catBySlug) {
            categoryLookupCache.set(catTarget, { id: catBySlug.id, timestamp: Date.now() })
            query = query.eq('category_id', catBySlug.id)
          } else {
            const { data: catByName } = await supabase
              .from('categories')
              .select('id')
              .ilike('name', catTarget)
              .maybeSingle()

            if (catByName) {
              categoryLookupCache.set(catTarget, { id: catByName.id, timestamp: Date.now() })
              query = query.eq('category_id', catByName.id)
            } else {
              // Tag based fallback (e.g. 'men', 'women')
              categoryLookupCache.set(catTarget, { id: null, isTagFallback: true, timestamp: Date.now() })
              query = query.contains('tags', [catTarget])
            }
          }
        }
      }
    }

    // 2. Collection filter (with in-memory lookup cache)
    if (filters?.collection) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        filters.collection
      )
      const colTarget = filters.collection.toLowerCase().trim()
      const cachedCol = collectionLookupCache.get(colTarget)
      let productIds: string[] = []

      if (cachedCol && Date.now() - cachedCol.timestamp < LOOKUP_TTL_MS && cachedCol.productIds) {
        productIds = cachedCol.productIds
      } else {
        let collectionId = filters.collection
        if (!isUuid) {
          const { data: col } = await supabase
            .from('collections')
            .select('id')
            .eq('slug', filters.collection)
            .maybeSingle()
          if (col) collectionId = col.id
        }

        const { data: colProducts } = await supabase
          .from('collection_products')
          .select('product_id')
          .eq('collection_id', collectionId)

        productIds = colProducts?.map((cp) => cp.product_id) || []
        collectionLookupCache.set(colTarget, { id: collectionId, productIds, timestamp: Date.now() })
      }

      if (productIds.length > 0) {
        query = query.in('id', productIds)
      } else {
        return []
      }
    }

    // 3. Search query
    if (filters?.search) {
      const term = filters.search.trim()
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    }

    // 4. Price range
    if (filters?.minPrice !== undefined) {
      query = query.gte('selling_price', filters.minPrice)
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte('selling_price', filters.maxPrice)
    }

    // 5. Sorting
    const sortBy = filters?.sortBy === 'best_selling' ? 'created_at' : filters?.sortBy || 'created_at'
    const sortOrder = filters?.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) {
      console.error('getProducts Supabase query error:', error)
      return filterMockProducts(filters)
    }

    if (!data || data.length === 0) {
      const mock = filterMockProducts(filters)
      if (mock.length > 0) return mock
      productsCache.set(cacheKey, { data: [], timestamp: Date.now() })
      return []
    }

    const deletedIds = getDeletedProductIds()
    const parsedData = (data as any[])
      .filter((p) => !deletedIds.has(p.id) && !deletedIds.has(p.slug))
      .map((p) => {
        const parsedImages = (((p as any).images || []) as any[])
          .map(parseProductImage)
          .filter(Boolean)
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        return {
          ...p,
          images: parsedImages,
          variants: (p as any).variants || [],
        }
      })

    let result = parsedData

    // In-memory variant-level filters for size, color, stock, and sale
    if (filters?.size) {
      const requestedSize = filters.size.toLowerCase()
      result = result.filter((p) =>
        p.variants?.some(
          (v: any) => v.is_active && v.size.toLowerCase() === requestedSize && v.stock > 0
        )
      )
    }

    if (filters?.color) {
      const requestedColor = filters.color.toLowerCase()
      result = result.filter((p) =>
        p.variants?.some(
          (v: any) => v.is_active && v.color.toLowerCase().includes(requestedColor)
        )
      )
    }

    if (filters?.inStockOnly) {
      result = result.filter((p) =>
        p.variants?.some((v: any) => v.is_active && v.stock > 0)
      )
    }

    if (filters?.saleOnly) {
      result = result.filter((p) => p.mrp > p.selling_price)
    }

    productsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (err) {
    console.error('getProducts error:', err)
    return filterMockProducts(filters)
  }
}

export const getProductBySlug = cache(async function (slug: string) {
  const deletedIds = getDeletedProductIds()
  if (deletedIds.has(slug)) return null

  const cached = productSlugCache.get(slug)
  if (cached && Date.now() - cached.timestamp < PRODUCTS_TTL_MS) {
    if (!deletedIds.has(cached.data?.id)) return cached.data
  }

  if (!isSupabaseConfigured()) {
    const mock = MOCK_PRODUCTS.find((p) => p.slug === slug && !deletedIds.has(p.id)) || null
    if (mock) productSlugCache.set(slug, { data: mock, timestamp: Date.now() })
    return mock
  }

  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        mrp,
        selling_price,
        category_id,
        tags,
        is_published,
        is_active,
        created_at,
        updated_at,
        category:categories(id, name, slug),
        images:product_images(id, product_id, image_url, alt_text, sort_order, storage_path),
        variants:product_variants(id, product_id, sku, color, size, stock, is_active)
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data || deletedIds.has(data.id)) {
      const mock = MOCK_PRODUCTS.find((p) => p.slug === slug && !deletedIds.has(p.id)) || null
      return mock
    }

    const parsedImages = (((data as any).images || []) as any[])
      .map(parseProductImage)
      .filter(Boolean)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const result = {
      ...data,
      images: parsedImages,
    }

    productSlugCache.set(slug, { data: result, timestamp: Date.now() })
    return result
  } catch {
    return MOCK_PRODUCTS.find((p) => p.slug === slug && !deletedIds.has(p.id)) || null
  }
})

export async function getProductById(id: string) {
  const deletedIds = getDeletedProductIds()
  if (deletedIds.has(id)) return null

  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.find((p) => p.id === id && !deletedIds.has(p.slug)) || null
  }

  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        mrp,
        selling_price,
        category_id,
        tags,
        is_published,
        is_active,
        created_at,
        updated_at,
        category:categories(id, name, slug),
        images:product_images(id, product_id, image_url, alt_text, sort_order, storage_path),
        variants:product_variants(id, product_id, sku, color, size, stock, is_active)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error || !data || deletedIds.has(data.id) || deletedIds.has(data.slug)) {
      return MOCK_PRODUCTS.find((p) => p.id === id && !deletedIds.has(p.slug)) || null
    }

    const parsedImages = (((data as any).images || []) as any[])
      .map(parseProductImage)
      .filter(Boolean)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    return {
      ...data,
      images: parsedImages,
    }
  } catch {
    return MOCK_PRODUCTS.find((p) => p.id === id && !deletedIds.has(p.slug)) || null
  }
}

export async function getAdminProducts() {
  const deletedIds = getDeletedProductIds()
  const devProducts = getDevProducts()
  let list = [...devProducts, ...MOCK_PRODUCTS].filter((p) => !deletedIds.has(p.id) && !deletedIds.has(p.slug))

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: products } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          variants:product_variants(*),
          images:product_images(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (products && products.length > 0) {
        list = products
          .filter((p) => !deletedIds.has(p.id) && !deletedIds.has(p.slug))
          .map((p) => ({
            ...p,
            images: (((p as any).images || []) as any[]).map(parseProductImage).filter(Boolean),
          }))
      }
    } catch {
      // Fallback
    }
  }
  return list
}

export async function getRelatedProducts(productId: string, categoryId?: string, limit: number = 4) {
  const cacheKey = `${productId}_${categoryId || ''}_${limit}`
  const cached = relatedProductsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < PRODUCTS_TTL_MS) {
    return cached.data
  }

  if (!isSupabaseConfigured()) {
    const mock = MOCK_PRODUCTS.filter((p) => p.id !== productId).slice(0, limit)
    relatedProductsCache.set(cacheKey, { data: mock, timestamp: Date.now() })
    return mock
  }

  try {
    const supabase = createPublicClient()

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        mrp,
        selling_price,
        category_id,
        tags,
        is_published,
        is_active,
        created_at,
        updated_at,
        category:categories(id, name, slug),
        images:product_images(id, product_id, image_url, alt_text, sort_order, storage_path),
        variants:product_variants(id, product_id, sku, color, size, stock, is_active)
      `)
      .eq('is_published', true)
      .eq('is_active', true)
      .neq('id', productId)
      .limit(limit)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data } = await query
    const parsedData = ((data || []) as any[]).map((product) => ({
      ...product,
      images: (((product as any).images || []) as any[])
        .map(parseProductImage)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
    const result = (parsedData.length > 0) ? parsedData : MOCK_PRODUCTS.filter((p) => p.id !== productId).slice(0, limit)
    relatedProductsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch {
    return MOCK_PRODUCTS.filter((p) => p.id !== productId).slice(0, limit)
  }
}

// Admin product functions
export async function createProduct(product: ProductInsert) {
  clearProductCache()
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateProduct(id: string, product: ProductUpdate) {
  clearProductCache()
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .update({ ...product, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function createProductVariant(variant: Database['public']['Tables']['product_variants']['Insert']) {
  clearProductCache()
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('product_variants')
    .insert(variant)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateProductVariant(
  id: string,
  variant: Database['public']['Tables']['product_variants']['Update']
) {
  clearProductCache()
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('product_variants')
    .update({ ...variant, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function addProductImage(image: Database['public']['Tables']['product_images']['Insert']) {
  clearProductCache()
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('product_images')
    .insert(image)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  clearProductCache()
  saveDeletedProductId(id)

  try {
    const file = path.join(process.cwd(), '.next', 'bb_dev_products.json')
    if (fs.existsSync(file)) {
      const arr = JSON.parse(fs.readFileSync(file, 'utf-8'))
      const filtered = arr.filter((p: any) => p.id !== id && p.slug !== id)
      fs.writeFileSync(file, JSON.stringify(filtered, null, 2), 'utf-8')
    }
  } catch {}

  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id || p.slug === id)
  if (idx >= 0) {
    saveDeletedProductId(MOCK_PRODUCTS[idx].id)
    saveDeletedProductId(MOCK_PRODUCTS[idx].slug)
    MOCK_PRODUCTS.splice(idx, 1)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()

      // Resolve target UUID if passed as a slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      let targetId = id
      if (!isUuid) {
        const { data: found } = await supabase
          .from('products')
          .select('id, slug')
          .eq('slug', id)
          .maybeSingle()
        if (found) {
          targetId = found.id
          saveDeletedProductId(found.slug)
          saveDeletedProductId(found.id)
        }
      }

      // 1. Check if product or its variants are referenced in order_items
      const { data: orderItemRefs } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', targetId)
        .limit(1)

      const hasOrderHistory = Boolean(orderItemRefs && orderItemRefs.length > 0)

      if (hasOrderHistory) {
        // Soft delete / Archive:
        // Set is_active = false and is_published = false so it's hidden from catalog & storefront
        await supabase
          .from('products')
          .update({
            is_active: false,
            is_published: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetId)

        // Deactivate all its variants and zero out stock
        await supabase
          .from('product_variants')
          .update({
            is_active: false,
            stock: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', targetId)

        // Unlink from collections
        await supabase.from('collection_products').delete().eq('product_id', targetId)
      } else {
        // No orders exist: clean hard-delete
        await supabase.from('collection_products').delete().eq('product_id', targetId)
        try {
          await supabase.from('reviews').delete().eq('product_id', targetId)
        } catch {}
        await supabase.from('product_images').delete().eq('product_id', targetId)
        await supabase.from('product_variants').delete().eq('product_id', targetId)
        const { error } = await supabase.from('products').delete().eq('id', targetId)
        if (error) {
          console.warn('Hard delete failed, falling back to soft-delete:', error.message)
          await supabase
            .from('products')
            .update({ is_active: false, is_published: false })
            .eq('id', targetId)
          await supabase
            .from('product_variants')
            .update({ is_active: false, stock: 0 })
            .eq('product_id', targetId)
        }
      }
    } catch (err: any) {
      console.error('Error deleting product from DB:', err)
      // Fallback: ensure product is deactivated
      try {
        const supabase = await createServiceClient()
        await supabase
          .from('products')
          .update({ is_active: false, is_published: false })
          .eq('id', id)
      } catch {}
    }
  }

  return { success: true }
}

export async function deleteProductVariant(id: string) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: orderItemRefs } = await supabase
        .from('order_items')
        .select('id')
        .eq('variant_id', id)
        .limit(1)

      if (orderItemRefs && orderItemRefs.length > 0) {
        await supabase.from('product_variants').update({ is_active: false, stock: 0 }).eq('id', id)
      } else {
        const { error } = await supabase.from('product_variants').delete().eq('id', id)
        if (error) {
          await supabase.from('product_variants').update({ is_active: false, stock: 0 }).eq('id', id)
        }
      }
    } catch (err: any) {
      return { error: err.message }
    }
  }
  return { success: true }
}

export async function deleteProductImage(id: string) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { error } = await supabase.from('product_images').delete().eq('id', id)
      if (error) return { error: error.message }
    } catch (err: any) {
      return { error: err.message }
    }
  }
  return { success: true }
}
