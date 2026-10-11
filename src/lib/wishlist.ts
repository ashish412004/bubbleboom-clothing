import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { parseProductImage } from '@/lib/utils'

export interface WishlistItemWithDetails {
  id: string
  wishlist_id: string
  variant_id: string
  created_at: string
  variant: {
    id: string
    product_id: string
    sku: string
    color: string
    size: string
    stock: number
    is_active?: boolean
    product: {
      id: string
      name: string
      slug: string
      mrp: number
      selling_price: number
      is_published: boolean
      is_active?: boolean
      images: Array<{
        id?: string
        image_url: string
        alt_text: string | null
        sort_order?: number
        color?: string | null
      }>
    }
  }
}

// In-memory fallback structures for local/test environments when Supabase is not configured
interface LocalWishlist {
  id: string
  user_id: string | null
  session_id: string | null
}

interface LocalWishlistItem {
  id: string
  wishlist_id: string
  variant_id: string
  created_at: string
}

let localWishlists: LocalWishlist[] = []
let localWishlistItems: LocalWishlistItem[] = []

const MOCK_VARIANT_CATALOG: Array<{
  variantId: string
  productId: string
  sku: string
  color: string
  size: string
  stock: number
  is_active: boolean
  product: {
    id: string
    name: string
    slug: string
    mrp: number
    selling_price: number
    is_published: boolean
    is_active: boolean
    images: Array<{
      id?: string
      image_url: string
      alt_text: string | null
      sort_order?: number
      color?: string | null
    }>
  }
}> = [
  {
    variantId: '17471ccf-3fa5-4745-8018-5e71fd904956',
    productId: '92d1dd51-e0c3-4aa3-b7c2-554ca4c94d66',
    sku: 'BB-HOOD-BLK-L',
    color: 'Onyx Black',
    size: 'L',
    stock: 25,
    is_active: true,
    product: {
      id: '92d1dd51-e0c3-4aa3-b7c2-554ca4c94d66',
      name: 'Bubble Boom Signature Hoodie',
      slug: 'bubble-boom-signature-hoodie',
      mrp: 2999,
      selling_price: 1899,
      is_published: true,
      is_active: true,
      images: [
        {
          id: 'img-1',
          image_url: 'https://bubbleboom.in/images/hoodie.jpg',
          alt_text: 'Bubble Boom Hoodie',
          sort_order: 1,
        },
      ],
    },
  },
]

export async function getOrCreateWishlist(userId?: string, sessionId?: string) {
  if (!userId && !sessionId) return null

  if (!isSupabaseConfigured()) {
    let existing = localWishlists.find(
      (w) => (userId && w.user_id === userId) || (sessionId && w.session_id === sessionId)
    )
    if (!existing) {
      existing = {
        id: 'wl_' + (userId || sessionId || Math.random().toString(36).substring(2)),
        user_id: userId || null,
        session_id: sessionId || null,
      }
      localWishlists.push(existing)
    }
    return existing
  }

  // Use service client to guarantee atomic creation and access across both authenticated users and guest sessions
  const supabase = await createServiceClient()

  let query = supabase.from('wishlists').select('*')
  if (userId) {
    query = query.eq('user_id', userId)
  } else if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data: existing } = await query.maybeSingle()
  if (existing) return existing

  const insertPayload = {
    user_id: userId || null,
    session_id: sessionId || null,
  }
  const { data: newWishlist, error } = await supabase
    .from('wishlists')
    .insert(insertPayload)
    .select()
    .single()

  if (error || !newWishlist) {
    console.error('Error creating wishlist:', error)
    return null
  }
  return newWishlist
}

/**
 * Resolves an item identifier (which might be a variant_id or a product_id)
 * into a valid product_variant id.
 */
export async function resolveVariantId(identifier: string): Promise<{ variantId: string | null; productId: string | null }> {
  if (!identifier) return { variantId: null, productId: null }

  if (!isSupabaseConfigured()) {
    const matched = MOCK_VARIANT_CATALOG.find(
      (c) => c.variantId === identifier || c.productId === identifier
    )
    if (matched) {
      return { variantId: matched.variantId, productId: matched.productId }
    }
    return { variantId: identifier, productId: identifier }
  }

  const supabase = await createServiceClient()

  // 1. Check if identifier is already a variant_id
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, product_id')
    .eq('id', identifier)
    .maybeSingle()

  if (variant) {
    return { variantId: variant.id, productId: variant.product_id }
  }

  // 2. Check if identifier is a product_id, and choose the first active / available variant
  const { data: productVariants } = await supabase
    .from('product_variants')
    .select('id, product_id, stock, is_active')
    .eq('product_id', identifier)
    .order('stock', { ascending: false })

  if (productVariants && productVariants.length > 0) {
    const active = productVariants.find((v) => v.is_active) || productVariants[0]
    return { variantId: active.id, productId: identifier }
  }

  return { variantId: null, productId: null }
}

