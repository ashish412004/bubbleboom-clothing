import { createClient as createServerClient, createServiceClient, createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { MOCK_COLLECTIONS } from './mock-data'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

export interface Collection {
  id: string
  name: string
  slug: string
  description?: string | null
  short_description?: string | null
  banner_image_url?: string | null
  mobile_banner_image_url?: string | null
  is_visible: boolean
  is_featured?: boolean
  launch_date?: string | null
  sort_order: number
  seo_title?: string | null
  seo_description?: string | null
  seo_image_url?: string | null
  product_count?: number
  created_at: string
  updated_at: string
  collection_products?: any[]
}

let collectionsCache: { data: Collection[]; timestamp: number } | null = null
const slugCache = new Map<string, { data: any; timestamp: number }>()
const COLLECTIONS_TTL_MS = 60 * 1000

export function clearCollectionsCache() {
  collectionsCache = null
  slugCache.clear()
}

export function getDeletedCollectionIds(): Set<string> {
  try {
    const file = path.join(process.cwd(), '.next', 'bb_deleted_collections.json')
    if (fs.existsSync(file)) {
      const arr = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return new Set(arr)
    }
  } catch {}
  return new Set()
}

export function saveDeletedCollectionId(id: string) {
  try {
    const dir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'bb_deleted_collections.json')
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

/**
 * Collections metadata stored persistently in store_settings (collections_metadata)
 * to support is_featured, mobile_banner_image_url, and SEO fields seamlessly
 * across all database setups.
 */
export async function getCollectionsMetadata(): Promise<Record<string, any>> {
  if (!isSupabaseConfigured()) return {}
  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'collections_metadata')
      .maybeSingle()
    return (data?.value as Record<string, any>) || {}
  } catch {
    return {}
  }
}

