import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeNewsletter } from '@/lib/newsletter'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const origin = request.headers.get('origin') || request.nextUrl.origin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (!token) {
    return NextResponse.redirect(new URL('/newsletter/unsubscribe?status=invalid', siteUrl))
  }

  const result = await unsubscribeNewsletter({ token })

  if (result.success) {
    const successUrl = new URL('/newsletter/unsubscribe', siteUrl)
    successUrl.searchParams.set('status', 'success')
    if (result.email) {
      successUrl.searchParams.set('email', result.email)
    }
    return NextResponse.redirect(successUrl)
  }

  return NextResponse.redirect(new URL('/newsletter/unsubscribe?status=invalid', siteUrl))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Unsubscribe token is required.' }, { status: 400 })
    }

    const result = await unsubscribeNewsletter({ token })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to unsubscribe.' }, { status: 400 })
    }

    return NextResponse.json(
      { success: true, message: result.message, email: result.email },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Newsletter unsubscribe API error:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during unsubscribe.' },
      { status: 500 }
    )
  }
}
