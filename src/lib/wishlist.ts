import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

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
    product: {
      id: string
      name: string
      slug: string
      mrp: number
      selling_price: number
      is_published: boolean
      images: Array<{
        image_url: string
        alt_text: string | null
      }>
    }
  }
}

export async function getOrCreateWishlist(userId?: string, sessionId?: string) {
  const supabase = await createServerClient()
  if (!userId && !sessionId) return null

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

export async function getWishlist(
  userId?: string,
  sessionId?: string
): Promise<WishlistItemWithDetails[]> {
  const supabase = await createServerClient()
  if (!userId && !sessionId) return []

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
        product:products (
          id,
          name,
          slug,
          mrp,
          selling_price,
          is_published,
          images:product_images (
            image_url,
            alt_text
          )
        )
      )
    `)
    .eq('wishlist_id', wishlist.id)
    .order('created_at', { ascending: false })

  if (error || !items) return []
  const validItems = items.filter(
    (item: any) =>
      item.variant &&
      item.variant.product &&
      item.variant.product.is_published &&
      item.variant.product.is_active !== false
  )
  return validItems as unknown as WishlistItemWithDetails[]
}

export async function addToWishlist(
  variantId: string,
  userId?: string,
  sessionId?: string
) {
  const supabase = await createServerClient()
  const wishlist = await getOrCreateWishlist(userId, sessionId)
  if (!wishlist) return { error: 'Unable to initialize wishlist' }

  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('wishlist_id', wishlist.id)
    .eq('variant_id', variantId)
    .maybeSingle()

  if (existing) {
    return { success: true, message: 'Already in wishlist' }
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
  return { success: true, data }
}

export async function removeFromWishlist(
  variantId: string,
  userId?: string,
  sessionId?: string
) {
  const supabase = await createServerClient()
  const wishlist = await getOrCreateWishlist(userId, sessionId)
  if (!wishlist) return { success: true }

  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('wishlist_id', wishlist.id)
    .eq('variant_id', variantId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function toggleWishlistItem(
  variantId: string,
  userId?: string,
  sessionId?: string
): Promise<{ inWishlist: boolean; error?: string }> {
  const supabase = await createServerClient()
  const wishlist = await getOrCreateWishlist(userId, sessionId)
  if (!wishlist) return { inWishlist: false, error: 'Failed to access wishlist' }

  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('wishlist_id', wishlist.id)
    .eq('variant_id', variantId)
    .maybeSingle()

  if (existing) {
    await supabase.from('wishlist_items').delete().eq('id', existing.id)
    return { inWishlist: false }
  } else {
    await supabase.from('wishlist_items').insert({
      wishlist_id: wishlist.id,
      variant_id: variantId,
    })
    return { inWishlist: true }
  }
}

/**
 * Merge guest wishlist into user wishlist after customer login
 */
export async function mergeGuestWishlistIntoUserWishlist(userId: string, sessionId: string) {
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
