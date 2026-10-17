import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { CampaignContent } from '@/lib/email-marketing/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { id } = await params
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const serviceClient = await createServiceClient()
    const { data: campaign, error } = await serviceClient
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true })
    }

    const serviceClient = await createServiceClient()
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.subject !== undefined) updates.subject = String(body.subject).trim()
    if (body.preheader !== undefined) updates.preheader = body.preheader ? String(body.preheader).trim() : null
    if (body.sender_name !== undefined) updates.sender_name = String(body.sender_name).trim()
    if (body.template_id !== undefined) updates.template_id = body.template_id
    if (body.audience_type !== undefined) updates.audience_type = body.audience_type
    if (body.status !== undefined) updates.status = body.status
    if (body.content !== undefined) {
      const rawContent = body.content || {}
      const content: CampaignContent = {
        heading: rawContent.heading,
        subheading: rawContent.subheading,
        body_text: rawContent.body_text,
        hero_image_url: rawContent.hero_image_url,
        hero_image_alt: rawContent.hero_image_alt,
        // Optional CTA Button: strictly boolean
        show_cta: Boolean(rawContent.show_cta),
        cta_text: rawContent.cta_text,
        cta_url: rawContent.cta_url,
        cta_style: rawContent.cta_style,
        secondary_blocks: Array.isArray(rawContent.secondary_blocks) ? rawContent.secondary_blocks : [],
      }
      updates.content = content as any
    }

    const { data: campaign, error } = await serviceClient
      .from('marketing_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ campaign })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { id } = await params
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true })
    }

    const serviceClient = await createServiceClient()
    const { error } = await serviceClient
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Audit log
    try {
      await serviceClient.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'DELETE_MARKETING_CAMPAIGN',
        entity: 'marketing_campaigns',
        entity_id: id,
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
