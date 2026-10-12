import { NextRequest, NextResponse } from 'next/server'
import { resendConfirmationEmail, validateEmailAddress, getProductionSiteUrl } from '@/lib/newsletter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body

    if (!email || !validateEmailAddress(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || request.nextUrl.origin
    const siteUrl = getProductionSiteUrl(origin)

    const result = await resendConfirmationEmail({
      email,
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
        { error: result.error || 'Failed to resend confirmation email.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: result.message },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Newsletter resend API error:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
