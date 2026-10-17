import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ subscribers: [] })
    }

    const serviceClient = await createServiceClient()
    const { data: subscribers, error } = await serviceClient
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ subscribers: subscribers || [] })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list subscribers' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const email = (body.email || '').trim().toLowerCase()
    const action = body.action || 'toggle'

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true })
    }

    const serviceClient = await createServiceClient()

    if (action === 'unsubscribe') {
      const now = new Date().toISOString()
      await serviceClient
        .from('newsletter_subscribers')
        .update({ is_active: false, unsubscribed_at: now })
        .eq('email', email)

      await serviceClient
        .from('profiles')
        .update({ marketing_consent: false, updated_at: now })
        .eq('email', email)

      return NextResponse.json({ success: true, message: `${email} unsubscribed.` })
    }

    if (action === 'subscribe') {
      const now = new Date().toISOString()
      await serviceClient
        .from('newsletter_subscribers')
        .upsert({
          email,
          is_active: true,
          source: 'admin_manual',
          subscribed_at: now,
          unsubscribed_at: null,
        }, { onConflict: 'email' })

      await serviceClient
        .from('profiles')
        .update({ marketing_consent: true, marketing_consent_at: now, updated_at: now })
        .eq('email', email)

      return NextResponse.json({ success: true, message: `${email} subscribed.` })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update subscriber' },
      { status: 500 }
    )
  }
}
