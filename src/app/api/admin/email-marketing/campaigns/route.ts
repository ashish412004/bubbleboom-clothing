import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { CAMPAIGN_PRESET_TEMPLATES } from '@/lib/email-marketing/templates'
import { CampaignContent, CampaignAudienceType, CampaignTemplateId } from '@/lib/email-marketing/types'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ campaigns: [] })
    }

    const serviceClient = await createServiceClient()
    const { data: campaigns, error } = await serviceClient
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (err: any) {
    console.error('[API Campaigns List] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to list campaigns' },
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
    const name = (body.name || '').trim()
    const subject = (body.subject || '').trim()
    const preheader = body.preheader ? String(body.preheader).trim() : null
    const senderName = body.sender_name ? String(body.sender_name).trim() : 'Bubble Boom'
    const templateId = (body.template_id || 'drop_soon') as CampaignTemplateId
    const audienceType = (body.audience_type || 'all_opted_in') as CampaignAudienceType
    const status = body.status || 'draft'

    if (!name) {
      return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 })
    }
    if (!subject) {
      return NextResponse.json({ error: 'Email subject line is required.' }, { status: 400 })
    }

    // Default or provided content
    const preset = CAMPAIGN_PRESET_TEMPLATES[templateId] || CAMPAIGN_PRESET_TEMPLATES.drop_soon
    const rawContent = body.content || {}
    const content: CampaignContent = {
      heading: rawContent.heading !== undefined ? rawContent.heading : preset.defaultContent.heading,
      subheading: rawContent.subheading !== undefined ? rawContent.subheading : preset.defaultContent.subheading,
      body_text: rawContent.body_text !== undefined ? rawContent.body_text : preset.defaultContent.body_text,
      hero_image_url: rawContent.hero_image_url !== undefined ? rawContent.hero_image_url : preset.defaultContent.hero_image_url,
      hero_image_alt: rawContent.hero_image_alt !== undefined ? rawContent.hero_image_alt : preset.defaultContent.hero_image_alt,
      // Optional CTA Button: Defaults strictly to false
      show_cta: Boolean(rawContent.show_cta),
      cta_text: rawContent.cta_text || preset.defaultContent.cta_text || 'VISIT STORE',
      cta_url: rawContent.cta_url || preset.defaultContent.cta_url || 'https://bubbleboomstore.com',
      cta_style: rawContent.cta_style || 'black',
      secondary_blocks: Array.isArray(rawContent.secondary_blocks) ? rawContent.secondary_blocks : [],
    }

    if (!isSupabaseConfigured()) {
      const mockCampaign = {
        id: `camp-${Date.now()}`,
        name,
        subject,
        preheader,
        sender_name: senderName,
        audience_type: audienceType,
        template_id: templateId,
        content: content as any,
        status,
        total_recipients: 0,
        sent_count: 0,
        failed_count: 0,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json({ campaign: mockCampaign })
    }

    const serviceClient = await createServiceClient()
    const { data: campaign, error } = await serviceClient
      .from('marketing_campaigns')
      .insert({
        name,
        subject,
        preheader,
        sender_name: senderName,
        audience_type: audienceType,
        template_id: templateId,
        content: content as any,
        status,
        total_recipients: 0,
        sent_count: 0,
        failed_count: 0,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Audit log
    try {
      await serviceClient.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'CREATE_MARKETING_CAMPAIGN',
        entity: 'marketing_campaigns',
        entity_id: campaign.id,
        metadata: { name, subject, templateId, show_cta: content.show_cta },
      })
    } catch {}

    return NextResponse.json({ campaign })
  } catch (err: any) {
    console.error('[API Campaign Create] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
