import { NextRequest, NextResponse } from 'next/server'
import { confirmNewsletterSubscription, getProductionSiteUrl } from '@/lib/newsletter'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const origin = request.headers.get('origin') || request.nextUrl.origin
  const siteUrl = getProductionSiteUrl(origin)

  if (!token) {
    return NextResponse.redirect(new URL('/newsletter/confirm?status=invalid', siteUrl))
  }

  // Scanner safe: redirect to interactive landing page with token preserved
  // Do NOT consume token on GET request
  const confirmPageUrl = new URL('/newsletter/confirm', siteUrl)
  confirmPageUrl.searchParams.set('token', token)
  return NextResponse.redirect(confirmPageUrl)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token } = body
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const siteUrl = getProductionSiteUrl(origin)

    if (!token) {
      return NextResponse.json({ error: 'Confirmation token is required.' }, { status: 400 })
    }

    const result = await confirmNewsletterSubscription({ token, siteUrl })

    if (!result.success) {
      const statusCode = result.expired ? 410 : 400
      return NextResponse.json(
        {
          error: result.error || 'Confirmation failed.',
          expired: result.expired || false,
          alreadyActive: result.alreadyActive || false,
        },
        { status: statusCode }
      )
    }

    const response = NextResponse.json(
      { success: true, message: result.message, email: result.email },
      { status: 200 }
    )

    if (result.email) {
      // Set 1-year verified newsletter cookie
      response.cookies.set('bb_newsletter_verified', encodeURIComponent(result.email), {
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }

    return response
  } catch (err: any) {
    console.error('Newsletter confirm API error:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during confirmation.' },
      { status: 500 }
    )
  }
}
