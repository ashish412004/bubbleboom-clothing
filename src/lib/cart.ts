import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { getStoreSettings, StoreShippingSettings } from '@/lib/settings'
import { MOCK_PRODUCTS } from '@/lib/mock-data'
import { cookies } from 'next/headers'

export interface CartItemWithDetails {
  id: string
  cart_id: string
  variant_id: string
  quantity: number
  variant: {
    id: string
    product_id: string
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
        image_url: string
        alt_text: string | null
      }>
    }
  }
}

export interface CartSummary {
  items: CartItemWithDetails[]
  subtotal_paise: number
  discount_paise: number
  shipping_paise: number
  cod_fee_paise: number
  total_paise: number
  free_shipping_threshold_paise: number
  free_shipping_remaining_paise: number
  coupon_code: string | null
  coupon_discount_paise: number
}

export interface LocalCartEntry {
  id: string
  variant_id: string
  quantity: number
}

export function findMockVariantWithProduct(variantId: string) {
  for (const product of MOCK_PRODUCTS) {
    const variant = product.variants?.find((v: any) => v.id === variantId)
    if (variant) {
      return { variant, product }
    }
  }
  return null
}

async function getLocalCartFromCookie(): Promise<LocalCartEntry[]> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('bb_cart')?.value
    if (!raw) return []
    try {
      return JSON.parse(decodeURIComponent(raw))
    } catch {
      return JSON.parse(raw)
    }
  } catch {
    return []
  }
}

async function setLocalCartCookie(cart: LocalCartEntry[]) {
  try {
    const cookieStore = await cookies()
    cookieStore.set('bb_cart', JSON.stringify(cart), {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    })
  } catch {
    // Handled in Route Handler via response.cookies if server component
  }
}

export async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (!isSupabaseConfigured()) {
    return { id: 'local_cart', user_id: userId || null, session_id: sessionId || null }
  }

  const supabase = await createServerClient()
  if (!userId && !sessionId) return null

  let query = supabase.from('carts').select('*')
  if (userId) {
    query = query.eq('user_id', userId)
  } else if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data: existingCart } = await query.maybeSingle()
  if (existingCart) return existingCart

  const insertPayload = {
    user_id: userId || null,
    session_id: sessionId || null,
  }
  const { data: newCart, error } = await supabase
    .from('carts')
    .insert(insertPayload)
    .select()
    .single()

  if (error || !newCart) {
    console.error('Error creating cart:', error)
    return null
  }
  return newCart
}

