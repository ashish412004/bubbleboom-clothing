import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getSubscriberByEmail } from '@/lib/newsletter'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.email) {
      return NextResponse.json({
        authenticated: false,
        subscribed: false,
        status: null,
      })
    }

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
  } catch (err: any) {
    console.error('Newsletter status API error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
