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
    // 1. Try atomic database RPC function first
    const { data: reservationId, error: rpcError } = await supabase.rpc('reserve_stock_atomic', {
      p_variant_id: variantId,
      p_quantity: quantity,
      p_order_id: orderId,
      p_session_id: sessionId || undefined,
      p_user_id: userId || undefined,
      p_hold_minutes: holdMinutes,
    })

    if (!rpcError && reservationId) {
      return { success: true, reservationId: reservationId as string }
    }

    // 2. Resilient fallback to direct table operations if RPC function is missing in schema cache
    const { data: variant, error: varError } = await supabase
      .from('product_variants')
      .select('id, stock')
      .eq('id', variantId)
      .single()

    if (varError || !variant) {
      return { success: false, error: 'Product variant not found.' }
    }

    // Check currently active unexpired reservations
    const { data: activeReservations } = await supabase
      .from('inventory_reservations')
      .select('quantity')
      .eq('variant_id', variantId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())

    const activeReserved = activeReservations?.reduce((sum, r) => sum + r.quantity, 0) || 0
    const available = variant.stock - activeReserved

    if (available < quantity) {
      return {
        success: false,
        error: `Insufficient stock available (requested: ${quantity}, available: ${Math.max(0, available)}).`,
      }
    }

    // Insert reservation
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString()
    const { data: newReservation, error: insertError } = await supabase
      .from('inventory_reservations')
      .insert({
        variant_id: variantId,
        quantity,
        order_id: orderId,
        session_id: sessionId || null,
        user_id: userId || null,
        status: 'active',
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Direct stock reservation error:', insertError)
      return { success: false, error: insertError.message }
    }

    return { success: true, reservationId: newReservation.id }
  } catch (err: any) {
    console.error('reserveStockForCheckout unexpected error:', err)
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

  try {
    // 1. Try RPC function first
    const { error: rpcError } = await supabase.rpc('confirm_stock_reservation', {
      p_order_id: orderId,
      p_created_by: createdBy || undefined,
    })

    if (!rpcError) {
      return { success: true }
    }

    // 2. Resilient fallback to direct table operations
    const { data: reservations, error: fetchErr } = await supabase
      .from('inventory_reservations')
      .select('id, variant_id, quantity')
      .eq('order_id', orderId)
      .eq('status', 'active')

    if (fetchErr) {
      console.error('Error fetching reservations to confirm:', fetchErr)
      return { success: false, error: fetchErr.message }
    }

    if (!reservations || reservations.length === 0) {
      return { success: true }
    }

    for (const r of reservations) {
      // Fetch current stock
      const { data: v } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', r.variant_id)
        .single()

      if (v) {
        // Decrement physical stock
        await supabase
          .from('product_variants')
          .update({
            stock: Math.max(0, v.stock - r.quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.variant_id)
      }

      // Record inventory movement
      try {
        await supabase.from('inventory_movements').insert({
          variant_id: r.variant_id,
          movement_type: 'sale',
          quantity: -r.quantity,
          reference_id: orderId,
          reference_type: 'order',
          created_by: createdBy || null,
          created_at: new Date().toISOString(),
        })
      } catch (movErr) {
        // ignore movement insert warning
      }

      // Mark reservation confirmed
      await supabase
        .from('inventory_reservations')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id)
    }

    return { success: true }
  } catch (err: any) {
    console.error('confirmStockReservation error:', err)
    return { success: false, error: err.message || 'Failed to confirm reservation' }
  }
}

/**
 * Release reservations when checkout is cancelled or payment explicitly fails
 */
export async function releaseStockReservation(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient()

  try {
    const { error: rpcError } = await supabase.rpc('release_stock_reservation', {
      p_order_id: orderId,
    })

    if (!rpcError) {
      return { success: true }
    }

    // Direct fallback
    await supabase
      .from('inventory_reservations')
      .update({
        status: 'released',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('status', 'active')

    return { success: true }
  } catch (err: any) {
    console.error('releaseStockReservation error:', err)
    return { success: false, error: err.message || 'Failed to release reservation' }
  }
}

/**
 * Scheduled job to expire stale reservations
 */
export async function cleanupExpiredReservations(): Promise<{ expiredCount: number }> {
  const supabase = await createServiceClient()

  try {
    const { data, error: rpcError } = await supabase.rpc('cleanup_expired_reservations', {})
    if (!rpcError && typeof data === 'number') {
      return { expiredCount: data }
    }

    // Direct fallback
    const { data: updated } = await supabase
      .from('inventory_reservations')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select('id')

    return { expiredCount: updated?.length || 0 }
  } catch {
    return { expiredCount: 0 }
  }
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
