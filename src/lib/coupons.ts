import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export type Coupon = Database['public']['Tables']['coupons']['Row']
export type CouponInsert = Database['public']['Tables']['coupons']['Insert']
export type CouponUpdate = Database['public']['Tables']['coupons']['Update']

export interface CouponValidationResult {
  valid: boolean
  coupon?: Coupon
  discount_paise?: number
  error?: string
}

/**
 * Pure calculation logic for coupon discount in paise
 */
export function calculateCouponDiscount(
  coupon: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    maximum_discount?: number | null
    minimum_amount?: number
  },
  subtotalPaise: number
): { valid: boolean; discount_paise: number; error?: string } {
  const minPaise = (coupon.minimum_amount || 0) * 100
  if (subtotalPaise < minPaise) {
    return {
      valid: false,
      discount_paise: 0,
      error: `Minimum order amount of ₹${coupon.minimum_amount} required to use this coupon`,
    }
  }

  let discount_paise = 0
  if (coupon.discount_type === 'percentage') {
    discount_paise = Math.round(subtotalPaise * (coupon.discount_value / 100))
    if (coupon.maximum_discount !== undefined && coupon.maximum_discount !== null) {
      const maxPaise = coupon.maximum_discount * 100
      discount_paise = Math.min(discount_paise, maxPaise)
    }
  } else if (coupon.discount_type === 'fixed') {
    discount_paise = coupon.discount_value * 100
    discount_paise = Math.min(discount_paise, subtotalPaise)
  }

  return { valid: true, discount_paise }
}


/**
 * Validate coupon code and calculate discount in paise based on subtotal in paise.
 */
export async function validateCoupon(
  code: string,
  userId?: string,
  subtotalPaise?: number,
  productIds: string[] = [],
  collectionIds: string[] = [],
  customerEmail?: string,
  customerPhone?: string
): Promise<CouponValidationResult> {
  const supabase = await createServerClient()

  if (!code || !code.trim()) {
    return { valid: false, error: 'Please enter a coupon code' }
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()

  if (error || !coupon) {
    return { valid: false, error: 'Invalid or non-existent coupon code' }
  }

  // 1. Active check
  if (!coupon.is_active) {
    return { valid: false, error: 'This coupon code is currently disabled' }
  }

  const now = new Date()

  // 2. Start date check
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    return { valid: false, error: 'This coupon code is not yet active' }
  }

  // 3. Expiry date check
  if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
    return { valid: false, error: 'This coupon code has expired' }
  }

  // 4. Overall usage limit
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, error: 'This coupon has reached its maximum global usage limit' }
  }

  // 5. Minimum order spend in paise
  const minPaise = (coupon.minimum_amount || 0) * 100
  if (subtotalPaise !== undefined && subtotalPaise < minPaise) {
    return {
      valid: false,
      error: `Minimum order amount of ₹${coupon.minimum_amount} required to use this coupon`,
    }
  }

  // 6. Per-customer limit
  if (coupon.per_customer_limit !== null && coupon.per_customer_limit !== undefined) {
    let userCount = 0
    if (userId) {
      const { count, error: usageErr } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)

      if (!usageErr && typeof count === 'number') {
        userCount = count
      }
    } else if (customerEmail || customerPhone) {
      if (customerEmail) {
        const { count: emailCount, error: emailErr } = await supabase
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_email', customerEmail.toLowerCase().trim())
        if (!emailErr && typeof emailCount === 'number') {
          userCount = Math.max(userCount, emailCount)
        }
      }
      if (customerPhone) {
        const { count: phoneCount, error: phoneErr } = await supabase
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_phone', customerPhone.trim())
        if (!phoneErr && typeof phoneCount === 'number') {
          userCount = Math.max(userCount, phoneCount)
        }
      }
    }

    if (userCount >= coupon.per_customer_limit) {
      return {
        valid: false,
        error: `You have reached the maximum allowed uses (${coupon.per_customer_limit}) for this coupon`,
      }
    }
  }

  // 7. Applicable products/collections restriction (if specified)
  if (coupon.applicable_products && coupon.applicable_products.length > 0) {
    const hasEligibleProduct = productIds.some((pId) => coupon.applicable_products.includes(pId))
    if (!hasEligibleProduct) {
      return { valid: false, error: 'This coupon is not applicable to any items in your cart' }
    }
  }

  // 8. Calculate discount in paise
  let discount_paise = 0
  const currentSubtotal = subtotalPaise || 0

  if (coupon.discount_type === 'percentage') {
    discount_paise = Math.round(currentSubtotal * (coupon.discount_value / 100))
    if (coupon.maximum_discount !== null && coupon.maximum_discount !== undefined) {
      const maxPaise = coupon.maximum_discount * 100
      discount_paise = Math.min(discount_paise, maxPaise)
    }
  } else if (coupon.discount_type === 'fixed') {
    discount_paise = coupon.discount_value * 100 // Convert ₹ fixed value to paise
    if (coupon.maximum_discount !== null && coupon.maximum_discount !== undefined) {
      const maxPaise = coupon.maximum_discount * 100
      discount_paise = Math.min(discount_paise, maxPaise)
    }
    discount_paise = Math.min(discount_paise, currentSubtotal)
  }

  return {
    valid: true,
    coupon,
    discount_paise,
  }
}

