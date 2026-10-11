import { createClient as createServerClient, createServiceClient, createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { generateSlug } from './utils'
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from './mock-data'
import { getDevProducts } from './products'
import fs from 'fs'
import path from 'path'

let categoriesCache: { data: any[]; timestamp: number } | null = null
let coversCache: { key: string; data: CategoryWithCover[]; timestamp: number } | null = null
const CATEGORIES_TTL_MS = 60 * 1000

export function clearCategoriesCache() {
  categoriesCache = null
  coversCache = null
}

export const DEFAULT_FEATURED_CATEGORY_SLUGS: Record<string, number> = {
  't-shirts': 1,
  'hoodies': 2,
  'footwear': 3,
  'shirts': 4,
  'jeans': 5,
  'cargos': 6,
  'sweatshirts': 7,
  'joggers': 8,
}

export function getDeletedCategoryIds(): Set<string> {
  try {
    const file = path.join(process.cwd(), '.next', 'bb_deleted_categories.json')
    if (fs.existsSync(file)) {
      const arr = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return new Set(arr)
    }
  } catch {}
  return new Set()
}

export function saveDeletedCategoryId(id: string) {
  try {
    const dir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'bb_deleted_categories.json')
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

export interface CategoryMeta {
  image_url?: string | null
  featured_product_id?: string | null
  auto_image?: boolean
  show_on_homepage?: boolean
  homepage_order?: number
  sort_order?: number
  is_active?: boolean
}

export function getCategoryMetaStore(): Record<string, CategoryMeta> {
  try {
    const file = path.join(process.cwd(), '.next', 'bb_category_meta.json')
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    }
  } catch {}
  return {}
}

export function saveCategoryMeta(idOrSlug: string, meta: CategoryMeta) {
  try {
    const dir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'bb_category_meta.json')
    const store = getCategoryMetaStore()
    store[idOrSlug] = { ...store[idOrSlug], ...meta }
    fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8')
  } catch {}
}

export type Category = Database['public']['Tables']['categories']['Row']

export interface CategoryWithCover extends Category {
  cover_image: string | null
  image_source: 'custom' | 'featured_product' | 'auto_product' | 'fallback'
  featured_product_name?: string | null
  product_count?: number
}

function applyCategoryDefaultsAndMeta(cat: any, metaStore: Record<string, CategoryMeta>): Category {
  const meta = metaStore[cat.id] || metaStore[cat.slug] || {}
  const isDefaultFeatured = cat.slug in DEFAULT_FEATURED_CATEGORY_SLUGS
  const defaultHomepageOrder = DEFAULT_FEATURED_CATEGORY_SLUGS[cat.slug] ?? 99

  return {
    ...cat,
    image_url: meta.image_url !== undefined ? meta.image_url : (cat.image_url ?? null),
    featured_product_id: meta.featured_product_id !== undefined ? meta.featured_product_id : (cat.featured_product_id ?? null),
    auto_image: meta.auto_image !== undefined ? meta.auto_image : (cat.auto_image ?? true),
    show_on_homepage: meta.show_on_homepage !== undefined ? meta.show_on_homepage : (cat.show_on_homepage ?? isDefaultFeatured),
    homepage_order: meta.homepage_order !== undefined ? meta.homepage_order : (cat.homepage_order ?? defaultHomepageOrder),
    sort_order: meta.sort_order !== undefined ? meta.sort_order : (cat.sort_order ?? 0),
    is_active: meta.is_active !== undefined ? meta.is_active : (cat.is_active ?? true),
  }
}

export async function getCategories(includeHidden: boolean = false): Promise<Category[]> {
  const deletedIds = getDeletedCategoryIds()
  const metaStore = getCategoryMetaStore()

  if (!includeHidden && categoriesCache && Date.now() - categoriesCache.timestamp < CATEGORIES_TTL_MS) {
    return categoriesCache.data.filter((c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))
  }

  let list = MOCK_CATEGORIES.map((c) => applyCategoryDefaultsAndMeta(c, metaStore)).filter(
    (c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug)
  )

  if (!includeHidden) {
    list = list.filter((c) => c.is_active)
  }

  if (!isSupabaseConfigured()) {
    if (!includeHidden) {
      categoriesCache = { data: list, timestamp: Date.now() }
    }
    return list.sort((a, b) => a.sort_order - b.sort_order)
  }

  try {
    const supabase = createPublicClient()

    // Query categories from Supabase with safe column selection
    let query = supabase.from('categories').select('*').order('sort_order')

    if (!includeHidden) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      if (!includeHidden) {
        categoriesCache = { data: list, timestamp: Date.now() }
      }
      return list.sort((a, b) => a.sort_order - b.sort_order)
    }

    const merged = data
      .filter((c: any) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))
      .map((c: any) => applyCategoryDefaultsAndMeta(c, metaStore))

    const finalList = includeHidden ? merged : merged.filter((c: any) => c.is_active)

    if (!includeHidden) {
      categoriesCache = { data: finalList, timestamp: Date.now() }
    }

    return finalList.sort((a, b) => a.sort_order - b.sort_order)
  } catch {
    return list.sort((a, b) => a.sort_order - b.sort_order)
  }
}

