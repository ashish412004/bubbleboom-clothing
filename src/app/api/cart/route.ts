import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  calculateCartSummary,
} from '@/lib/cart'
import { createServerClient } from '@supabase/ssr'

async function getAuthAndSession() {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('bb_session_id')?.value

  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }

  // Check auth user
  let userId: string | undefined = undefined
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {
    // Guest mode
  }

  return { userId, sessionId, cookieStore }
}

export async function GET() {
  try {
    const { userId, sessionId, cookieStore } = await getAuthAndSession()
    const items = await getCart(userId, sessionId)
    const summary = await calculateCartSummary(items)

    const response = NextResponse.json({ items, summary })
    if (!cookieStore.get('bb_session_id')) {
      response.cookies.set('bb_session_id', sessionId, {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { variant_id, quantity = 1 } = await request.json()
    if (!variant_id) {
      return NextResponse.json({ error: 'Variant ID is required' }, { status: 400 })
    }

    const { userId, sessionId, cookieStore } = await getAuthAndSession()
    const result = await addToCart(variant_id, quantity, userId, sessionId)

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const response = NextResponse.json(result)
    if (!cookieStore.get('bb_session_id')) {
      response.cookies.set('bb_session_id', sessionId, {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { item_id, quantity } = await request.json()
    if (!item_id || quantity === undefined) {
      return NextResponse.json({ error: 'Item ID and quantity required' }, { status: 400 })
    }

    const result = await updateCartItemQuantity(item_id, quantity)
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')

    if (itemId) {
      const result = await removeCartItem(itemId)
      return NextResponse.json(result)
    }

    const { userId, sessionId } = await getAuthAndSession()
    const result = await clearCart(userId, sessionId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
