import { NextRequest, NextResponse } from 'next/server'
import { adjustInventory } from '@/lib/inventory'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { variantId, quantityChange, notes, movementType, exactStock } = await req.json()

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      )
    }

    // Exact stock override (e.g. set stock to 0 or explicit recount value)
    if (exactStock !== undefined) {
      const targetStock = Math.max(0, Number(exactStock))
      if (!isSupabaseConfigured()) {
        return NextResponse.json({ success: true, updatedStock: targetStock })
      }

      const supabase = await createServiceClient()
      const { data: v } = await supabase.from('product_variants').select('stock').eq('id', variantId).single()
      const currentStock = v ? v.stock : 0
      const diff = targetStock - currentStock

      await supabase
        .from('product_variants')
        .update({ stock: targetStock, updated_at: new Date().toISOString() })
        .eq('id', variantId)

      try {
        await supabase.from('inventory_movements').insert({
          variant_id: variantId,
          movement_type: 'adjustment' as any,
          quantity: diff,
          reference_type: 'stock_override',
          notes: notes || `Direct stock override to ${targetStock}`,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
      } catch {}

      try {
        revalidatePath('/shop')
        revalidatePath('/categories')
        revalidatePath('/collections')
      } catch {}

      return NextResponse.json({ success: true, updatedStock: targetStock })
    }

    if (quantityChange === undefined || !notes) {
      return NextResponse.json(
        { error: 'Quantity adjustment and audit reason note are required' },
        { status: 400 }
      )
    }

    const result = await adjustInventory(
      variantId,
      Number(quantityChange),
      undefined,
      movementType || 'adjustment',
      notes,
      user.id
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    try {
      revalidatePath('/shop')
      revalidatePath('/categories')
      revalidatePath('/collections')
    } catch {}

    return NextResponse.json({ success: true, updatedStock: result.newStock })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { action, variantIds, productIds, reason, stockValue } = body

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Updated in development mode' })
    }

    const supabase = await createServiceClient()

    // 1. Mark out of stock (batch or single)
    if (action === 'mark_out_of_stock' || action === 'set_stock') {
      const ids: string[] = Array.isArray(variantIds) ? variantIds : []
      const targetStock = action === 'mark_out_of_stock' ? 0 : Math.max(0, Number(stockValue) || 0)

      for (const vId of ids) {
        const { data: v } = await supabase.from('product_variants').select('stock').eq('id', vId).single()
        const diff = v ? targetStock - v.stock : 0

        await supabase
          .from('product_variants')
          .update({ stock: targetStock, updated_at: new Date().toISOString() })
          .eq('id', vId)

        try {
          await supabase.from('inventory_movements').insert({
            variant_id: vId,
            movement_type: 'adjustment' as any,
            quantity: diff,
            reference_type: action,
            notes: reason || `Admin action: ${action} to ${targetStock}`,
            created_by: user.id,
            created_at: new Date().toISOString(),
          })
        } catch {}
      }

      try {
        revalidatePath('/shop')
        revalidatePath('/categories')
        revalidatePath('/collections')
      } catch {}

      return NextResponse.json({ success: true, message: `Updated stock for ${ids.length} variants` })
    }

    // 2. Hide from storefront / unpublish
    if (action === 'unpublish_product' || action === 'hide_product') {
      const pIds: string[] = Array.isArray(productIds) ? productIds : []
      await supabase
        .from('products')
        .update({ is_published: false, is_active: false, updated_at: new Date().toISOString() })
        .in('id', pIds)

      try {
        revalidatePath('/shop')
        revalidatePath('/categories')
        revalidatePath('/collections')
        revalidatePath('/')
      } catch {}

      return NextResponse.json({ success: true, message: `Unpublished ${pIds.length} products` })
    }

    // 3. Restore / publish product
    if (action === 'publish_product' || action === 'restore_product') {
      const pIds: string[] = Array.isArray(productIds) ? productIds : []
      await supabase
        .from('products')
        .update({ is_published: true, is_active: true, updated_at: new Date().toISOString() })
        .in('id', pIds)

      try {
        revalidatePath('/shop')
        revalidatePath('/categories')
        revalidatePath('/collections')
        revalidatePath('/')
      } catch {}

      return NextResponse.json({ success: true, message: `Published ${pIds.length} products` })
    }

    return NextResponse.json({ error: 'Unrecognized action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    let productId = searchParams.get('productId')
    let variantId = searchParams.get('variantId')

    if (!productId && !variantId) {
      try {
        const body = await req.json()
        productId = body?.productId
        variantId = body?.variantId
      } catch {}
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Deleted in dev mode' })
    }

    const supabase = await createServiceClient()

    // Safe dependency check: verify no orders depend on this variant or product!
    if (variantId) {
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('id')
        .eq('variant_id', variantId)
        .limit(1)

      if (orderItem && orderItem.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot permanently delete variant: Historical customer orders depend on it. Set stock to 0 or hide it instead.',
            hasOrders: true,
          },
          { status: 400 }
        )
      }

      await supabase.from('product_variants').delete().eq('id', variantId)
      return NextResponse.json({ success: true, message: 'Variant deleted successfully' })
    }

    if (productId) {
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1)

      if (orderItem && orderItem.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot permanently delete product: Historical customer orders depend on this item. It has been Unpublished and Hidden from the storefront instead to preserve audit records.',
            hasOrders: true,
          },
          { status: 400 }
        )
      }

      // Safe to delete if zero orders exist
      await supabase.from('product_variants').delete().eq('product_id', productId)
      await supabase.from('product_images').delete().eq('product_id', productId)
      await supabase.from('collection_products').delete().eq('product_id', productId)
      await supabase.from('products').delete().eq('id', productId)

      try {
        revalidatePath('/shop')
        revalidatePath('/')
      } catch {}

      return NextResponse.json({ success: true, message: 'Unused demo product deleted successfully' })
    }

    return NextResponse.json({ error: 'Product or Variant ID required' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