export async function saveCollectionMetadata(
  slugOrId: string,
  metadata: {
    is_featured?: boolean
    mobile_banner_image_url?: string | null
    seo_title?: string | null
    seo_description?: string | null
    seo_image_url?: string | null
    short_description?: string | null
  }
) {
  if (!isSupabaseConfigured()) return
  try {
    const supabase = await createServiceClient()
    const existing = await getCollectionsMetadata()
    const updated = {
      ...existing,
      [slugOrId]: {
        ...(existing[slugOrId] || {}),
        ...metadata,
      },
    }
    await supabase.from('store_settings').upsert({
      key: 'collections_metadata',
      value: updated,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('Could not save collection metadata to store_settings:', err)
  }
}

export async function deleteCollectionMetadata(slugOrId: string) {
  if (!isSupabaseConfigured()) return
  try {
    const supabase = await createServiceClient()
    const existing = await getCollectionsMetadata()
    if (existing[slugOrId]) {
      delete existing[slugOrId]
      await supabase.from('store_settings').upsert({
        key: 'collections_metadata',
        value: existing,
        updated_at: new Date().toISOString(),
      })
    }
  } catch {}
}

export async function getCollections(includeDrafts: boolean = false): Promise<Collection[]> {
  const deletedIds = getDeletedCollectionIds()
  if (!includeDrafts && collectionsCache && Date.now() - collectionsCache.timestamp < COLLECTIONS_TTL_MS) {
    return collectionsCache.data.filter((c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))
  }

  // Base fallback from mock data
  let list: Collection[] = MOCK_COLLECTIONS.filter((c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug)).map((c) => ({
    ...c,
    is_featured: c.is_featured ?? (c.slug === 'bubble-boom-monochrome-kicks'),
    product_count: 1,
  }))

  if (!includeDrafts) {
    list = list.filter((c) => c.is_visible)
  }

  if (!isSupabaseConfigured()) {
    if (!includeDrafts) {
      collectionsCache = { data: list, timestamp: Date.now() }
    }
    return list
  }

  try {
    const supabase = createPublicClient()

    let query = supabase
      .from('collections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!includeDrafts) {
      query = query.eq('is_visible', true)
    }

    const [{ data, error }, meta, { data: colProducts }] = await Promise.all([
      query,
      getCollectionsMetadata(),
      supabase.from('collection_products').select('collection_id'),
    ])

    if (error || !data || data.length === 0) {
      return list
    }

    // Count products per collection
    const productCounts: Record<string, number> = {}
    if (colProducts) {
      for (const cp of colProducts) {
        productCounts[cp.collection_id] = (productCounts[cp.collection_id] || 0) + 1
      }
    }

    const enriched: Collection[] = data
      .filter((c: any) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))
      .map((c: any) => {
        const itemMeta = meta[c.slug] || meta[c.id] || {}
        return {
          ...c,
          is_visible: Boolean(c.is_visible),
          is_featured:
            typeof c.is_featured === 'boolean'
              ? c.is_featured
              : typeof itemMeta.is_featured === 'boolean'
              ? itemMeta.is_featured
              : c.slug === 'bubble-boom-monochrome-kicks',
          mobile_banner_image_url:
            c.mobile_banner_image_url || itemMeta.mobile_banner_image_url || null,
          short_description: itemMeta.short_description || null,
          seo_title: c.seo_title || itemMeta.seo_title || null,
          seo_description: c.seo_description || itemMeta.seo_description || null,
          seo_image_url: (c as any).seo_image_url || itemMeta.seo_image_url || null,
          product_count: productCounts[c.id] || 0,
        }
      })
      .sort((a, b) => {
        const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
        if (orderDiff !== 0) return orderDiff
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

    if (!includeDrafts) {
      collectionsCache = { data: enriched, timestamp: Date.now() }
    }
    return enriched
  } catch (err) {
    console.error('Error fetching collections:', err)
    return list
  }
}

export async function getCollectionBySlug(slug: string, allowDraft: boolean = false): Promise<Collection | null> {
  const deletedIds = getDeletedCollectionIds()
  if (deletedIds.has(slug)) return null

  const cacheKey = `${slug}:${allowDraft ? 'draft' : 'pub'}`
  const cached = slugCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < COLLECTIONS_TTL_MS) {
    if (!deletedIds.has(cached.data?.id)) return cached.data
  }

  if (!isSupabaseConfigured()) {
    const col = MOCK_COLLECTIONS.find((c) => c.slug === slug && !deletedIds.has(c.id))
    if (!col) return null
    if (!allowDraft && !col.is_visible) return null
    const result: Collection = {
      ...col,
      is_featured: col.is_featured ?? (col.slug === 'bubble-boom-monochrome-kicks'),
      collection_products: (col as any).collection_products || [],
      product_count: (col as any).collection_products?.length || 0,
    }
    slugCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }

  try {
    const supabase = createPublicClient()

    let query = supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)

    if (!allowDraft) {
      query = query.eq('is_visible', true)
    }

    const [{ data, error }, meta] = await Promise.all([
      query.maybeSingle(),
      getCollectionsMetadata(),
    ])

    if (error || !data || deletedIds.has(data.id)) {
      const col = MOCK_COLLECTIONS.find((c) => c.slug === slug && !deletedIds.has(c.id))
      if (!col) return null
      if (!allowDraft && !col.is_visible) return null
      const result: Collection = {
        ...col,
        is_featured: col.is_featured ?? (col.slug === 'bubble-boom-monochrome-kicks'),
        collection_products: (col as any).collection_products || [],
        product_count: (col as any).collection_products?.length || 0,
      }
      slugCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    const assignedProducts = await getProductsByCollectionId(data.id)
    const itemMeta = meta[data.slug] || meta[data.id] || {}
    const result: Collection = {
      ...data,
      is_visible: Boolean(data.is_visible),
      is_featured:
        typeof (data as any).is_featured === 'boolean'
          ? (data as any).is_featured
          : typeof itemMeta.is_featured === 'boolean'
          ? itemMeta.is_featured
          : data.slug === 'bubble-boom-monochrome-kicks',
      mobile_banner_image_url:
        (data as any).mobile_banner_image_url || itemMeta.mobile_banner_image_url || null,
      short_description: itemMeta.short_description || null,
      seo_title: data.seo_title || itemMeta.seo_title || null,
      seo_description: data.seo_description || itemMeta.seo_description || null,
      seo_image_url: (data as any).seo_image_url || itemMeta.seo_image_url || null,
      collection_products: assignedProducts,
      product_count: assignedProducts.length,
    }

    slugCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (err) {
    console.error(`Error fetching collection by slug [${slug}]:`, err)
    const col = MOCK_COLLECTIONS.find((c) => c.slug === slug && !deletedIds.has(c.id))
    if (!col) return null
    if (!allowDraft && !col.is_visible) return null
    return {
      ...col,
      is_featured: col.is_featured ?? (col.slug === 'bubble-boom-monochrome-kicks'),
      collection_products: (col as any).collection_products || [],
      product_count: (col as any).collection_products?.length || 0,
    }
  }
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  const deletedIds = getDeletedCollectionIds()
  if (deletedIds.has(id)) return null

  if (!isSupabaseConfigured()) {
    return MOCK_COLLECTIONS.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
  }

  try {
    const supabase = await createServiceClient()

    const [{ data, error }, meta] = await Promise.all([
      supabase.from('collections').select('*').eq('id', id).maybeSingle(),
      getCollectionsMetadata(),
    ])

    if (error || !data || deletedIds.has(data.id) || deletedIds.has(data.slug)) {
      return MOCK_COLLECTIONS.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
    }

    const itemMeta = meta[data.slug] || meta[data.id] || {}
    return {
      ...data,
      is_visible: Boolean(data.is_visible),
      is_featured:
        typeof (data as any).is_featured === 'boolean'
          ? (data as any).is_featured
          : typeof itemMeta.is_featured === 'boolean'
          ? itemMeta.is_featured
          : data.slug === 'bubble-boom-monochrome-kicks',
      mobile_banner_image_url:
        (data as any).mobile_banner_image_url || itemMeta.mobile_banner_image_url || null,
      short_description: itemMeta.short_description || null,
      seo_title: data.seo_title || itemMeta.seo_title || null,
      seo_description: data.seo_description || itemMeta.seo_description || null,
      seo_image_url: (data as any).seo_image_url || itemMeta.seo_image_url || null,
    }
  } catch {
    return MOCK_COLLECTIONS.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
  }
}

export async function getProductsByCollectionId(collectionId: string) {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('collection_products')
      .select(`
        product_id,
        sort_order,
        products(
          id,
          name,
          slug,
          mrp,
          selling_price,
          is_active,
          is_published,
          images:product_images(id, image_url, alt_text, sort_order),
          variants:product_variants(id, sku, color, size, stock, is_active)
        )
      `)
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })

    if (error || !data) {
      return []
    }

    return data
  } catch {
    return []
  }
}

