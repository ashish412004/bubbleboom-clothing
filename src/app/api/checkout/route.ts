import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { createOrder, createCashfreeSessionForOrder } from '@/lib/orders'
import { getCart, clearCart } from '@/lib/cart'
import { releaseStockReservation } from '@/lib/inventory'
import { sendOrderConfirmationEmail } from '@/lib/emails/resend'
import { queueOrderNotification, queueAdminNewOrderNotification } from '@/lib/emails/notifications'

export async function POST(request: NextRequest) {
  try {
    let sessionId: string | undefined
    let rawAuth: string | undefined

    try {
      const cookieStore = await cookies()
      sessionId = cookieStore.get('bb_session_id')?.value
      rawAuth = cookieStore.get('bb_auth_user')?.value
    } catch {
      sessionId = request.cookies?.get?.('bb_session_id')?.value
      rawAuth = request.cookies?.get?.('bb_auth_user')?.value
    }

    // Auth check
    let userId: string | undefined = undefined
    if (rawAuth) {
      try {
        const u = JSON.parse(rawAuth)
        userId = u.id
      } catch {
        // ignore
      }
    }

    if (!userId && isSupabaseConfigured()) {
      try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch {
        // Unauthenticated
      }
    }

    // MANDATORY AUTHENTICATION: Guest checkout is strictly prohibited
    if (!userId) {
      return NextResponse.json(
        { error: 'Customer authentication is mandatory. Please sign in to complete your order.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      full_name,
      email,
      phone,
      address_line1,
      address_line2,
      landmark,
      city,
      state,
      pin_code,
      payment_method = 'cashfree',
      coupon_code,
      notes,
      is_buy_now,
      buy_now_variant_id,
      buy_now_quantity,
    } = body

    if (!full_name || !email || !phone || !address_line1 || !city || !state || !pin_code) {
      return NextResponse.json(
        { error: 'Please provide all required shipping and contact details.' },
        { status: 400 }
      )
    }

    // MANDATORY MOBILE NUMBER NORMALIZATION & VALIDATION (10 DIGITS, STARTS 6-9)
    const rawDigits = (phone || '').replace(/\D/g, '')
    let normalizedPhone = rawDigits
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
      normalizedPhone = normalizedPhone.slice(2)
    } else if (normalizedPhone.startsWith('0') && normalizedPhone.length === 11) {
      normalizedPhone = normalizedPhone.slice(1)
    }

    if (!normalizedPhone || normalizedPhone.length !== 10 || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'A valid 10-digit Indian mobile number is mandatory (starts with 6-9).' },
        { status: 400 }
      )
    }

    let orderCartItems: Array<{ variant_id: string; quantity: number }> = []

    if (is_buy_now) {
      if (!buy_now_variant_id) {
        return NextResponse.json(
          { error: 'Invalid Buy It Now variant selection.' },
          { status: 400 }
        )
      }
      const qty = Math.max(1, parseInt(String(buy_now_quantity || '1'), 10) || 1)
      orderCartItems = [{ variant_id: buy_now_variant_id, quantity: qty }]
    } else {
      // 1. Fetch current cart items
      const cartItems = await getCart(userId, sessionId)
      if (!cartItems || cartItems.length === 0) {
        return NextResponse.json(
          { error: 'Your shopping cart is empty. Please add items before checking out.' },
          { status: 400 }
        )
      }

      orderCartItems = cartItems.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
      }))
    }

    // 2. Server creates authoritative order and atomically reserves inventory
    const orderRes = await createOrder({
      user_id: userId,
      guest_email: email,
      guest_phone: normalizedPhone,
      shipping_address: {
        full_name,
        phone: normalizedPhone,
        address_line1,
        address_line2: address_line2 || null,
        landmark: landmark || null,
        city,
        state,
        pin_code,
        country: 'India',
      },
      payment_method,
      coupon_code: coupon_code || undefined,
      cart_items: orderCartItems,
      notes,
    })

    if ('error' in orderRes && orderRes.error) {
      return NextResponse.json({ error: orderRes.error }, { status: 400 })
    }

    const order = orderRes.data!

    // 3. Handle payment method
    if (payment_method === 'cashfree') {
      const cfSessionRes = await createCashfreeSessionForOrder(order)
      if ('error' in cfSessionRes && cfSessionRes.error) {
        // Rollback / release stock and mark internal order cancelled
        try {
          if (isSupabaseConfigured()) {
            const supabase = await createServiceClient()
            await releaseStockReservation(order.id)
            await supabase
              .from('orders')
              .update({
                status: 'cancelled',
                cancellation_reason: `Payment gateway initiation failed: ${cfSessionRes.error}`,
              })
              .eq('id', order.id)
          }
        } catch (cleanupErr) {
          console.error('Failed to cleanup after Cashfree initiation failure:', cleanupErr)
        }

        return NextResponse.json(
          { error: `Payment gateway error: ${cfSessionRes.error}` },
          { status: 500 }
        )
      }

      if (!cfSessionRes.payment_session_id) {
        return NextResponse.json(
          { error: 'Payment gateway did not provide a valid payment session ID.' },
          { status: 500 }
        )
      }

      // Order & Cashfree session created successfully! Clear cart only if this is NOT a Buy It Now flow
      if (!is_buy_now) {
        await clearCart(userId, sessionId)
      }

      const response = NextResponse.json({
        order_number: order.order_number,
        payment_session_id: cfSessionRes.payment_session_id,
        payment_method: 'cashfree',
        cf_mode: cfSessionRes.cf_mode || 'production',
      })
      if (!is_buy_now) {
        response.cookies.delete('bb_cart')
      }
      return response
    } else {
      // Cash on Delivery
      if (!is_buy_now) {
        await clearCart(userId, sessionId)
      }

      // Format notification items with absolute image URLs
      const notificationItems = ((order as any).order_items || []).map((it: any) => ({
        product_name: it.product_name || 'Bubble Boom Apparel',
        size: it.variant_info?.size || it.size || null,
        color: it.variant_info?.color || it.color || null,
        quantity: it.quantity || 1,
        price: it.selling_price || it.price || 0,
        total_amount: it.total_amount || (it.price ? it.price * (it.quantity || 1) : 0),
        image_url: it.image_url || it.variant_info?.image_url || null,
      }))

      // In Vercel serverless functions, background promises must be awaited
      // before returning a response, otherwise execution is frozen.
      // We run them concurrently with safe fallback so order creation is never aborted.
      try {
        await Promise.allSettled([
          // 1. Customer order_placed email via Outbox
          queueOrderNotification(
            {
              order_id: order.id,
              order_number: order.order_number,
              event: 'order_placed',
              recipient_email: email,
              customer_name: full_name,
              total_amount: order.total_amount,
              subtotal: (order as any).subtotal_amount || order.total_amount,
              shipping_amount: order.shipping_amount,
              discount_amount: order.coupon_discount,
              payment_method: 'cod',
              payment_status: 'pending',
              items: notificationItems,
              shipping_address: order.shipping_address as any,
            },
            { immediate: true }
          ),

          // 2. Immediate Admin notification to bubbleboomstore2026@gmail.com
          queueAdminNewOrderNotification(
            {
              ...order,
              customer_name: full_name,
              customer_email: email,
              customer_phone: phone,
              order_items: notificationItems,
            },
            { immediate: true }
          ),

          // 3. Fallback direct confirmation email
          sendOrderConfirmationEmail({
            email,
            orderId: order.order_number,
            customerName: full_name,
            totalAmount: order.total_amount,
            items: (order as any).order_items || [],
            shippingAddress: order.shipping_address,
          }),
        ])
      } catch (notifyErr) {
        console.warn('[checkout] Non-fatal notification error during COD order placement:', notifyErr)
      }

      const response = NextResponse.json({
        order_number: order.order_number,
        payment_method: 'cod',
        redirect_url: `/payment-return?order_id=${order.order_number}&method=cod`,
      })
      if (!is_buy_now) {
        response.cookies.delete('bb_cart')
      }
      return response
    }
  } catch (err: any) {
    console.error('Checkout API error:', err)
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 })
  }
}
