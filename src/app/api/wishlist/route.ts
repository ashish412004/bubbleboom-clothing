import { NextRequest, NextResponse } from 'next/server'
import {
  getWishlist,
  getWishlistSummary,
  toggleWishlistItem,
  removeFromWishlist,
  addToWishlist,
} from '@/lib/wishlist'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'

async function getSessionIdentifiers() {
  const cookieStore = await cookies()
  let sessionId =
    cookieStore.get('bb_session_id')?.value ||
    cookieStore.get('bubbleboom_guest_session')?.value

  let isNewSession = false
  if (!sessionId) {
    sessionId = `bb_sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    isNewSession = true
  }

  const user = await getCurrentUser()
  return { userId: user?.id, sessionId, isNewSession }
}

function applySessionCookie(response: NextResponse, sessionId: string, isNew: boolean) {
  if (isNew) {
    response.cookies.set('bb_session_id', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    response.cookies.set('bubbleboom_guest_session', sessionId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
}

export async function GET() {
  try {
    const { userId, sessionId, isNewSession } = await getSessionIdentifiers()
    const items = await getWishlist(userId, sessionId)

    const count = items.length
    const variantIds = items.map((i) => i.variant_id)
    const productIds = Array.from(
      new Set(
        items
          .map((i) => (i.variant as any)?.product_id || (i.variant as any)?.product?.id)
          .filter(Boolean)
      )
    )

    const response = NextResponse.json({
      success: true,
      items,
      count,
      productIds,
      variantIds,
    })

    applySessionCookie(response, sessionId, isNewSession)
    return response
  } catch (error: any) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, isNewSession } = await getSessionIdentifiers()
    const body = await req.json()
    const identifier = body.variantId || body.variant_id || body.productId || body.product_id

    if (!identifier) {
      return NextResponse.json(
        { error: 'variantId or productId is required' },
        { status: 400 }
      )
    }

    const action = body.action || 'toggle' // 'toggle' | 'add'
    let result: any

    if (action === 'add') {
      result = await addToWishlist(identifier, userId, sessionId)
    } else {
      result = await toggleWishlistItem(identifier, userId, sessionId)
    }

    const summary = await getWishlistSummary(userId, sessionId)

    const response = NextResponse.json({
      success: true,
      ...result,
      count: summary.count,
      productIds: summary.productIds,
      variantIds: summary.variantIds,
    })

    applySessionCookie(response, sessionId, isNewSession)
    return response
  } catch (error: any) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, sessionId, isNewSession } = await getSessionIdentifiers()
    const { searchParams } = new URL(req.url)
    const identifier =
      searchParams.get('variantId') ||
      searchParams.get('variant_id') ||
      searchParams.get('productId') ||
      searchParams.get('product_id')

    if (!identifier) {
      return NextResponse.json(
        { error: 'variantId or productId is required' },
        { status: 400 }
      )
    }

    const result = await removeFromWishlist(identifier, userId, sessionId)
    const summary = await getWishlistSummary(userId, sessionId)

    const response = NextResponse.json({
      ...result,
      count: summary.count,
      productIds: summary.productIds,
      variantIds: summary.variantIds,
    })

    applySessionCookie(response, sessionId, isNewSession)
    return response
  } catch (error: any) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

