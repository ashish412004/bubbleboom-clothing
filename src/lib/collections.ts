import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export type Collection = Database['public']['Tables']['collections']['Row']

export async function getCollections() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order')

  if (error) {
    console.error('Error fetching collections:', error)
    return []
  }

  return data
}

export async function getCollectionBySlug(slug: string) {
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

  if (error) {
    console.error('Error fetching collection:', error)
    return null
  }

  return data
}

export async function getCollectionById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching collection:', error)
    return null
  }

  return data
}

export async function getProductsByCollectionId(collectionId: string) {
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

  if (error) {
    console.error('Error fetching collection products:', error)
    return []
  }

  return data
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
