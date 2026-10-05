import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getOrderById } from '@/lib/orders'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { isSupabaseConfigured, createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getOrCreateCart } from '@/lib/cart'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('bb_session_id')?.value

    let userId: string | undefined = undefined
    const rawAuth = cookieStore.get('bb_auth_user')?.value
    if (rawAuth) {
      try {
        const u = JSON.parse(rawAuth)
        userId = u.id
      } catch {}
    }

    if (!userId && isSupabaseConfigured()) {
      try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch {}
    }

    const body = await request.json()
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order reference required.' }, { status: 400 })
    }

    // 1. Fetch order
    const order = await getOrderById(order_id)
    if (!order) {
      return NextResponse.json({ error: `Order ${order_id} not found.` }, { status: 404 })
    }

    // 2. Ownership verification
    const currentUser = await getCurrentUser()
    if (order.user_id && currentUser && order.user_id !== currentUser.id) {
      const userIsAdmin = await isAdmin(currentUser.id)
      if (!userIsAdmin) {
        return NextResponse.json({ error: 'Unauthorized to restore items for this order.' }, { status: 403 })
      }
    }

    const orderItems = (order.order_items as any[]) || []
    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'No items found in this order.' }, { status: 400 })
    }

    // 3. Local cookie cart reconciliation
    const rawCookieCart = cookieStore.get('bb_cart')?.value
    let localCart: Array<{ id: string; variant_id: string; quantity: number }> = []
    if (rawCookieCart) {
      try {
        localCart = JSON.parse(decodeURIComponent(rawCookieCart))
      } catch {
        try {
          localCart = JSON.parse(rawCookieCart)
        } catch {}
      }
    }

    // Reconcile items without duplicating
    for (const item of orderItems) {
      const existingIdx = localCart.findIndex((c) => c.variant_id === item.variant_id)
      if (existingIdx >= 0) {
        localCart[existingIdx].quantity = Math.max(localCart[existingIdx].quantity, item.quantity)
      } else {
        localCart.push({
          id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })
      }
    }

    // 4. Supabase DB cart reconciliation (if configured)
    if (isSupabaseConfigured() && (userId || sessionId)) {
      try {
        const supabase = await createServiceClient()
        const cart = await getOrCreateCart(userId, sessionId)
        if (cart) {
          const { data: existingCartItems } = await supabase
            .from('cart_items')
            .select('*')
            .eq('cart_id', cart.id)

          for (const item of orderItems) {
            const match = existingCartItems?.find((c: any) => c.variant_id === item.variant_id)
            if (match) {
              const reconciledQty = Math.max(match.quantity, item.quantity)
              await supabase
                .from('cart_items')
                .update({
                  quantity: reconciledQty,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', match.id)
            } else {
              await supabase.from('cart_items').insert({
                cart_id: cart.id,
                variant_id: item.variant_id,
                quantity: item.quantity,
              })
            }
          }
        }
      } catch (dbCartErr) {
        console.warn('[restore-order] DB cart reconcile warning:', dbCartErr)
      }
    }

    const totalCount = localCart.reduce((sum, item) => sum + item.quantity, 0)
    const response = NextResponse.json({
      success: true,
      message: 'Order items restored to cart without duplicating quantities.',
      count: totalCount,
    })

    response.cookies.set('bb_cart', JSON.stringify(localCart), {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    })

    return response
  } catch (err: any) {
    console.error('Restore order cart error:', err)
    return NextResponse.json({ error: err.message || 'Failed to restore cart.' }, { status: 500 })
  }
}
