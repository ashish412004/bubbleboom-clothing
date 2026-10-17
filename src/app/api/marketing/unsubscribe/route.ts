import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    let email = ''
    try {
      const body = await req.json()
      email = body.email || ''
    } catch {
      // ignore
    }

    if (!email) {
      const url = new URL(req.url)
      email = url.searchParams.get('email') || ''
    }

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 })
    }

    if (isSupabaseConfigured()) {
      const serviceClient = await createServiceClient()
      const now = new Date().toISOString()

      // Update profiles
      try {
        await serviceClient
          .from('profiles')
          .update({
            marketing_consent: false,
            marketing_consent_at: null,
            updated_at: now,
          })
          .ilike('email', cleanEmail)
      } catch (err) {
        console.warn('[Unsubscribe] Failed to update profiles:', err)
      }

      // Update newsletter_subscribers
      try {
        await serviceClient
          .from('newsletter_subscribers')
          .update({
            is_active: false,
            unsubscribed_at: now,
          })
          .ilike('email', cleanEmail)
      } catch (err) {
        console.warn('[Unsubscribe] Failed to update newsletter_subscribers:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${cleanEmail} has been successfully unsubscribed from Bubble Boom marketing communications.`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process unsubscribe request.' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