export async function getWishlist(
  userId?: string,
  sessionId?: string
): Promise<WishlistItemWithDetails[]> {
  if (!userId && !sessionId) return []

  if (!isSupabaseConfigured()) {
    const wl = await getOrCreateWishlist(userId, sessionId)
    if (!wl) return []
    const items = localWishlistItems.filter((i) => i.wishlist_id === wl.id)
    return items.map((i) => {
      const cat = MOCK_VARIANT_CATALOG.find((c) => c.variantId === i.variant_id)
      return {
        id: i.id,
        wishlist_id: i.wishlist_id,
        variant_id: i.variant_id,
        created_at: i.created_at,
        variant: cat
          ? {
              id: cat.variantId,
              product_id: cat.productId,
              sku: cat.sku,
              color: cat.color,
              size: cat.size,
              stock: cat.stock,
              is_active: cat.is_active,
              product: cat.product,
            }
          : {
              id: i.variant_id,
              product_id: i.variant_id,
              sku: 'SKU-' + i.variant_id,
              color: 'Standard',
              size: 'Free Size',
              stock: 10,
              is_active: true,
              product: {
                id: i.variant_id,
                name: 'Product ' + i.variant_id,
                slug: 'product-' + i.variant_id,
                mrp: 2999,
                selling_price: 1999,
                is_published: true,
                is_active: true,
                images: [],
              },
            },
      }
    })
  }

  const supabase = await createServiceClient()

  let wishlistQuery = supabase.from('wishlists').select('id')
  if (userId) {
    wishlistQuery = wishlistQuery.eq('user_id', userId)
  } else if (sessionId) {
    wishlistQuery = wishlistQuery.eq('session_id', sessionId)
  }

  const { data: wishlist } = await wishlistQuery.maybeSingle()
  if (!wishlist) return []

  const { data: items, error } = await supabase
    .from('wishlist_items')
    .select(`
      id,
      wishlist_id,
      variant_id,
      created_at,
      variant:product_variants (
        id,
        product_id,
        sku,
        color,
        size,
        stock,
        is_active,
        product:products (
          id,
          name,
          slug,
          mrp,
          selling_price,
          is_published,
          is_active,
          images:product_images (
            id,
            image_url,
            alt_text,
            sort_order
          )
        )
      )
    `)
    .eq('wishlist_id', wishlist.id)
    .order('created_at', { ascending: false })

  if (error || !items) return []
  const validItems = items
    .filter(
      (item: any) =>
        item.variant &&
        item.variant.product &&
        item.variant.product.is_published
    )
    .map((item: any) => {
      const prod = item.variant.product
      const parsedImages = ((prod.images || []) as any[])
        .map(parseProductImage)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

      return {
        ...item,
        variant: {
          ...item.variant,
          product: {
            ...prod,
            images: parsedImages,
          },
        },
      }
    })

  return validItems as unknown as WishlistItemWithDetails[]
}

export async function getWishlistSummary(
  userId?: string,
  sessionId?: string
): Promise<{ count: number; productIds: string[]; variantIds: string[] }> {
  if (!userId && !sessionId) return { count: 0, productIds: [], variantIds: [] }

  if (!isSupabaseConfigured()) {
    const wl = await getOrCreateWishlist(userId, sessionId)
    if (!wl) return { count: 0, productIds: [], variantIds: [] }
    const items = localWishlistItems.filter((i) => i.wishlist_id === wl.id)
    const variantIds = items.map((i) => i.variant_id)
    const productIds = Array.from(
      new Set(
        items.map((i) => {
          const cat = MOCK_VARIANT_CATALOG.find((c) => c.variantId === i.variant_id)
          return cat ? cat.productId : i.variant_id
        })
      )
    )
    return {
      count: items.length,
      productIds,
      variantIds,
    }
  }

  const supabase = await createServiceClient()

  let wishlistQuery = supabase.from('wishlists').select('id')
  if (userId) {
    wishlistQuery = wishlistQuery.eq('user_id', userId)
  } else if (sessionId) {
    wishlistQuery = wishlistQuery.eq('session_id', sessionId)
  }

  const { data: wishlist } = await wishlistQuery.maybeSingle()
  if (!wishlist) return { count: 0, productIds: [], variantIds: [] }

  const { data: items } = await supabase
    .from('wishlist_items')
    .select('variant_id, variant:product_variants(product_id)')
    .eq('wishlist_id', wishlist.id)

  if (!items || items.length === 0) {
    return { count: 0, productIds: [], variantIds: [] }
  }

  const variantIds = items.map((i: any) => i.variant_id).filter(Boolean)
  const productIds = Array.from(
    new Set(items.map((i: any) => i.variant?.product_id).filter(Boolean))
  )

  return {
    count: items.length,
    productIds,
    variantIds,
  }
}

