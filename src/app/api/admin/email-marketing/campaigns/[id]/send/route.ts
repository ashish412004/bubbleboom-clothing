import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { generateCampaignHtml, OFFICIAL_WEBSITE_URL } from '@/lib/email-marketing/templates'
import { getEligibleRecipients } from '@/lib/email-marketing/directory'
import { sendEmail } from '@/lib/emails/mailer'
import { CampaignContent, CampaignAudienceType } from '@/lib/email-marketing/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const isTest = Boolean(body.is_test)
    const testEmail = (body.test_email || user.email || 'hhshukla241099@gmail.com').trim().toLowerCase()

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        message: isTest ? `Test preview sent to ${testEmail}` : 'Simulation send complete',
      })
    }

    const serviceClient = await createServiceClient()

    // 1. Fetch Campaign
    const { data: campaign, error: campError } = await serviceClient
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (campError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const content = ((campaign.content || {}) as unknown) as CampaignContent

    // 2. Test Send Path
    if (isTest) {
      if (!testEmail || !testEmail.includes('@')) {
        return NextResponse.json({ error: 'Valid test email address required.' }, { status: 400 })
      }

      const testSubject = `[TEST PREVIEW] ${campaign.subject}`
      const testHtml = generateCampaignHtml(content, {
        campaignName: campaign.name,
        subject: testSubject,
        preheader: campaign.preheader || undefined,
        senderName: campaign.sender_name || 'Bubble Boom',
        unsubscribeUrl: `${OFFICIAL_WEBSITE_URL}/unsubscribe?email=${encodeURIComponent(testEmail)}`,
        recipientEmail: testEmail,
      })

      const sendResult = await sendEmail({
        to: testEmail,
        subject: testSubject,
        html: testHtml,
        from: `${campaign.sender_name || 'Bubble Boom'} <bubbleboomstore2026@gmail.com>`,
      })

      if (!sendResult.success) {
        return NextResponse.json(
          { error: sendResult.error || 'Failed to deliver test email' },
          { status: 502 }
        )
      }

      return NextResponse.json({
        success: true,
        is_test: true,
        message: `Test email successfully dispatched to ${testEmail}`,
        messageId: sendResult.messageId,
      })
    }

    // 3. Live Campaign Send Path
    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'This campaign has already been sent and cannot be re-dispatched.' },
        { status: 400 }
      )
    }

    // Mark status as 'sending'
    await serviceClient
      .from('marketing_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', id)

    // Retrieve strictly eligible opted-in recipients
    const specificEmails = Array.isArray(content.specific_recipients)
      ? content.specific_recipients
      : []
    const recipients = await getEligibleRecipients(
      (campaign.audience_type as CampaignAudienceType) || 'all_registered',
      specificEmails
    )

    if (recipients.length === 0) {
      await serviceClient
        .from('marketing_campaigns')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', id)

      return NextResponse.json(
        { error: 'No eligible opted-in subscribers found for this audience filter.' },
        { status: 400 }
      )
    }

    let sentCount = 0
    let failedCount = 0

    // Send emails (concurrent batches of 5 to avoid rate-limiting)
    const BATCH_SIZE = 5
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      await Promise.allSettled(
        batch.map(async (recipient) => {
          const unsubUrl = `${OFFICIAL_WEBSITE_URL}/unsubscribe?email=${encodeURIComponent(
            recipient.email
          )}`
          const html = generateCampaignHtml(content, {
            campaignName: campaign.name,
            subject: campaign.subject,
            preheader: campaign.preheader || undefined,
            senderName: campaign.sender_name || 'Bubble Boom',
            unsubscribeUrl: unsubUrl,
            recipientEmail: recipient.email,
          })

          try {
            const res = await sendEmail({
              to: recipient.email,
              subject: campaign.subject,
              html,
              from: `${campaign.sender_name || 'Bubble Boom'} <bubbleboomstore2026@gmail.com>`,
            })

            if (res.success) {
              sentCount++
              await serviceClient.from('campaign_recipients').insert({
                campaign_id: id,
                email: recipient.email,
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
            } else {
              failedCount++
              await serviceClient.from('campaign_recipients').insert({
                campaign_id: id,
                email: recipient.email,
                status: 'failed',
                error_message: res.error || 'Failed to deliver email',
              })
            }
          } catch (err: any) {
            failedCount++
            await serviceClient.from('campaign_recipients').insert({
              campaign_id: id,
              email: recipient.email,
              status: 'failed',
              error_message: err.message || 'Send exception',
            })
          }
        })
      )
    }

    // Finalize campaign state
    const now = new Date().toISOString()
    const { data: updatedCampaign } = await serviceClient
      .from('marketing_campaigns')
      .update({
        status: 'sent',
        total_recipients: recipients.length,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    // Audit log
    try {
      await serviceClient.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'SEND_MARKETING_CAMPAIGN',
        entity: 'marketing_campaigns',
        entity_id: id,
        metadata: {
          name: campaign.name,
          recipientsCount: recipients.length,
          sentCount,
          failedCount,
        },
      })
    } catch {}

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      summary: {
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
      },
    })
  } catch (err: any) {
    console.error('[API Campaign Send] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to send campaign' },
      { status: 500 }
    )
  }
}
