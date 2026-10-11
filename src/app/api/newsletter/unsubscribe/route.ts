import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  unsubscribeNewsletter,
  unsubscribeByEmail,
  getSubscriberByEmail,
  requestUnsubscribeEmail,
} from '@/lib/newsletter'

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
    const { token, email, requestLink } = body
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

    // Case 1: Unsubscribe with token (from email link or verified action)
    if (token) {
      const result = await unsubscribeNewsletter({ token })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to unsubscribe.' }, { status: 400 })
      }

      return NextResponse.json(
        { success: true, message: result.message, email: result.email },
        { status: 200 }
      )
    }

    // Case 2: Guest requested an email link
    if (requestLink && email) {
      const result = await requestUnsubscribeEmail({ email, siteUrl })
      return NextResponse.json(result, { status: 200 })
    }

    // Case 3: Authenticated user direct unsubscribe
    const user = await getCurrentUser()
    if (user && user.email) {
      // If email was passed, ensure it matches current user's email
      if (email && email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: 'Forbidden: You can only unsubscribe your own registered email.' },
          { status: 403 }
        )
      }

      const subscriber = await getSubscriberByEmail(user.email)
      if (!subscriber) {
        return NextResponse.json(
          { success: true, message: 'You are not currently subscribed.', status: 'unsubscribed' },
          { status: 200 }
        )
      }

      if (!subscriber.unsubscribe_token) {
        const result = await unsubscribeByEmail(user.email)
        if (!result.success) {
          return NextResponse.json({ error: result.error || 'Failed to unsubscribe.' }, { status: 400 })
        }
        return NextResponse.json(
          { success: true, message: 'You have been unsubscribed from the newsletter.', email: user.email },
          { status: 200 }
        )
      }

      const result = await unsubscribeNewsletter({ token: subscriber.unsubscribe_token })
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to unsubscribe.' }, { status: 400 })
      }

      return NextResponse.json(
        { success: true, message: 'You have been unsubscribed from the newsletter.', email: user.email },
        { status: 200 }
      )
    }

    // Guest without token or user session
    if (email) {
      // Safely send verification link rather than blindly unsubscribing someone else's email
      const result = await requestUnsubscribeEmail({ email, siteUrl })
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json({ error: 'Unsubscribe token or email is required.' }, { status: 400 })
  } catch (err: any) {
    console.error('Newsletter unsubscribe API error:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during unsubscribe.' },
      { status: 500 }
    )
  }
}