export async function getCart(userId?: string, sessionId?: string): Promise<CartItemWithDetails[]> {
  if (!isSupabaseConfigured()) {
    const localEntries = await getLocalCartFromCookie()
    const items: CartItemWithDetails[] = []

    for (const entry of localEntries) {
      const match = findMockVariantWithProduct(entry.variant_id)
      if (match) {
        items.push({
          id: entry.id,
          cart_id: 'local_cart',
          variant_id: entry.variant_id,
          quantity: entry.quantity,
          variant: {
            id: match.variant.id,
            product_id: match.product.id,
            sku: match.variant.sku,
            color: match.variant.color,
            size: match.variant.size,
            stock: match.variant.stock,
            is_active: match.variant.is_active,
            product: {
              id: match.product.id,
              name: match.product.name,
              slug: match.product.slug,
              mrp: match.product.mrp,
              selling_price: match.product.selling_price,
              is_published: match.product.is_published,
              is_active: match.product.is_active,
              images: match.product.images || [],
            },
          },
        })
      }
    }
    return items
  }

  const supabase = await createServerClient()
  if (!userId && !sessionId) return []

  let cartQuery = supabase.from('carts').select('id')
  if (userId) {
    cartQuery = cartQuery.eq('user_id', userId)
  } else if (sessionId) {
    cartQuery = cartQuery.eq('session_id', sessionId)
  }

  const { data: cart } = await cartQuery.maybeSingle()
  if (!cart) return []

  const { data: items, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      cart_id,
      variant_id,
      quantity,
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
            image_url,
            alt_text
          )
        )
      )
    `)
    .eq('cart_id', cart.id)

  if (error || !items) {
    console.error('Error fetching cart items:', error)
    return []
  }

  const validItems = items.filter(
    (item: any) =>
      item.variant &&
      item.variant.product &&
      item.variant.product.is_active &&
      item.variant.is_active
  )

  return validItems as unknown as CartItemWithDetails[]
}

export async function addToCart(
  variantId: string,
  quantity: number,
  userId?: string,
  sessionId?: string
) {
  if (!isSupabaseConfigured()) {
    const match = findMockVariantWithProduct(variantId)
    if (!match) {
      return { error: 'Variant not found' }
    }

    if (!match.product.is_published || !match.product.is_active || !match.variant.is_active) {
      return { error: 'Product is currently not available' }
    }

    const currentCart = await getLocalCartFromCookie()
    const existingIndex = currentCart.findIndex((i) => i.variant_id === variantId)
    const currentQty = existingIndex >= 0 ? currentCart[existingIndex].quantity : 0
    const newQty = currentQty + quantity

    if (newQty > match.variant.stock) {
      return {
        error: `Only ${match.variant.stock} item(s) available in stock.`,
        available_stock: match.variant.stock,
      }
    }

    let updatedCart: LocalCartEntry[]
    let itemId = `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    if (existingIndex >= 0) {
      updatedCart = currentCart.map((i, idx) =>
        idx === existingIndex ? { ...i, quantity: newQty } : i
      )
      itemId = currentCart[existingIndex].id
    } else {
      updatedCart = [...currentCart, { id: itemId, variant_id: variantId, quantity: newQty }]
    }

    await setLocalCartCookie(updatedCart)
    return {
      data: { id: itemId, variant_id: variantId, quantity: newQty },
      cartCookieValue: JSON.stringify(updatedCart),
    }
  }

  const supabase = await createServerClient()
  const cart = await getOrCreateCart(userId, sessionId)
  if (!cart) return { error: 'Unable to initialize cart' }

  // Check variant stock and product publication
  const { data: variant, error: varError } = await supabase
    .from('product_variants')
    .select('*, product:products(*)')
    .eq('id', variantId)
    .single()

  if (varError || !variant) {
    return { error: 'Variant not found' }
  }

  const product = (variant as any).product
  if (!product.is_published || !product.is_active || !variant.is_active) {
    return { error: 'Product is currently not available' }
  }

  // Check existing item in cart
  const { data: existingItem } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .eq('variant_id', variantId)
    .maybeSingle()

  const currentQty = existingItem ? existingItem.quantity : 0
  const requestedTotalQty = currentQty + quantity

  if (requestedTotalQty > variant.stock) {
    return { 
      error: `Only ${variant.stock} item(s) available in stock.`,
      available_stock: variant.stock 
    }
  }

  if (existingItem) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({
        quantity: requestedTotalQty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingItem.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { data }
  } else {
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        variant_id: variantId,
        quantity,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { data }
  }
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
) {
  if (!isSupabaseConfigured()) {
    if (quantity <= 0) {
      return removeCartItem(itemId)
    }

    const currentCart = await getLocalCartFromCookie()
    const target = currentCart.find((i) => i.id === itemId)
    if (target) {
      const match = findMockVariantWithProduct(target.variant_id)
      if (match && quantity > match.variant.stock) {
        return {
          error: `Only ${match.variant.stock} item(s) available in stock.`,
        }
      }
    }

    const updatedCart = currentCart.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    await setLocalCartCookie(updatedCart)
    return {
      data: { id: itemId, quantity },
      cartCookieValue: JSON.stringify(updatedCart),
    }
  }

  const supabase = await createServerClient()

  if (quantity <= 0) {
    return removeCartItem(itemId)
  }

  // Check stock
  const { data: item } = await supabase
    .from('cart_items')
    .select('variant_id, variant:product_variants(stock)')
    .eq('id', itemId)
    .single()

  if (item && (item as any).variant && quantity > (item as any).variant.stock) {
    return {
      error: `Only ${(item as any).variant.stock} item(s) available in stock.`,
    }
  }

  const { data, error } = await supabase
    .from('cart_items')
    .update({
      quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function removeCartItem(itemId: string) {
  if (!isSupabaseConfigured()) {
    const currentCart = await getLocalCartFromCookie()
    const updatedCart = currentCart.filter((i) => i.id !== itemId)
    await setLocalCartCookie(updatedCart)
    return {
      success: true,
      cartCookieValue: JSON.stringify(updatedCart),
    }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function clearCart(userId?: string, sessionId?: string) {
  if (!isSupabaseConfigured()) {
    await setLocalCartCookie([])
    try {
      const cookieStore = await cookies()
      cookieStore.delete('bb_cart')
    } catch {}
    return { success: true, cartCookieValue: '[]' }
  }

  const supabase = await createServerClient()
  let cartQuery = supabase.from('carts').select('id')
  if (userId) {
    cartQuery = cartQuery.eq('user_id', userId)
  } else if (sessionId) {
    cartQuery = cartQuery.eq('session_id', sessionId)
  }

  const { data: cart } = await cartQuery.maybeSingle()
  if (!cart) return { success: true }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cart.id)

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * Merge guest cart into user cart after customer signs in.
 * Prevents duplicates by summing quantities up to available stock.
 */
export async function mergeGuestCartIntoUserCart(userId: string, sessionId: string) {
  if (!isSupabaseConfigured()) return { success: true }

  const supabase = await createServiceClient()

  const { data: guestCart } = await supabase
    .from('carts')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (!guestCart) return { success: true }

  const { data: userCart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const targetCartId = userCart
    ? userCart.id
    : (
        await supabase
          .from('carts')
          .insert({ user_id: userId })
          .select('id')
          .single()
      ).data?.id

  if (!targetCartId) return { error: 'Failed to find or create user cart' }

  const { data: guestItems } = await supabase
    .from('cart_items')
    .select('*, variant:product_variants(stock)')
    .eq('cart_id', guestCart.id)

  if (guestItems && guestItems.length > 0) {
    for (const item of guestItems) {
      const { data: existingUserItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', targetCartId)
        .eq('variant_id', item.variant_id)
        .maybeSingle()

      const maxStock = (item as any).variant?.stock ?? 999
      if (existingUserItem) {
        const mergedQty = Math.min(maxStock, existingUserItem.quantity + item.quantity)
        await supabase
          .from('cart_items')
          .update({ quantity: mergedQty, updated_at: new Date().toISOString() })
          .eq('id', existingUserItem.id)
      } else {
        const initialQty = Math.min(maxStock, item.quantity)
        await supabase
          .from('cart_items')
          .insert({
            cart_id: targetCartId,
            variant_id: item.variant_id,
            quantity: initialQty,
          })
      }
    }

    // Delete guest cart items and guest cart
    await supabase.from('cart_items').delete().eq('cart_id', guestCart.id)
    await supabase.from('carts').delete().eq('id', guestCart.id)
  }

  return { success: true }
}

/**
 * Pure synchronous cart calculation helper for tests & offline math
 */
export function calculateCartTotals(
  items: Array<{ quantity: number; variant?: { product?: { selling_price: number } } }>,
  couponDiscountPaise: number = 0,
  isCod: boolean = false,
  shippingSettings = {
    free_shipping_threshold_paise: 149900,
    standard_shipping_paise: 9900,
    cod_fee_paise: 5000,
    cod_enabled: true,
  }
) {
  const subtotal_paise = items.reduce((sum, item) => {
    const price = item.variant?.product?.selling_price || 0
    return sum + Math.round(price * 100) * item.quantity
  }, 0)

  const freeThreshold = shippingSettings.free_shipping_threshold_paise
  const shipping_paise =
    subtotal_paise >= freeThreshold || items.length === 0
      ? 0
      : shippingSettings.standard_shipping_paise

  const cod_fee_paise =
    isCod && shippingSettings.cod_enabled ? shippingSettings.cod_fee_paise : 0

  const discount_paise = Math.min(subtotal_paise, couponDiscountPaise)
  const total_paise = Math.max(0, subtotal_paise - discount_paise + shipping_paise + cod_fee_paise)

  return {
    subtotal_paise,
    discount_paise,
    shipping_paise,
    cod_fee_paise,
    total_paise,
  }
}

/**
 * Authoritative server calculation of cart summary with paise precision.
 */
export async function calculateCartSummary(
  items: CartItemWithDetails[],
  couponDiscountPaise: number = 0,
  couponCode: string | null = null,
  isCod: boolean = false
): Promise<CartSummary> {
  const shippingSettings = await getStoreSettings<StoreShippingSettings>('shipping')

  // Selling price is in Rupees in DB or paise. We keep internally in paise (₹1 = 100 paise)
  const subtotal_paise = items.reduce((sum, item) => {
    // selling_price in DB is in Rupees (e.g. 1499), convert to paise
    const priceInPaise = Math.round(item.variant.product.selling_price * 100)
    return sum + priceInPaise * item.quantity
  }, 0)

  const freeThreshold = shippingSettings.free_shipping_threshold_paise
  const shipping_paise =
    subtotal_paise >= freeThreshold || items.length === 0
      ? 0
      : shippingSettings.standard_shipping_paise

  const cod_fee_paise =
    isCod && shippingSettings.cod_enabled ? shippingSettings.cod_fee_paise : 0

  const discount_paise = Math.min(subtotal_paise, couponDiscountPaise)
  const total_paise = Math.max(0, subtotal_paise - discount_paise + shipping_paise + cod_fee_paise)
  const free_shipping_remaining_paise = Math.max(0, freeThreshold - subtotal_paise)

  return {
    items,
    subtotal_paise,
    discount_paise,
    shipping_paise,
    cod_fee_paise,
    total_paise,
    free_shipping_threshold_paise: freeThreshold,
    free_shipping_remaining_paise,
    coupon_code: couponCode,
    coupon_discount_paise: discount_paise,
  }
}