export async function getFeaturedCategories(limit: number = 8): Promise<Category[]> {
  const categories = await getCategories(false)
  const featured = categories
    .filter((c) => c.show_on_homepage)
    .sort((a, b) => {
      const orderA = a.homepage_order ?? 99
      const orderB = b.homepage_order ?? 99
      if (orderA !== orderB) return orderA - orderB
      return a.sort_order - b.sort_order
    })

  return featured.slice(0, limit)
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const deletedIds = getDeletedCategoryIds()
  if (deletedIds.has(slug)) return null
  const metaStore = getCategoryMetaStore()

  if (!isSupabaseConfigured()) {
    const found = MOCK_CATEGORIES.find((c) => c.slug === slug && !deletedIds.has(c.id))
    return found ? applyCategoryDefaultsAndMeta(found, metaStore) : null
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data || deletedIds.has(data.id)) {
      const found = MOCK_CATEGORIES.find((c) => c.slug === slug && !deletedIds.has(c.id))
      return found ? applyCategoryDefaultsAndMeta(found, metaStore) : null
    }

    return applyCategoryDefaultsAndMeta(data, metaStore)
  } catch {
    const found = MOCK_CATEGORIES.find((c) => c.slug === slug && !deletedIds.has(c.id))
    return found ? applyCategoryDefaultsAndMeta(found, metaStore) : null
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const deletedIds = getDeletedCategoryIds()
  if (deletedIds.has(id)) return null
  const metaStore = getCategoryMetaStore()

  if (!isSupabaseConfigured()) {
    const found = MOCK_CATEGORIES.find((c) => c.id === id && !deletedIds.has(c.slug))
    return found ? applyCategoryDefaultsAndMeta(found, metaStore) : null
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data || deletedIds.has(data.id)) {
      const found = MOCK_CATEGORIES.find((c) => c.id === id && !deletedIds.has(c.slug))
      return found ? applyCategoryDefaultsAndMeta(found, metaStore) : null
    }

    return applyCategoryDefaultsAndMeta(data, metaStore)
  } catch {
    const found = MOCK_CATEGORIES.find((c) => c.id === id && !deletedIds.has(c.slug))
    return found ? applyCategoryDefaultsAndMeta(found, metaStore) : null
  }
}

/**
 * Resolves category cover images according to strict priority:
 * 1. Admin-uploaded custom category cover image (image_url)
 * 2. Admin-selected featured product image (featured_product_id)
 * 3. Primary image of an active, published product belonging to that category (auto_image !== false)
 * 4. Bubble Boom branded fallback (null / branded monochromatic card)
 */
