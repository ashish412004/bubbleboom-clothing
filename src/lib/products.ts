import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { generateSlug } from './utils'

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

export async function getProducts(filters?: ProductFilterOptions) {
  const supabase = await createServerClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('is_published', true)
    .eq('is_active', true)

  // 1. Category filter (handles both slug and UUID)
  if (filters?.category) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      filters.category
    )
    if (isUuid) {
      query = query.eq('category_id', filters.category)
    } else {
      // Find category by slug
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', filters.category)
        .maybeSingle()
      if (cat) {
        query = query.eq('category_id', cat.id)
      } else {
        // Tag based fallback (e.g. 'men', 'women')
        query = query.contains('tags', [filters.category])
      }
    }
  }

  // 2. Collection filter
  if (filters?.collection) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      filters.collection
    )
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

    const productIds = colProducts?.map((cp) => cp.product_id) || []
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
  if (error || !data) {
    console.error('Error fetching products:', error)
    return []
  }

  let result = data as any[]

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

  return result
}

export async function getProductBySlug(slug: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function getProductById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function getRelatedProducts(productId: string, categoryId?: string, limit: number = 4) {
  const supabase = await createServerClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('is_published', true)
    .eq('is_active', true)
    .neq('id', productId)
    .limit(limit)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data } = await query
  return data || []
}

// Admin product functions
export async function createProduct(product: ProductInsert) {
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
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('product_images')
    .insert(image)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}