/**
 * Fetch available catalog products for admin collection assignment picker
 */
export async function getAvailableProductsForCollection(search?: string) {
  if (!isSupabaseConfigured()) return []
  try {
    const supabase = await createServiceClient()
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        mrp,
        selling_price,
        is_active,
        is_published,
        images:product_images(id, image_url, sort_order),
        variants:product_variants(id, stock, is_active)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error || !data) return []

    return data.map((p: any) => {
      const primaryImage =
        p.images?.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url || null
      const totalStock = (p.variants || []).reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0)
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        mrp: p.mrp,
        selling_price: p.selling_price,
        is_active: p.is_active,
        is_published: p.is_published,
        image_url: primaryImage,
        total_stock: totalStock,
      }
    })
  } catch (err) {
    console.error('Error fetching available products for collection:', err)
    return []
  }
}

/**
 * Sync collection products junction table
 */
export async function setCollectionProducts(collectionId: string, productIds: string[]) {
  if (!isSupabaseConfigured()) return { success: true }
  try {
    const supabase = await createServiceClient()

    // 1. Delete existing collection associations
    await supabase.from('collection_products').delete().eq('collection_id', collectionId)

    // 2. Insert new ordered items
    if (productIds.length > 0) {
      const rows = productIds.map((pid, idx) => ({
        collection_id: collectionId,
        product_id: pid,
        sort_order: idx + 1,
      }))
      const { error } = await supabase.from('collection_products').insert(rows)
      if (error) {
        console.error('Error inserting collection products:', error)
        return { error: error.message }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error syncing collection products:', err)
    return { error: err.message }
  }
}

// Admin functions
export async function createCollection(
  collection: Partial<Collection> & { product_ids?: string[] }
) {
  clearCollectionsCache()

  const {
    product_ids,
    is_featured,
    mobile_banner_image_url,
    short_description,
    seo_image_url,
    ...basePayload
  } = collection

  if (!isSupabaseConfigured()) {
    const newCol: Collection = {
      id: collection.id || `col-${Date.now()}`,
      name: collection.name || 'Untitled Collection',
      slug: collection.slug || `collection-${Date.now()}`,
      description: collection.description || null,
      short_description: short_description || null,
      banner_image_url: collection.banner_image_url || null,
      mobile_banner_image_url: mobile_banner_image_url || null,
      is_visible: collection.is_visible !== undefined ? Boolean(collection.is_visible) : true,
      is_featured: Boolean(is_featured),
      sort_order: collection.sort_order ?? 10,
      seo_title: collection.seo_title || null,
      seo_description: collection.seo_description || null,
      seo_image_url: seo_image_url || null,
      product_count: product_ids?.length || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    MOCK_COLLECTIONS.push(newCol)
    return { data: newCol }
  }

  const supabase = await createServiceClient()

  // Ensure unique slug
  let targetSlug = collection.slug || collection.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `collection-${Date.now()}`
  let suffix = 0
  while (true) {
    const checkSlug = suffix === 0 ? targetSlug : `${targetSlug}-${suffix}`
    const { data: existing } = await supabase.from('collections').select('id').eq('slug', checkSlug).maybeSingle()
    if (!existing) {
      targetSlug = checkSlug
      break
    }
    suffix++
  }

  // Attempt insert with all columns
  let insertData: any = {
    ...basePayload,
    slug: targetSlug,
    sort_order: Number(collection.sort_order) || 0,
    is_visible: collection.is_visible !== undefined ? Boolean(collection.is_visible) : true,
  }

  // Try insert directly
  let { data, error } = await supabase.from('collections').insert(insertData).select().single()

  // If column error occurs (e.g. schema cache or missing column), strip extra fields
  if (error && (error.message?.includes('column') || error.message?.includes('schema cache'))) {
    const standardFields: any = {
      name: insertData.name,
      slug: insertData.slug,
      description: insertData.description || null,
      banner_image_url: insertData.banner_image_url || null,
      is_visible: insertData.is_visible,
      sort_order: insertData.sort_order,
      seo_title: insertData.seo_title || null,
      seo_description: insertData.seo_description || null,
    }
    const retry = await supabase.from('collections').insert(standardFields).select().single()
    data = retry.data
    error = retry.error
  }

  if (error || !data) {
    console.error('Error creating collection:', error)
    return { error: error?.message || 'Failed to insert collection' }
  }

  // Persist metadata in store_settings (guarantees is_featured & mobile_banner_image_url work immediately)
  await saveCollectionMetadata(data.slug, {
    is_featured: Boolean(is_featured),
    mobile_banner_image_url: mobile_banner_image_url || null,
    short_description: short_description || null,
    seo_title: collection.seo_title || null,
    seo_description: collection.seo_description || null,
    seo_image_url: seo_image_url || null,
  })

  // Assign products if provided
  if (Array.isArray(product_ids) && product_ids.length > 0) {
    await setCollectionProducts(data.id, product_ids)
  }

  try {
    revalidatePath('/')
    revalidatePath('/collections')
    revalidatePath(`/collections/${data.slug}`)
    revalidatePath('/admin/collections')
  } catch {}

  return {
    data: {
      ...data,
      is_featured: Boolean(is_featured),
      mobile_banner_image_url: mobile_banner_image_url || null,
      short_description: short_description || null,
      product_count: product_ids?.length || 0,
    },
  }
}

export async function updateCollection(
  id: string,
  collection: Partial<Collection> & { product_ids?: string[] }
) {
  clearCollectionsCache()

  const {
    product_ids,
    is_featured,
    mobile_banner_image_url,
    short_description,
    seo_image_url,
    ...basePayload
  } = collection

  if (!isSupabaseConfigured()) {
    const idx = MOCK_COLLECTIONS.findIndex((c) => c.id === id)
    if (idx >= 0) {
      MOCK_COLLECTIONS[idx] = {
        ...MOCK_COLLECTIONS[idx],
        ...basePayload,
        is_featured: is_featured !== undefined ? Boolean(is_featured) : MOCK_COLLECTIONS[idx].is_featured,
        mobile_banner_image_url:
          mobile_banner_image_url !== undefined ? mobile_banner_image_url : MOCK_COLLECTIONS[idx].mobile_banner_image_url,
        short_description:
          short_description !== undefined ? short_description : MOCK_COLLECTIONS[idx].short_description,
        seo_image_url: seo_image_url !== undefined ? seo_image_url : MOCK_COLLECTIONS[idx].seo_image_url,
        product_count: product_ids ? product_ids.length : MOCK_COLLECTIONS[idx].product_count,
        updated_at: new Date().toISOString(),
      }
      return { data: MOCK_COLLECTIONS[idx] }
    }
  }

  const supabase = await createServiceClient()

  // First fetch existing collection for slug and identity
  const { data: existing } = await supabase.from('collections').select('*').eq('id', id).maybeSingle()
  const slugKey = collection.slug || existing?.slug || id

  let updatePayload: any = {
    ...basePayload,
    updated_at: new Date().toISOString(),
  }
  if (collection.sort_order !== undefined) updatePayload.sort_order = Number(collection.sort_order)
  if (collection.is_visible !== undefined) updatePayload.is_visible = Boolean(collection.is_visible)

  let { data, error } = await supabase
    .from('collections')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error && (error.message?.includes('column') || error.message?.includes('schema cache'))) {
    // Retry with only existing recognized columns
    const safePayload: any = {}
    if (updatePayload.name !== undefined) safePayload.name = updatePayload.name
    if (updatePayload.slug !== undefined) safePayload.slug = updatePayload.slug
    if (updatePayload.description !== undefined) safePayload.description = updatePayload.description
    if (updatePayload.banner_image_url !== undefined) safePayload.banner_image_url = updatePayload.banner_image_url
    if (updatePayload.is_visible !== undefined) safePayload.is_visible = updatePayload.is_visible
    if (updatePayload.sort_order !== undefined) safePayload.sort_order = updatePayload.sort_order
    if (updatePayload.seo_title !== undefined) safePayload.seo_title = updatePayload.seo_title
    if (updatePayload.seo_description !== undefined) safePayload.seo_description = updatePayload.seo_description
    safePayload.updated_at = new Date().toISOString()

    const retry = await supabase.from('collections').update(safePayload).eq('id', id).select().single()
    data = retry.data
    error = retry.error
  }

  if (error || !data) {
    console.error('Error updating collection:', error)
    return { error: error?.message || 'Failed to update collection' }
  }

  // Update metadata in store_settings
  const metaUpdates: any = {}
  if (is_featured !== undefined) metaUpdates.is_featured = Boolean(is_featured)
  if (mobile_banner_image_url !== undefined) metaUpdates.mobile_banner_image_url = mobile_banner_image_url
  if (short_description !== undefined) metaUpdates.short_description = short_description
  if (collection.seo_title !== undefined) metaUpdates.seo_title = collection.seo_title
  if (collection.seo_description !== undefined) metaUpdates.seo_description = collection.seo_description
  if (seo_image_url !== undefined) metaUpdates.seo_image_url = seo_image_url

  if (Object.keys(metaUpdates).length > 0) {
    await saveCollectionMetadata(data.slug || slugKey, metaUpdates)
  }

  // Update assigned products if array was provided
  if (Array.isArray(product_ids)) {
    await setCollectionProducts(id, product_ids)
  }

  try {
    revalidatePath('/')
    revalidatePath('/collections')
    if (data?.slug) revalidatePath(`/collections/${data.slug}`)
    if (existing?.slug && existing.slug !== data?.slug) revalidatePath(`/collections/${existing.slug}`)
    revalidatePath('/admin/collections')
  } catch {}

  return {
    data: {
      ...data,
      is_featured: is_featured !== undefined ? Boolean(is_featured) : undefined,
      mobile_banner_image_url:
        mobile_banner_image_url !== undefined ? mobile_banner_image_url : undefined,
      short_description: short_description !== undefined ? short_description : undefined,
    },
  }
}

export async function deleteCollection(id: string) {
  clearCollectionsCache()
  saveDeletedCollectionId(id)

  const idx = MOCK_COLLECTIONS.findIndex((c) => c.id === id || c.slug === id)
  if (idx >= 0) {
    saveDeletedCollectionId(MOCK_COLLECTIONS[idx].id)
    saveDeletedCollectionId(MOCK_COLLECTIONS[idx].slug)
    MOCK_COLLECTIONS.splice(idx, 1)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      let targetId = id
      let targetSlug = id
      if (!isUuid) {
        const { data: found } = await supabase
          .from('collections')
          .select('id, slug')
          .eq('slug', id)
          .maybeSingle()
        if (found) {
          targetId = found.id
          targetSlug = found.slug
          saveDeletedCollectionId(found.slug)
          saveDeletedCollectionId(found.id)
        }
      } else {
        const { data: found } = await supabase
          .from('collections')
          .select('id, slug')
          .eq('id', id)
          .maybeSingle()
        if (found) {
          targetSlug = found.slug
          saveDeletedCollectionId(found.slug)
          saveDeletedCollectionId(found.id)
        }
      }

      // Safe clean up: remove only relations from collection_products
      // Underlying products, variants, images, and orders are 100% UNTOUCHED!
      await supabase.from('collection_products').delete().eq('collection_id', targetId)

      // Delete from collections or hide
      const { error } = await supabase.from('collections').delete().eq('id', targetId)
      if (error) {
        console.warn('Could not hard delete collection, marking is_visible = false:', error.message)
        await supabase.from('collections').update({ is_visible: false }).eq('id', targetId)
      }

      await deleteCollectionMetadata(targetSlug)
      if (targetId !== targetSlug) {
        await deleteCollectionMetadata(targetId)
      }
    } catch (err: any) {
      console.error('Collection delete error:', err)
      return { error: err.message }
    }
  }

  try {
    revalidatePath('/')
    revalidatePath('/collections')
    revalidatePath('/admin/collections')
  } catch {}

  return { success: true }
}

export async function addProductToCollection(collectionId: string, productId: string, sortOrder: number = 0) {
  clearCollectionsCache()
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('collection_products')
    .insert({
      collection_id: collectionId,
      product_id: productId,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding product to collection:', error)
    return { error: error.message }
  }

  try {
    revalidatePath('/collections')
    revalidatePath('/admin/collections')
  } catch {}

  return { data }
}

export async function removeProductFromCollection(collectionId: string, productId: string) {
  clearCollectionsCache()
  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('collection_products')
    .delete()
    .eq('collection_id', collectionId)
    .eq('product_id', productId)

  if (error) {
    console.error('Error removing product from collection:', error)
    return { error: error.message }
  }

  try {
    revalidatePath('/collections')
    revalidatePath('/admin/collections')
  } catch {}

  return { success: true }
}

export async function updateCollectionProductOrder(
  collectionId: string,
  productOrders: { product_id: string; sort_order: number }[]
) {
  clearCollectionsCache()
  const supabase = await createServiceClient()

  const promises = productOrders.map(({ product_id, sort_order }) =>
    supabase
      .from('collection_products')
      .update({ sort_order })
      .eq('collection_id', collectionId)
      .eq('product_id', product_id)
  )

  const results = await Promise.all(promises)

  if (results.some((r) => r.error)) {
    return { error: 'Failed to reorder some products' }
  }

  try {
    revalidatePath('/collections')
    revalidatePath('/admin/collections')
  } catch {}

  return { success: true }
}