export async function resolveCategoryCoverImages(categories: Category[]): Promise<CategoryWithCover[]> {
  // 1. Gather all active published candidate products in a single lightweight query
  let candidateProducts: any[] = []

  if (isSupabaseConfigured()) {
    try {
      const supabase = createPublicClient()
      const { data: prods } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          category_id,
          tags,
          is_published,
          is_active,
          created_at,
          category:categories(id, name, slug),
          images:product_images(id, image_url, sort_order, alt_text)
        `)
        .eq('is_published', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (prods && prods.length > 0) {
        candidateProducts = prods
      }
    } catch {}
  }

  // Merge dev & mock products for testing/dev resilience
  const devProducts = getDevProducts()
  const allProds = [...candidateProducts, ...devProducts, ...MOCK_PRODUCTS]
  const uniqueProductsMap = new Map<string, any>()
  for (const p of allProds) {
    if (p.is_published && p.is_active && !uniqueProductsMap.has(p.id)) {
      uniqueProductsMap.set(p.id, p)
    }
  }
  const activeProducts = Array.from(uniqueProductsMap.values())

  // 2. Resolve each category deterministically
  return categories.map((cat) => {
    // Count published items in this category
    const matchingProducts = activeProducts.filter((p) => {
      if (p.category_id === cat.id) return true
      if (p.category?.slug === cat.slug || p.category?.name?.toLowerCase() === cat.name.toLowerCase()) return true
      if (Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase() === cat.slug.toLowerCase())) return true
      return false
    })

    // Sort matching products deterministically: newest first, then by id
    const deterministicProducts = [...matchingProducts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      if (dateA !== dateB) return dateB - dateA
      return String(a.id).localeCompare(String(b.id))
    })

    // Priority 1: Admin-uploaded custom category cover image
    if (cat.image_url && typeof cat.image_url === 'string' && cat.image_url.trim().length > 0) {
      return {
        ...cat,
        cover_image: cat.image_url.trim(),
        image_source: 'custom' as const,
        product_count: matchingProducts.length,
      }
    }

    // Priority 2: Admin-selected featured product image
    if (cat.featured_product_id) {
      const featuredProd = activeProducts.find((p) => p.id === cat.featured_product_id)
      if (featuredProd && featuredProd.images && featuredProd.images.length > 0) {
        const sortedImages = [...featuredProd.images].sort(
          (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )
        const primaryImg = sortedImages[0]?.image_url
        if (primaryImg) {
          return {
            ...cat,
            cover_image: primaryImg,
            image_source: 'featured_product' as const,
            featured_product_name: featuredProd.name,
            product_count: matchingProducts.length,
          }
        }
      }
    }

    // Priority 3: Primary image of an active, published product belonging to that category
    if (cat.auto_image !== false && deterministicProducts.length > 0) {
      for (const prod of deterministicProducts) {
        if (prod.images && prod.images.length > 0) {
          const sortedImages = [...prod.images].sort(
            (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          )
          const primaryImg = sortedImages[0]?.image_url
          if (primaryImg) {
            return {
              ...cat,
              cover_image: primaryImg,
              image_source: 'auto_product' as const,
              featured_product_name: prod.name,
              product_count: matchingProducts.length,
            }
          }
        }
      }
    }

    // Priority 4: Bubble Boom branded fallback
    return {
      ...cat,
      cover_image: null,
      image_source: 'fallback' as const,
      product_count: matchingProducts.length,
    }
  })
}

/**
 * Returns categories with fully resolved cover images and metadata, with caching.
 */
export async function getCategoriesWithCovers(options?: {
  onlyFeatured?: boolean
  includeHidden?: boolean
  limit?: number
}): Promise<CategoryWithCover[]> {
  const cacheKey = JSON.stringify(options || {})
  if (coversCache && coversCache.key === cacheKey && Date.now() - coversCache.timestamp < CATEGORIES_TTL_MS) {
    return coversCache.data
  }

  const baseCategories = options?.onlyFeatured
    ? await getFeaturedCategories(options.limit ?? 8)
    : await getCategories(options?.includeHidden ?? false)

  const resolved = await resolveCategoryCoverImages(baseCategories)

  if (options?.limit && options.limit > 0) {
    const sliced = resolved.slice(0, options.limit)
    coversCache = { key: cacheKey, data: sliced, timestamp: Date.now() }
    return sliced
  }

  coversCache = { key: cacheKey, data: resolved, timestamp: Date.now() }
  return resolved
}

// Admin functions
export async function createCategory(
  category: Partial<Category> & Record<string, any>
): Promise<{ data?: Category; error?: string }> {
  clearCategoriesCache()

  const isUuid = Boolean(category.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category.id))
  const id: string = isUuid && category.id ? category.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`)
  const slug = category.slug ? generateSlug(category.slug) : generateSlug(category.name || 'category')
  const newCat = {
    id,
    name: category.name || '',
    slug,
    description: category.description || null,
    image_url: category.image_url || null,
    featured_product_id: category.featured_product_id || null,
    auto_image: category.auto_image !== undefined ? Boolean(category.auto_image) : true,
    show_on_homepage: category.show_on_homepage !== undefined ? Boolean(category.show_on_homepage) : false,
    homepage_order: Number(category.homepage_order) || 99,
    parent_id: category.parent_id || null,
    sort_order: Number(category.sort_order) || 10,
    is_active: category.is_active !== undefined ? Boolean(category.is_active) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Save metadata
  saveCategoryMeta(id, {
    image_url: newCat.image_url,
    featured_product_id: newCat.featured_product_id,
    auto_image: newCat.auto_image,
    show_on_homepage: newCat.show_on_homepage,
    homepage_order: newCat.homepage_order,
    sort_order: newCat.sort_order,
    is_active: newCat.is_active,
  })
  saveCategoryMeta(slug, {
    image_url: newCat.image_url,
    featured_product_id: newCat.featured_product_id,
    auto_image: newCat.auto_image,
    show_on_homepage: newCat.show_on_homepage,
    homepage_order: newCat.homepage_order,
    sort_order: newCat.sort_order,
    is_active: newCat.is_active,
  })

  MOCK_CATEGORIES.push(newCat as any)

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { error } = await supabase.from('categories').insert(newCat as any)
      if (error && (error.code === '42703' || error.message.includes('column'))) {
        // Fall back to standard columns if migration 012 not run on remote DB yet
        const standardCat = {
          id: newCat.id,
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description,
          image_url: newCat.image_url,
          sort_order: newCat.sort_order,
          is_active: newCat.is_active,
        }
        await supabase.from('categories').insert(standardCat as any)
      }
    } catch {}
  }

  return { data: newCat }
}

