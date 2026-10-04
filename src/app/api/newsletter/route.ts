import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, source = 'storefront_footer' } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          email: email.trim().toLowerCase(),
          consent_given: true,
          source,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('Newsletter subscription error:', error)
      return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 })
    }

    return NextResponse.json(
      { message: 'Welcome to Bubble Boom! You are now subscribed to exclusive drops.' },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
