import { NextRequest, NextResponse } from 'next/server'
import { getOrderById, getOrRenewCashfreeSessionForOrder } from '@/lib/orders'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { reserveStockForCheckout, releaseStockReservation } from '@/lib/inventory'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order reference is required.' }, { status: 400 })
    }

    // 1. Fetch internal order
    const order = await getOrderById(order_id)
    if (!order) {
      return NextResponse.json({ error: `Order ${order_id} not found.` }, { status: 404 })
    }

    // 2. Ownership verification
    const currentUser = await getCurrentUser()
    if (order.user_id && currentUser && order.user_id !== currentUser.id) {
      const userIsAdmin = await isAdmin(currentUser.id)
      if (!userIsAdmin) {
        return NextResponse.json({ error: 'Unauthorized to retry payment for this order.' }, { status: 403 })
      }
    }

    // 3. Status check: Never retry an order that is already paid
    if (order.payment_status === 'paid' || order.payment_method === 'cod') {
      return NextResponse.json(
        { error: 'This order is already marked as paid or confirmed. Payment retry is not allowed.' },
        { status: 400 }
      )
    }

    // 4. Stock verification and reservation check before retrying
    if (isSupabaseConfigured() && order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const res = await reserveStockForCheckout(
          item.variant_id,
          item.quantity,
          order.id,
          undefined,
          order.user_id || undefined,
          15 // 15 minute hold
        )
        if (!res.success) {
          await releaseStockReservation(order.id)
          return NextResponse.json(
            { error: `Cannot retry payment: item "${item.product_name}" is currently out of stock.` },
            { status: 400 }
          )
        }
      }
    }

    // 5. Reuse active session or create replacement gateway order
    const sessionRes = await getOrRenewCashfreeSessionForOrder(order)
    if ('error' in sessionRes && sessionRes.error) {
      if (isSupabaseConfigured()) {
        await releaseStockReservation(order.id)
      }
      return NextResponse.json({ error: sessionRes.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      order_number: order.order_number,
      payment_session_id: sessionRes.payment_session_id,
      cf_mode: sessionRes.cf_mode || 'production',
      reused: Boolean((sessionRes as any).reused),
    })
  } catch (err: any) {
    console.error('Payment retry API error:', err)
    return NextResponse.json({ error: err.message || 'Failed to initiate payment retry.' }, { status: 500 })
  }
}
