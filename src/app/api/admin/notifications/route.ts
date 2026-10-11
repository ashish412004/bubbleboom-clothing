import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import {
  getOutboxHistory,
  sendTestOrderEmail,
  processPendingEmailOutboxJobs,
  OrderNotificationEvent,
} from '@/lib/emails/notifications'
import { getMailerStatus, verifySmtpConnection } from '@/lib/emails/mailer'
import {
  getStoreSettings,
  updateStoreSettings,
  StoreNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/lib/settings'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit')) || 50
    const offset = Number(searchParams.get('offset')) || 0
    const status = searchParams.get('status') || undefined

    const [history, settings, mailerStatus] = await Promise.all([
      getOutboxHistory({ limit, offset, status }),
      getStoreSettings<StoreNotificationSettings>('email_notifications'),
      getMailerStatus(),
    ])

    return NextResponse.json({
      success: true,
      history: history.jobs,
      total: history.total,
      settings: settings || DEFAULT_NOTIFICATION_SETTINGS,
      mailerStatus,
    })
  } catch (error: any) {
    console.error('Error fetching admin notifications data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const newSettings: StoreNotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...body.settings,
    }

    const updateRes = await updateStoreSettings('email_notifications', newSettings, user.id)
    if (updateRes?.error) {
      return NextResponse.json({ error: updateRes.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: newSettings })
  } catch (error: any) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()

    // SMTP Connection Verification Action
    if (body.action === 'VERIFY_SMTP') {
      const verifyRes = await verifySmtpConnection(body.config)
      return NextResponse.json(verifyRes)
    }

    // Process Pending Outbox Action
    if (body.action === 'PROCESS_OUTBOX') {
      const processRes = await processPendingEmailOutboxJobs(body.limit || 20)
      return NextResponse.json({ success: true, ...processRes })
    }

    const { recipientEmail, event } = body
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email is required' }, { status: 400 })
    }

    const validEvents: OrderNotificationEvent[] = [
      'order_placed',
      'order_confirmed',
      'order_packed',
      'order_shipped',
      'out_for_delivery',
      'order_delivered',
      'order_cancelled',
      'refund_completed',
      'admin_new_order',
    ]

    const targetEvent = validEvents.includes(event) ? event : 'order_confirmed'
    const result = await sendTestOrderEmail(recipientEmail.trim(), targetEvent)

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      provider: result.provider,
      error: result.error,
    })
  } catch (error: any) {
    console.error('Error sending test notification email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
