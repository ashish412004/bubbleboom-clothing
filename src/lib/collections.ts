import { createClient as createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { MOCK_COLLECTIONS, MOCK_PRODUCTS } from './mock-data'

export type Collection = Database['public']['Tables']['collections']['Row']

export async function getCollections() {
  if (!isSupabaseConfigured()) {
    return MOCK_COLLECTIONS
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order')

    if (error || !data || data.length === 0) {
      return MOCK_COLLECTIONS
    }

    return data
  } catch {
    return MOCK_COLLECTIONS
  }
}

export async function getCollectionBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    const col = MOCK_COLLECTIONS.find((c) => c.slug === slug)
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

    if (error || !data) {
      const col = MOCK_COLLECTIONS.find((c) => c.slug === slug)
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
    const col = MOCK_COLLECTIONS.find((c) => c.slug === slug)
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
  if (!isSupabaseConfigured()) {
    return MOCK_COLLECTIONS.find((c) => c.id === id) || null
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return MOCK_COLLECTIONS.find((c) => c.id === id) || null
    }

    return data
  } catch {
    return MOCK_COLLECTIONS.find((c) => c.id === id) || null
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
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting collection:', error)
    return { error: error.message }
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
