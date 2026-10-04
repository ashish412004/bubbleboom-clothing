import { NextRequest, NextResponse } from 'next/server'
import { getWishlist, toggleWishlistItem, removeFromWishlist } from '@/lib/wishlist'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'

async function getSessionIdentifiers() {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('bubbleboom_guest_session')?.value
  const user = await getCurrentUser()

  return { userId: user?.id, sessionId }
}

export async function GET() {
  try {
    const { userId, sessionId } = await getSessionIdentifiers()
    const items = await getWishlist(userId, sessionId)
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId } = await getSessionIdentifiers()
    const { variantId } = await req.json()

    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 })
    }

    const result = await toggleWishlistItem(variantId, userId, sessionId)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, sessionId } = await getSessionIdentifiers()
    const { searchParams } = new URL(req.url)
    const variantId = searchParams.get('variantId')

    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 })
    }

    const result = await removeFromWishlist(variantId, userId, sessionId)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
