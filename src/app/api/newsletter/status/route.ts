import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { getSubscriberByEmail } from '@/lib/newsletter'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (user && user.email) {
      const subscriber = await getSubscriberByEmail(user.email)

      if (!subscriber) {
        return NextResponse.json({
          authenticated: true,
          email: user.email,
          subscribed: false,
          status: null,
        })
      }

      return NextResponse.json({
        authenticated: true,
        email: user.email,
        subscribed: subscriber.status === 'active',
        status: subscriber.status,
      })
    }

    // Check verified cookie for guest visitors
    const cookieStore = await cookies()
    const verifiedCookie = cookieStore.get('bb_newsletter_verified')?.value
    if (verifiedCookie) {
      const email = decodeURIComponent(verifiedCookie)
      const subscriber = await getSubscriberByEmail(email)
      if (subscriber && subscriber.status === 'active') {
        return NextResponse.json({
          authenticated: false,
          verified: true,
          email,
          subscribed: true,
          status: 'active',
        })
      }
    }

    return NextResponse.json({
      authenticated: false,
      subscribed: false,
      status: null,
    })
  } catch (err: any) {
    console.error('Newsletter status API error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
