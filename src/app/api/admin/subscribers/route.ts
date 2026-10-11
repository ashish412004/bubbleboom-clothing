import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getNewsletterSubscribersAdmin, SubscriberStatus } from '@/lib/newsletter'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const allowedAdminEmail = (process.env.ADMIN_EMAIL || 'hhshukla241099@gmail.com').toLowerCase().trim()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 })
    }

    const userEmail = (user.email || '').toLowerCase().trim()
    const userIsAdmin = await isAdmin(user.id)

    if (!userIsAdmin || userEmail !== allowedAdminEmail) {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required.' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const statusParam = (searchParams.get('status') || 'all') as 'all' | SubscriberStatus
    const searchParam = searchParams.get('search') || ''
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getNewsletterSubscribersAdmin({
      status: ['all', 'active', 'pending', 'unsubscribed'].includes(statusParam)
        ? statusParam
        : 'all',
      search: searchParam,
      limit: Math.min(Math.max(limitParam, 1), 100),
      offset: Math.max(offsetParam, 0),
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    console.error('Admin subscribers API error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const allowedAdminEmail = (process.env.ADMIN_EMAIL || 'hhshukla241099@gmail.com').toLowerCase().trim()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 })
    }

    const userEmail = (user.email || '').toLowerCase().trim()
    const userIsAdmin = await isAdmin(user.id)

    if (!userIsAdmin || userEmail !== allowedAdminEmail) {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { action, subscriberId } = body
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

    if (action === 'RESEND_CONFIRMATION') {
      const { resendConfirmationEmailAdmin } = await import('@/lib/newsletter')
      const result = await resendConfirmationEmailAdmin({ subscriberId, siteUrl })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to resend confirmation email.' }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: result.message }, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid admin subscriber action.' }, { status: 400 })
  } catch (err: any) {
    console.error('Admin subscriber POST action error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

