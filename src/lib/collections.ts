import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { MOCK_COLLECTIONS, MOCK_PRODUCTS } from './mock-data'
import fs from 'fs'
import path from 'path'

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

export type Collection = Database['public']['Tables']['collections']['Row']

export async function getCollections(includeDrafts: boolean = false) {
  const deletedIds = getDeletedCollectionIds()
  let list = MOCK_COLLECTIONS.filter((c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))
  if (!includeDrafts) {
    list = list.filter((c) => c.is_visible)
  }

  if (!isSupabaseConfigured()) {
    return list
  }

  try {
    const supabase = await createServerClient()

    let query = supabase
      .from('collections')
      .select('*')
      .order('sort_order')

    if (!includeDrafts) {
      query = query.eq('is_visible', true)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      return list
    }

    return data.filter((c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))
  } catch {
    return list
  }
}

export async function getCollectionBySlug(slug: string) {
  const deletedIds = getDeletedCollectionIds()
  if (deletedIds.has(slug)) return null

  if (!isSupabaseConfigured()) {
    const col = MOCK_COLLECTIONS.find((c) => c.slug === slug && !deletedIds.has(c.id))
    if (!col) return null
    return {
      ...col,
      collection_products: MOCK_PRODUCTS.slice(0, 3).map((p, idx) => ({
        product_id: p.id,
        products: p,
      })),
    }
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        collection_products(
          product_id,
          products(*, images:product_images(*), variants:product_variants(*))
        )
      `)
      .eq('slug', slug)
      .eq('is_visible', true)
      .single()

    if (error || !data || deletedIds.has(data.id)) {
      const col = MOCK_COLLECTIONS.find((c) => c.slug === slug && !deletedIds.has(c.id))
      if (!col) return null
      return {
        ...col,
        collection_products: MOCK_PRODUCTS.slice(0, 3).map((p, idx) => ({
          product_id: p.id,
          products: p,
        })),
      }
    }

    return data
  } catch {
    const col = MOCK_COLLECTIONS.find((c) => c.slug === slug && !deletedIds.has(c.id))
    if (!col) return null
    return {
      ...col,
      collection_products: MOCK_PRODUCTS.slice(0, 3).map((p, idx) => ({
        product_id: p.id,
        products: p,
      })),
    }
  }
}

export async function getCollectionById(id: string) {
  const deletedIds = getDeletedCollectionIds()
  if (deletedIds.has(id)) return null

  if (!isSupabaseConfigured()) {
    return MOCK_COLLECTIONS.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data || deletedIds.has(data.id) || deletedIds.has(data.slug)) {
      return MOCK_COLLECTIONS.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
    }

    return data
  } catch {
    return MOCK_COLLECTIONS.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
  }
}

export async function getProductsByCollectionId(collectionId: string) {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.slice(0, 3).map((p, idx) => ({
      product_id: p.id,
      sort_order: idx + 1,
      products: p,
    }))
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('collection_products')
      .select(`
        product_id,
        sort_order,
        products(*, images:product_images(*), variants:product_variants(*))
      `)
      .eq('collection_id', collectionId)
      .order('sort_order')

    if (error || !data || data.length === 0) {
      return MOCK_PRODUCTS.slice(0, 3).map((p, idx) => ({
        product_id: p.id,
        sort_order: idx + 1,
        products: p,
      }))
    }

    return data
  } catch {
    return MOCK_PRODUCTS.slice(0, 3).map((p, idx) => ({
      product_id: p.id,
      sort_order: idx + 1,
      products: p,
    }))
  }
}

// Admin functions
export async function createCollection(collection: Database['public']['Tables']['collections']['Insert']) {
  if (!isSupabaseConfigured()) {
    const newCol = {
      id: `col-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_visible: true,
      sort_order: 10,
      description: null,
      banner_image_url: null,
      ...collection,
    } as any
    MOCK_COLLECTIONS.push(newCol)
    return { data: newCol }
  }

  const supabase = await createServerClient()

  // @ts-ignore
  const { data, error } = await supabase
    .from('collections')
    .insert(collection)
    .select()
    .single()

  if (error) {
    console.error('Error creating collection:', error)
    return { error: error.message }
  }

  return { data }
}

export async function updateCollection(id: string, collection: Database['public']['Tables']['collections']['Update']) {
  if (!isSupabaseConfigured()) {
    const idx = MOCK_COLLECTIONS.findIndex((c) => c.id === id)
    if (idx >= 0) {
      MOCK_COLLECTIONS[idx] = {
        ...MOCK_COLLECTIONS[idx],
        ...collection,
        description: collection.description !== undefined ? (collection.description ?? '') : MOCK_COLLECTIONS[idx].description,
        banner_image_url: collection.banner_image_url !== undefined ? (collection.banner_image_url ?? '') : MOCK_COLLECTIONS[idx].banner_image_url,
      } as any
      return { data: MOCK_COLLECTIONS[idx] }
    }
  }

  const supabase = await createServerClient()

  // @ts-ignore
  const { data, error } = await supabase
    .from('collections')
    .update(collection)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating collection:', error)
    return { error: error.message }
  }

  return { data }
}

export async function deleteCollection(id: string) {
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
      if (!isUuid) {
        const { data: found } = await supabase
          .from('collections')
          .select('id, slug')
          .eq('slug', id)
          .maybeSingle()
        if (found) {
          targetId = found.id
          saveDeletedCollectionId(found.slug)
          saveDeletedCollectionId(found.id)
        }
      }

      await supabase.from('collection_products').delete().eq('collection_id', targetId)
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', targetId)

      if (error) {
        console.error('Error deleting collection from DB, hiding collection:', error)
        await supabase.from('collections').update({ is_visible: false }).eq('id', targetId)
      }
    } catch (err: any) {
      console.error('Collection delete error:', err)
      return { error: err.message }
    }
  }

  return { success: true }
}

export async function addProductToCollection(collectionId: string, productId: string, sortOrder: number = 0) {
  const supabase = await createServerClient()

  // @ts-ignore
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

  return { data }
}

export async function removeProductFromCollection(collectionId: string, productId: string) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('collection_products')
    .delete()
    .eq('collection_id', collectionId)
    .eq('product_id', productId)

  if (error) {
    console.error('Error removing product from collection:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateCollectionProductOrder(collectionId: string, productOrders: { product_id: string; sort_order: number }[]) {
  const supabase = await createServerClient()

  const promises = productOrders.map(({ product_id, sort_order }) =>
    // @ts-ignore
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

  return { success: true }
}