export async function addToWishlist(
  identifier: string,
  userId?: string,
  sessionId?: string
) {
  const wishlist = await getOrCreateWishlist(userId, sessionId)
  if (!wishlist) return { error: 'Unable to initialize wishlist' }

  const { variantId, productId } = await resolveVariantId(identifier)
  if (!variantId) {
    return { error: 'Product or variant not found' }
  }

  if (!isSupabaseConfigured()) {
    const existing = localWishlistItems.filter((i) => i.wishlist_id === wishlist.id)
    const isDirectMatch = existing.some((i) => i.variant_id === variantId)
    if (isDirectMatch) {
      return { success: true, message: 'Already in wishlist', inWishlist: true }
    }
    if (productId) {
      const hasProduct = existing.some((i) => {
        const cat = MOCK_VARIANT_CATALOG.find((c) => c.variantId === i.variant_id)
        return cat?.productId === productId || i.variant_id === productId
      })
      if (hasProduct) {
        return { success: true, message: 'Product already in wishlist', inWishlist: true }
      }
    }
    const newItem: LocalWishlistItem = {
      id: 'wli_' + Math.random().toString(36).substring(2),
      wishlist_id: wishlist.id,
      variant_id: variantId,
      created_at: new Date().toISOString(),
    }
    localWishlistItems.push(newItem)
    return { success: true, data: newItem, inWishlist: true }
  }

  const supabase = await createServiceClient()

  // Check if this variant or any variant belonging to the same product is already wishlisted
  let existingQuery = supabase
    .from('wishlist_items')
    .select('id, variant_id')
    .eq('wishlist_id', wishlist.id)

  const { data: existingItems } = await existingQuery

  if (existingItems && existingItems.length > 0) {
    const isDirectMatch = existingItems.some((i) => i.variant_id === variantId)
    if (isDirectMatch) {
      return { success: true, message: 'Already in wishlist', inWishlist: true }
    }

    if (productId) {
      const { data: siblingVariants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', productId)

      const siblingIds = new Set((siblingVariants || []).map((v) => v.id))
      const hasSibling = existingItems.some((i) => siblingIds.has(i.variant_id))
      if (hasSibling) {
        return { success: true, message: 'Product already in wishlist', inWishlist: true }
      }
    }
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      wishlist_id: wishlist.id,
      variant_id: variantId,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, data, inWishlist: true }
}

export async function removeFromWishlist(
  identifier: string,
  userId?: string,
  sessionId?: string
) {
  const wishlist = await getOrCreateWishlist(userId, sessionId)
  if (!wishlist) return { success: true }

  const { variantId, productId } = await resolveVariantId(identifier)

  if (!isSupabaseConfigured()) {
    localWishlistItems = localWishlistItems.filter((i) => {
      if (i.wishlist_id !== wishlist.id) return true
      if (variantId && i.variant_id === variantId) return false
      if (productId) {
        const cat = MOCK_VARIANT_CATALOG.find((c) => c.variantId === i.variant_id)
        if (cat?.productId === productId || i.variant_id === productId) return false
      }
      return true
    })
    return { success: true, inWishlist: false }
  }

  const supabase = await createServiceClient()

  // 1. Try removing by variant_id directly
  if (variantId) {
    await supabase
      .from('wishlist_items')
      .delete()
      .eq('wishlist_id', wishlist.id)
      .eq('variant_id', variantId)
  }

  // 2. Also remove any variants for that product if productId is known
  if (productId) {
    const { data: productVariants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId)

    if (productVariants && productVariants.length > 0) {
      const variantIds = productVariants.map((v) => v.id)
      await supabase
        .from('wishlist_items')
        .delete()
        .eq('wishlist_id', wishlist.id)
        .in('variant_id', variantIds)
    }
  }

  return { success: true, inWishlist: false }
}

export async function toggleWishlistItem(
  identifier: string,
  userId?: string,
  sessionId?: string
): Promise<{ inWishlist: boolean; error?: string }> {
  const wishlist = await getOrCreateWishlist(userId, sessionId)
  if (!wishlist) return { inWishlist: false, error: 'Failed to access wishlist' }

  const { variantId, productId } = await resolveVariantId(identifier)
  if (!variantId) {
    return { inWishlist: false, error: 'Product variant not found' }
  }

  if (!isSupabaseConfigured()) {
    const existingIndex = localWishlistItems.findIndex((i) => {
      if (i.wishlist_id !== wishlist.id) return false
      if (i.variant_id === variantId) return true
      if (productId) {
        const cat = MOCK_VARIANT_CATALOG.find((c) => c.variantId === i.variant_id)
        return cat?.productId === productId || i.variant_id === productId
      }
      return false
    })

    if (existingIndex >= 0) {
      localWishlistItems.splice(existingIndex, 1)
      return { inWishlist: false }
    } else {
      localWishlistItems.push({
        id: 'wli_' + Math.random().toString(36).substring(2),
        wishlist_id: wishlist.id,
        variant_id: variantId,
        created_at: new Date().toISOString(),
      })
      return { inWishlist: true }
    }
  }

  const supabase = await createServiceClient()

  // Find if already in wishlist by variantId or productId
  const { data: existingItems } = await supabase
    .from('wishlist_items')
    .select('id, variant_id')
    .eq('wishlist_id', wishlist.id)

  let matchedExisting = existingItems?.find((i) => i.variant_id === variantId)

  if (!matchedExisting && productId && existingItems && existingItems.length > 0) {
    const { data: productVariants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId)

    const siblingIds = new Set((productVariants || []).map((v) => v.id))
    matchedExisting = existingItems.find((i) => siblingIds.has(i.variant_id))
  }

  if (matchedExisting) {
    await supabase.from('wishlist_items').delete().eq('id', matchedExisting.id)
    return { inWishlist: false }
  } else {
    const { error: insErr } = await supabase.from('wishlist_items').insert({
      wishlist_id: wishlist.id,
      variant_id: variantId,
    })
    if (insErr) {
      return { inWishlist: false, error: insErr.message }
    }
    return { inWishlist: true }
  }
}

/**
 * Merge guest wishlist into user wishlist after customer login
 */
export async function mergeGuestWishlistIntoUserWishlist(userId: string, sessionId: string) {
  if (!isSupabaseConfigured()) {
    const guestWl = localWishlists.find((w) => w.session_id === sessionId)
    if (!guestWl) return { success: true }
    let userWl = localWishlists.find((w) => w.user_id === userId)
    if (!userWl) {
      userWl = { id: 'wl_' + userId, user_id: userId, session_id: null }
      localWishlists.push(userWl)
    }

    const guestItems = localWishlistItems.filter((i) => i.wishlist_id === guestWl.id)
    for (const item of guestItems) {
      const exists = localWishlistItems.some(
        (i) => i.wishlist_id === userWl!.id && i.variant_id === item.variant_id
      )
      if (!exists) {
        localWishlistItems.push({
          id: 'wli_' + Math.random().toString(36).substring(2),
          wishlist_id: userWl.id,
          variant_id: item.variant_id,
          created_at: new Date().toISOString(),
        })
      }
    }
    localWishlistItems = localWishlistItems.filter((i) => i.wishlist_id !== guestWl.id)
    localWishlists = localWishlists.filter((w) => w.id !== guestWl.id)
    return { success: true }
  }

  const supabase = await createServiceClient()

  const { data: guestWishlist } = await supabase
    .from('wishlists')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (!guestWishlist) return { success: true }

  const { data: userWishlist } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const targetWishlistId = userWishlist
    ? userWishlist.id
    : (
        await supabase
          .from('wishlists')
          .insert({ user_id: userId })
          .select('id')
          .single()
      ).data?.id

  if (!targetWishlistId) return { error: 'Failed to find or create user wishlist' }

  const { data: guestItems } = await supabase
    .from('wishlist_items')
    .select('variant_id')
    .eq('wishlist_id', guestWishlist.id)

  if (guestItems && guestItems.length > 0) {
    for (const item of guestItems) {
      const { data: existing } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('wishlist_id', targetWishlistId)
        .eq('variant_id', item.variant_id)
        .maybeSingle()

      if (!existing) {
        await supabase.from('wishlist_items').insert({
          wishlist_id: targetWishlistId,
          variant_id: item.variant_id,
        })
      }
    }

    await supabase.from('wishlist_items').delete().eq('wishlist_id', guestWishlist.id)
    await supabase.from('wishlists').delete().eq('id', guestWishlist.id)
  }

  return { success: true }
}