/**
 * Record coupon usage when order is paid/placed.
 * Protected against duplicate execution (idempotent).
 */
export async function recordCouponUsage(
  couponId: string,
  userId: string | null | undefined,
  orderId: string,
  discountPaise: number,
  customerEmail?: string | null,
  customerPhone?: string | null
) {
  if (!isSupabaseConfigured()) return
  const supabase = await createServiceClient()

  try {
    // Idempotency check: don't double count if this order has already recorded coupon usage!
    const { data: existing } = await supabase
      .from('coupon_usage')
      .select('id')
      .eq('order_id', orderId)
      .eq('coupon_id', couponId)
      .maybeSingle()

    if (existing) {
      return // Already recorded for this order!
    }

    // Increment usage count atomically
    try {
      await supabase.rpc('increment_coupon_usage', { p_coupon_id: couponId })
    } catch {
      const { data: c } = await supabase.from('coupons').select('usage_count').eq('id', couponId).single()
      if (c) {
        await supabase.from('coupons').update({ usage_count: (c.usage_count || 0) + 1 }).eq('id', couponId)
      }
    }

    // Insert redemption record safely
    const isValidUuid = userId && userId !== 'guest' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    const usagePayload: Record<string, any> = {
      coupon_id: couponId,
      order_id: orderId,
      discount_amount: Math.round(discountPaise / 100),
    }
    if (isValidUuid) {
      usagePayload.user_id = userId
    }
    if (customerEmail) {
      usagePayload.customer_email = customerEmail.toLowerCase().trim()
    }
    if (customerPhone) {
      usagePayload.customer_phone = customerPhone.trim()
    }

    const { error: insErr } = await supabase.from('coupon_usage').insert(usagePayload)
    if (insErr) {
      if (!isValidUuid) {
        console.warn('[recordCouponUsage] Guest redemption notice:', insErr.message)
      } else {
        console.warn('[recordCouponUsage] Redemption record warning:', insErr.message)
      }
    }
  } catch (err) {
    console.warn('[recordCouponUsage] Warning recording coupon usage:', err)
  }
}

/**
 * Rollback coupon usage when an order is cancelled before dispatch.
 */
export async function rollbackCouponUsage(orderId: string) {
  if (!isSupabaseConfigured()) return
  try {
    const supabase = await createServiceClient()
    const { data: usages } = await supabase
      .from('coupon_usage')
      .select('id, coupon_id')
      .eq('order_id', orderId)

    if (usages && usages.length > 0) {
      for (const u of usages) {
        // Decrement usage count
        const { data: c } = await supabase.from('coupons').select('usage_count').eq('id', u.coupon_id).single()
        if (c && c.usage_count > 0) {
          await supabase.from('coupons').update({ usage_count: Math.max(0, c.usage_count - 1) }).eq('id', u.coupon_id)
        }
        // Delete redemption record
        await supabase.from('coupon_usage').delete().eq('id', u.id)
      }
    } else {
      // Fallback if coupon_usage didn't store a row but order has coupon_id
      const { data: ord } = await supabase.from('orders').select('coupon_id').eq('id', orderId).maybeSingle()
      if (ord && ord.coupon_id) {
        const { data: c } = await supabase.from('coupons').select('usage_count').eq('id', ord.coupon_id).single()
        if (c && c.usage_count > 0) {
          await supabase.from('coupons').update({ usage_count: Math.max(0, c.usage_count - 1) }).eq('id', ord.coupon_id)
        }
      }
    }
  } catch (err) {
    console.warn('[rollbackCouponUsage] Error rolling back coupon usage:', err)
  }
}

// Admin coupon management
export async function getCoupons() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function createCoupon(coupon: CouponInsert) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('coupons')
    .insert(coupon)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateCoupon(id: string, coupon: CouponUpdate) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('coupons')
    .update({ ...coupon, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}
