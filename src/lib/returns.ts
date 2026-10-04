import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { getStoreSettings, StoreOrderSettings } from '@/lib/settings'
import { adjustInventory } from '@/lib/inventory'
import { createCashfreeRefund } from '@/lib/payments/cashfree'

export type Return = Database['public']['Tables']['returns']['Row']
export type ReturnItem = Database['public']['Tables']['return_items']['Row']
export type Refund = Database['public']['Tables']['refunds']['Row']

export interface CreateReturnRequestInput {
  order_id: string
  user_id: string
  order_item_id: string
  quantity: number
  reason: string
  notes?: string
  images?: string[]
}

/**
 * Check if an order is within the allowed return window
 */
export async function isOrderEligibleForReturn(orderId: string): Promise<{ eligible: boolean; reason?: string }> {
  const supabase = await createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select('status, updated_at, created_at')
    .eq('id', orderId)
    .single()

  if (!order) return { eligible: false, reason: 'Order not found' }
  if (order.status !== 'delivered') {
    return { eligible: false, reason: 'Returns are only permitted for delivered orders.' }
  }

  const orderSettings = await getStoreSettings<StoreOrderSettings>('orders')
  const returnWindowDays = orderSettings.return_window_days || 7

  const deliveredDate = new Date(order.updated_at)
  const windowEnd = new Date(deliveredDate.getTime() + returnWindowDays * 24 * 60 * 60 * 1000)

  if (new Date() > windowEnd) {
    return {
      eligible: false,
      reason: `Return window of ${returnWindowDays} days from delivery has passed.`,
    }
  }

  return { eligible: true }
}

export async function createReturnRequest(input: CreateReturnRequestInput) {
  const eligibility = await isOrderEligibleForReturn(input.order_id)
  if (!eligibility.eligible) {
    return { error: eligibility.reason }
  }

  const supabase = await createServiceClient()

  // Get order item with prices
  const { data: orderItem } = await supabase
    .from('order_items')
    .select('*')
    .eq('id', input.order_item_id)
    .single()

  if (!orderItem) return { error: 'Order line item not found' }

  if (input.quantity > orderItem.quantity) {
    return { error: 'Requested return quantity exceeds purchased quantity' }
  }

  // Calculate refund amount
  const itemUnitPrice = Math.round(orderItem.total_amount / orderItem.quantity)
  const refundAmount = itemUnitPrice * input.quantity

  // Create return record
  const { data: returnRecord, error: retErr } = await supabase
    .from('returns')
    .insert({
      order_id: input.order_id,
      user_id: input.user_id,
      status: 'requested',
      reason: input.reason,
      notes: input.notes || null,
      images: input.images || [],
      refund_amount: refundAmount,
      refund_status: 'pending',
    })
    .select()
    .single()

  if (retErr || !returnRecord) {
    return { error: retErr?.message || 'Failed to create return record' }
  }

  // Create return item record
  await supabase.from('return_items').insert({
    return_id: returnRecord.id,
    order_item_id: input.order_item_id,
    quantity: input.quantity,
    reason: input.reason,
  })

  // Update order status to return_requested
  await supabase.from('orders').update({ status: 'return_requested' }).eq('id', input.order_id)

  return { data: returnRecord }
}

/**
 * Admin action: Process return inspection and restock decision
 */
export async function processReturnInspection(
  returnId: string,
  decision: 'approved' | 'rejected',
  restockDecision: boolean,
  adminNotes?: string,
  adminUserId?: string
) {
  const supabase = await createServiceClient()

  const { data: returnRecord } = await supabase
    .from('returns')
    .select('*, order:orders(*)')
    .eq('id', returnId)
    .single()

  if (!returnRecord) return { error: 'Return record not found' }

  const newStatus = decision === 'approved' ? 'received' : 'rejected'

  await supabase
    .from('returns')
    .update({
      status: newStatus,
      notes: adminNotes || returnRecord.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', returnId)

  // If approved and restock decision is true, explicitly restock items
  if (decision === 'approved' && restockDecision) {
    const { data: items } = await supabase
      .from('return_items')
      .select('*, order_item:order_items(variant_id)')
      .eq('return_id', returnId)

    if (items) {
      for (const item of items) {
        const variantId = (item as any).order_item?.variant_id
        if (variantId) {
          await adjustInventory(
            variantId,
            item.quantity,
            returnId,
            'return_restock',
            'Restocked after inspected return approval',
            adminUserId
          )
        }
      }
    }
  }

  return { success: true }
}

/**
 * Process refund (Cashfree online or separate manual COD refund workflow)
 */
export async function executeRefund(
  orderId: string,
  returnId: string | null,
  amountPaise: number,
  reason: string,
  adminUserId?: string
) {
  const supabase = await createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, payments(*)')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'Order not found' }

  // Check cumulative refunds do not exceed captured amount
  const { data: existingRefunds } = await supabase
    .from('refunds')
    .select('amount_paise, status')
    .eq('order_id', orderId)
    .in('status', ['successful', 'processing', 'pending'])

  const totalRefundedPaise =
    existingRefunds?.reduce((sum, r) => sum + r.amount_paise, 0) || 0

  const orderTotalPaise = order.total_amount * 100
  if (totalRefundedPaise + amountPaise > orderTotalPaise) {
    return {
      error: `Total refunds cannot exceed captured order amount of ₹${order.total_amount}. Already refunded/processing: ₹${(
        totalRefundedPaise / 100
      ).toFixed(2)}.`,
    }
  }

  const isCashfree = order.payment_method === 'cashfree'

  if (isCashfree) {
    // Online Cashfree refund
    const refundId = `REF_${Date.now()}`
    const cfRes = await createCashfreeRefund({
      order_id: order.order_number,
      refund_id: refundId,
      refund_amount: amountPaise / 100, // Cashfree expects Rupees
      refund_note: reason,
    })

    const refundStatus = 'error' in cfRes ? 'failed' : 'processing'

    const { data: refundRecord, error: refErr } = await supabase
      .from('refunds')
      .insert({
        order_id: orderId,
        return_id: returnId,
        cashfree_refund_id: refundId,
        amount_paise: amountPaise,
        refund_type: 'cashfree',
        status: refundStatus,
        reason,
        notes: 'error' in cfRes ? cfRes.error : undefined,
      })
      .select()
      .single()

    if ('error' in cfRes) {
      return { error: cfRes.error }
    }

    return { data: refundRecord }
  } else {
    // Restricted COD manual refund workflow
    const { data: refundRecord, error: refErr } = await supabase
      .from('refunds')
      .insert({
        order_id: orderId,
        return_id: returnId,
        amount_paise: amountPaise,
        refund_type: 'cod_manual',
        status: 'manual_review',
        reason,
        notes: 'COD refund recorded for manual customer bank transfer / UPI payout',
      })
      .select()
      .single()

    if (refErr) return { error: refErr.message }
    return { data: refundRecord }
  }
}
