import { NextRequest, NextResponse } from 'next/server'
import { subscribeNewsletter, validateEmailAddress } from '@/lib/newsletter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email, source = 'storefront_footer' } = body

    if (!email || !validateEmailAddress(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    // Determine base site URL for confirmation links
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

    const result = await subscribeNewsletter({
      email,
      source,
      siteUrl,
    })

    if (!result.success) {
      if (result.rateLimited) {
        return NextResponse.json(
          { error: result.error || 'Please wait before requesting another confirmation email.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: result.error || 'Failed to process subscription. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        alreadyActive: result.alreadyActive || false,
        confirmationUrl: result.confirmationUrl,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Newsletter API route error:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected server error occurred.' },
      { status: 500 }
    )
  }
}
