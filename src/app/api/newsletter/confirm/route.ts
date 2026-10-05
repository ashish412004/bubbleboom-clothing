import { NextRequest, NextResponse } from 'next/server'
import { confirmNewsletterSubscription } from '@/lib/newsletter'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const origin = request.headers.get('origin') || request.nextUrl.origin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (!token) {
    return NextResponse.redirect(new URL('/newsletter/confirm?status=invalid', siteUrl))
  }

  const result = await confirmNewsletterSubscription({ token, siteUrl })

  if (result.success) {
    const successUrl = new URL('/newsletter/confirm', siteUrl)
    successUrl.searchParams.set('status', 'success')
    if (result.email) {
      successUrl.searchParams.set('email', result.email)
    }
    return NextResponse.redirect(successUrl)
  }

  if (result.expired) {
    return NextResponse.redirect(new URL('/newsletter/confirm?status=expired', siteUrl))
  }

  return NextResponse.redirect(new URL('/newsletter/confirm?status=invalid', siteUrl))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token } = body
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

    if (!token) {
      return NextResponse.json({ error: 'Confirmation token is required.' }, { status: 400 })
    }

    const result = await confirmNewsletterSubscription({ token, siteUrl })

    if (!result.success) {
      const statusCode = result.expired ? 410 : 400
      return NextResponse.json(
        { error: result.error || 'Confirmation failed.', expired: result.expired || false },
        { status: statusCode }
      )
    }

    return NextResponse.json(
      { success: true, message: result.message, email: result.email },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Newsletter confirm API error:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during confirmation.' },
      { status: 500 }
    )
  }
}