export async function updateCategory(
  id: string,
  category: Partial<Category> & Record<string, any>
): Promise<{ data?: Category | null; error?: string }> {
  clearCategoriesCache()

  // 1. Update in-memory MOCK_CATEGORIES
  const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id || c.slug === id)
  if (idx >= 0) {
    MOCK_CATEGORIES[idx] = {
      ...MOCK_CATEGORIES[idx],
      ...category,
      description: category.description !== undefined ? category.description : MOCK_CATEGORIES[idx].description,
    } as any
  }

  // 2. Persist category metadata overrides
  saveCategoryMeta(id, category)
  if (idx >= 0) {
    saveCategoryMeta(MOCK_CATEGORIES[idx].slug, category)
  }

  // 3. Update Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      let targetId = id

      if (!isUuid) {
        const { data: found } = await supabase.from('categories').select('id, slug').eq('slug', id).maybeSingle()
        if (found) {
          targetId = found.id
          saveCategoryMeta(found.slug, category)
        }
      }

      // Try updating with all fields
      const { error } = await supabase
        .from('categories')
        .update(category as any)
        .eq('id', targetId)

      if (error && (error.code === '42703' || error.message.includes('column'))) {
        // Fall back to updating only existing base columns
        const standardUpdates: Record<string, any> = {}
        const allowed = ['name', 'slug', 'description', 'image_url', 'parent_id', 'sort_order', 'is_active']
        for (const key of allowed) {
          if (key in category) {
            standardUpdates[key] = (category as any)[key]
          }
        }
        if (Object.keys(standardUpdates).length > 0) {
          await supabase.from('categories').update(standardUpdates as any).eq('id', targetId)
        }
      }
    } catch (err: any) {
      console.error('Error updating category in DB:', err)
    }
  }

  const updated = await getCategoryById(id)
  return { data: updated }
}

export async function deleteCategory(id: string) {
  clearCategoriesCache()
  saveDeletedCategoryId(id)

  const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id || c.slug === id)
  if (idx >= 0) {
    saveDeletedCategoryId(MOCK_CATEGORIES[idx].id)
    saveDeletedCategoryId(MOCK_CATEGORIES[idx].slug)
    MOCK_CATEGORIES.splice(idx, 1)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      let targetId = id
      if (!isUuid) {
        const { data: found } = await supabase
          .from('categories')
          .select('id, slug')
          .eq('slug', id)
          .maybeSingle()
        if (found) {
          targetId = found.id
          saveDeletedCategoryId(found.slug)
          saveDeletedCategoryId(found.id)
        }
      }

      // Unlink products referencing this category so deletion never violates FK
      await supabase.from('products').update({ category_id: null }).eq('category_id', targetId)
      // Unlink child categories referencing this parent
      await supabase.from('categories').update({ parent_id: null }).eq('parent_id', targetId)

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', targetId)

      if (error) {
        console.error('Error deleting category from DB, falling back to soft delete:', error)
        await supabase.from('categories').update({ is_active: false }).eq('id', targetId)
      }
    } catch (err: any) {
      console.error('Error deleting category:', err)
      return { error: err.message }
    }
  }

  return { success: true }
}
