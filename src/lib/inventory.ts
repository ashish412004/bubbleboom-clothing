import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row']
export type InventoryReservation = Database['public']['Tables']['inventory_reservations']['Row']

export interface StockStatus {
  variant_id: string
  stock_on_hand: number
  reserved_quantity: number
  available_quantity: number
}

/**
 * Get comprehensive stock metrics for a variant
 */
export async function getVariantStockStatus(variantId: string): Promise<StockStatus | null> {
  const supabase = await createServerClient()

  const { data: variant, error: varError } = await supabase
    .from('product_variants')
    .select('id, stock')
    .eq('id', variantId)
    .single()

  if (varError || !variant) return null

  // Active unexpired reservations
  const { data: reservations } = await supabase
    .from('inventory_reservations')
    .select('quantity')
    .eq('variant_id', variantId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  const reserved = reservations?.reduce((sum, r) => sum + r.quantity, 0) || 0
  const available = Math.max(0, variant.stock - reserved)

  return {
    variant_id: variantId,
    stock_on_hand: variant.stock,
    reserved_quantity: reserved,
    available_quantity: available,
  }
}

/**
 * Atomically reserve stock for checkout. Prevents overselling during concurrent checkouts.
 */
export async function reserveStockForCheckout(
  variantId: string,
  quantity: number,
  orderId: string,
  sessionId?: string,
  userId?: string,
  holdMinutes: number = 15
): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  const supabase = await createServiceClient()

  try {
    const { data: reservationId, error } = await supabase.rpc('reserve_stock_atomic', {
      p_variant_id: variantId,
      p_quantity: quantity,
      p_order_id: orderId,
      p_session_id: sessionId || undefined,
      p_user_id: userId || undefined,
      p_hold_minutes: holdMinutes,
    })

    if (error) {
      console.error('Failed to reserve stock atomically:', error)
      return { success: false, error: error.message }
    }

    return { success: true, reservationId: reservationId as string }
  } catch (err: any) {
    return { success: false, error: err.message || 'Stock reservation failed' }
  }
}

/**
 * Confirm reservation upon payment capture and decrement physical stock
 */
export async function confirmStockReservation(
  orderId: string,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient()

  const { error } = await supabase.rpc('confirm_stock_reservation', {
    p_order_id: orderId,
    p_created_by: createdBy || undefined,
  })

  if (error) {
    console.error('Error confirming stock reservation:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Release reservations when checkout is cancelled or payment explicitly fails
 */
export async function releaseStockReservation(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient()

  const { error } = await supabase.rpc('release_stock_reservation', {
    p_order_id: orderId,
  })

  if (error) {
    console.error('Error releasing stock reservation:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Scheduled job to expire stale reservations
 */
export async function cleanupExpiredReservations(): Promise<{ expiredCount: number }> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('cleanup_expired_reservations', {})
  if (error) {
    console.error('Error cleaning up reservations:', error)
    return { expiredCount: 0 }
  }

  return { expiredCount: (data as number) || 0 }
}

/**
 * Legacy support / direct atomic inventory adjustments
 */
export async function reserveInventory(
  variantId: string,
  quantity: number,
  referenceId: string,
  referenceType: string,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient()

  const { error } = await supabase.rpc('reserve_inventory', {
    p_variant_id: variantId,
    p_quantity: quantity,
    p_reference_id: referenceId,
    p_reference_type: referenceType,
    p_created_by: createdBy,
  })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function releaseInventory(
  variantId: string,
  quantity: number,
  referenceId: string,
  referenceType: string,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient()

  const { error } = await supabase.rpc('release_inventory', {
    p_variant_id: variantId,
    p_quantity: quantity,
    p_reference_id: referenceId,
    p_reference_type: referenceType,
    p_created_by: createdBy,
  })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Manual inventory adjustment by admin with audit reason notes
 */
export async function adjustInventory(
  variantId: string,
  quantity: number,
  referenceId?: string,
  referenceType: string = 'adjustment',
  notes?: string,
  createdBy?: string
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  const supabase = await createServiceClient()

  // 1. Fetch current stock
  const { data: v, error: fetchErr } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('id', variantId)
    .single()

  if (fetchErr || !v) {
    return { success: false, error: 'Product variant not found.' }
  }

  const updatedStock = Math.max(0, v.stock + quantity)

  // 2. Update stock on variant
  const { error: updateErr } = await supabase
    .from('product_variants')
    .update({ stock: updatedStock, updated_at: new Date().toISOString() })
    .eq('id', variantId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // 3. Log movement
  await supabase.from('inventory_movements').insert({
    variant_id: variantId,
    movement_type: (referenceType as any) || 'adjustment',
    quantity,
    reference_id: referenceId || null,
    reference_type: referenceType || 'manual_adjustment',
    notes: notes || null,
    created_by: createdBy || null,
  })

  return { success: true, newStock: updatedStock }
}

export async function getInventoryMovements(
  variantId?: string,
  limit: number = 50
): Promise<InventoryMovement[]> {
  const supabase = await createServerClient()

  let query = supabase
    .from('inventory_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (variantId) {
    query = query.eq('variant_id', variantId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching inventory movements:', error)
    return []
  }

  return data || []
}

export async function getLowStockVariants(threshold: number = 5) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select(`
      id,
      sku,
      color,
      size,
      stock,
      product:products(id, name, slug)
    `)
    .lte('stock', threshold)
    .eq('is_active', true)
    .order('stock', { ascending: true })

  if (error) {
    console.error('Error fetching low stock variants:', error)
    return []
  }

  return data || []
}
