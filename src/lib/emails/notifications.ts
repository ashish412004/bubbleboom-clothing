import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getStoreSettings, StoreNotificationSettings } from '@/lib/settings'
import { sendEmail, SendEmailResult } from '@/lib/emails/mailer'
import {
  OrderNotificationEvent,
  OrderNotificationPayload,
  OutboxJobRecord,
  renderNotificationHtml,
} from '@/lib/emails/templates'
import fs from 'fs'
import path from 'path'
import os from 'os'

export * from '@/lib/emails/templates'

function getOutboxDiskPath() {
  return path.join(os.tmpdir(), 'bb_email_notification_outbox.json')
}

let inMemoryOutbox: OutboxJobRecord[] = []

function loadDiskOutbox(): OutboxJobRecord[] {
  try {
    const file = getOutboxDiskPath()
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
      if (Array.isArray(data)) return data
    }
  } catch {}
  return []
}

function saveDiskOutbox(jobs: OutboxJobRecord[]) {
  try {
    const file = getOutboxDiskPath()
    fs.writeFileSync(file, JSON.stringify(jobs.slice(0, 500), null, 2), 'utf-8')
  } catch {}
}

/**
 * Resilient Supabase persistence:
 * Tries `email_notification_outbox` table first. If missing (PGRST205), seamlessly persists
 * to `store_settings` under key `email_notification_outbox`.
 */
async function persistJobToSupabase(job: OutboxJobRecord) {
  if (!isSupabaseConfigured()) return
  try {
    const supabase = await createServiceClient()
    const { error: outboxErr } = await (supabase as any)
      .from('email_notification_outbox')
      .insert({
      id: job.id,
      order_id: job.order_id,
      customer_email: job.customer_email,
      event_type: job.event_type,
      status: job.status === 'completed' ? 'sent' : job.status,
      attempts: job.attempts || 0,
      last_error: job.last_error || null,
      created_at: job.created_at,
      sent_at: job.sent_at || null,
      unique_event_id: job.unique_event_id,
      payload: job.payload as any,
      message_id: job.message_id || null,
    })

    if (!outboxErr) return

    // Fallback: If email_notification_outbox table doesn't exist, store in store_settings
    if (
      outboxErr.message?.includes('email_notification_outbox') ||
      outboxErr.code === 'PGRST205' ||
      outboxErr.message?.includes('schema cache')
    ) {
      const { data: existing } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'email_notification_outbox')
        .maybeSingle()

      const currentJobs: OutboxJobRecord[] =
        Array.isArray((existing?.value as any)?.jobs)
          ? (existing!.value as any).jobs
          : []

      const updatedJobs = [
        job,
        ...currentJobs.filter((j) => j.id !== job.id && j.unique_event_id !== job.unique_event_id),
      ].slice(0, 200)

      await supabase.from('store_settings').upsert({
        key: 'email_notification_outbox',
        value: { jobs: updatedJobs } as any,
        updated_at: new Date().toISOString(),
      })
    }
  } catch (err: any) {
    console.warn('[Outbox] Supabase persist notice:', err.message)
  }
}

async function updateJobInSupabase(job: OutboxJobRecord) {
  if (!isSupabaseConfigured()) return
  try {
    const supabase = await createServiceClient()
    const { error: outboxErr } = await (supabase as any)
      .from('email_notification_outbox')
      .update({
        status: job.status === 'completed' ? 'sent' : job.status,
        attempts: job.attempts,
        last_error: job.last_error,
        sent_at: job.sent_at,
        message_id: job.message_id,
      })
      .eq('id', job.id)

    if (!outboxErr) return

    // Fallback: update in store_settings
    if (
      outboxErr.message?.includes('email_notification_outbox') ||
      outboxErr.code === 'PGRST205' ||
      outboxErr.message?.includes('schema cache')
    ) {
      const { data: existing } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'email_notification_outbox')
        .maybeSingle()

      const currentJobs: OutboxJobRecord[] =
        Array.isArray((existing?.value as any)?.jobs)
          ? (existing!.value as any).jobs
          : []

      const updatedJobs = currentJobs.map((j) => (j.id === job.id ? job : j))
      if (!updatedJobs.some((j) => j.id === job.id)) {
        updatedJobs.unshift(job)
      }

      await supabase.from('store_settings').upsert({
        key: 'email_notification_outbox',
        value: { jobs: updatedJobs.slice(0, 200) } as any,
        updated_at: new Date().toISOString(),
      })
    }
  } catch (err: any) {
    console.warn('[Outbox] Supabase update notice:', err.message)
  }
}

async function loadSupabaseOutboxJobs(): Promise<OutboxJobRecord[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const supabase = await createServiceClient()
    const { data: outboxRows, error } = await (supabase as any)
      .from('email_notification_outbox')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && Array.isArray(outboxRows) && outboxRows.length > 0) {
      return outboxRows.map((row: any) => ({
        id: row.id,
        order_id: row.order_id,
        customer_email: row.customer_email,
        event_type: row.event_type,
        status: row.status,
        attempts: row.attempts || 0,
        last_error: row.last_error,
        created_at: row.created_at,
        sent_at: row.sent_at,
        unique_event_id: row.unique_event_id,
        payload: row.payload,
        message_id: row.message_id,
        job_type: `ORDER_EMAIL_${(row.event_type || 'NOTIFICATION').toUpperCase()}`,
        retry_count: row.attempts || 0,
        max_retries: 3,
        scheduled_at: row.created_at,
        updated_at: row.sent_at || row.created_at,
      }))
    }

    // Fallback: query store_settings
    const { data: settingRow } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'email_notification_outbox')
      .maybeSingle()

    if (Array.isArray((settingRow?.value as any)?.jobs)) {
      return (settingRow!.value as any).jobs as OutboxJobRecord[]
    }
  } catch {}
  return []
}

/**
 * Queue order notification safely into Outbox (idempotent, resilient)
 */
export async function queueOrderNotification(
  payload: OrderNotificationPayload,
  options?: { immediate?: boolean }
): Promise<{ success: boolean; jobId?: string; skipped?: boolean; reason?: string; sendResult?: SendEmailResult }> {
  try {
    const orderNumber = payload.order_number || payload.order_id
    const recipient = payload.recipient_email?.trim()
    if (!recipient || !recipient.includes('@')) {
      return { success: false, skipped: true, reason: 'Invalid recipient email' }
    }

    // 1. Check Store Notification Settings
    const settings = await getStoreSettings<StoreNotificationSettings>('email_notifications')
    if (settings && !settings.enabled) {
      return { success: true, skipped: true, reason: 'Notifications globally disabled' }
    }

    const eventKey = `notify_${payload.event}` as keyof StoreNotificationSettings
    if (settings && settings[eventKey] === false) {
      return { success: true, skipped: true, reason: `Notification for ${payload.event} is disabled in store settings` }
    }

    // 2. Idempotency Check with unique event identifier
    const uniqueEventId = `${payload.order_id}_${payload.event}`

    // Deduplication check across memory
    const existingMemory = inMemoryOutbox.find(
      (j) =>
        (j.unique_event_id === uniqueEventId ||
          ((j.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
            j.event_type === payload.event)) &&
        (j.status === 'sent' || j.status === 'completed' || j.status === 'simulated')
    )
    if (existingMemory) {
      return { success: true, skipped: true, reason: 'Already delivered (in-memory deduplicated)' }
    }

    // Deduplication check across disk
    const diskJobs = loadDiskOutbox()
    const existingDisk = diskJobs.find(
      (j) =>
        (j.unique_event_id === uniqueEventId ||
          ((j.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
            j.event_type === payload.event)) &&
        (j.status === 'sent' || j.status === 'completed' || j.status === 'simulated')
    )
    if (existingDisk) {
      return { success: true, skipped: true, reason: 'Already delivered (disk deduplicated)' }
    }

    // Deduplication check across database
    const dbJobs = await loadSupabaseOutboxJobs()
    const existingDb = dbJobs.find(
      (j) =>
        (j.unique_event_id === uniqueEventId ||
          ((j.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
            j.event_type === payload.event)) &&
        (j.status === 'sent' || j.status === 'completed' || j.status === 'simulated')
    )
    if (existingDb) {
      return { success: true, skipped: true, reason: 'Already delivered (database deduplicated)' }
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const jobRecord: OutboxJobRecord = {
      id: jobId,
      order_id: payload.order_id,
      customer_email: recipient,
      event_type: payload.event,
      status: 'pending',
      attempts: 0,
      last_error: null,
      created_at: now,
      sent_at: null,
      unique_event_id: uniqueEventId,
      payload,
      job_type: `ORDER_EMAIL_${payload.event.toUpperCase()}`,
      retry_count: 0,
      max_retries: 3,
      scheduled_at: now,
      updated_at: now,
    }

    // Store in memory & disk
    inMemoryOutbox = [jobRecord, ...inMemoryOutbox]
    saveDiskOutbox([jobRecord, ...diskJobs.filter((j) => j.id !== jobId)])

    // 3. Resilient Supabase persistence
    await persistJobToSupabase(jobRecord)

    // 4. In serverless runtimes (Vercel), await dispatch with race timeout so
    // function execution is not frozen before network dispatch finishes
    let sendResult: SendEmailResult | undefined
    if (options?.immediate !== false) {
      try {
        sendResult = await Promise.race([
          processOutboxJob(jobId),
          new Promise<SendEmailResult>((_, reject) =>
            setTimeout(() => reject(new Error('Email dispatch timeout (7s)')), 7000)
          ),
        ])
      } catch (procErr: any) {
        console.warn(`[Outbox] Dispatch timeout/warning for job ${jobId}:`, procErr.message)
      }
    } else {
      processOutboxJob(jobId).catch((procErr) => {
        console.warn(`[Outbox] Async dispatch error for job ${jobId}:`, procErr)
      })
    }

    return { success: true, jobId, sendResult }
  } catch (err: any) {
    console.error('[Outbox] Exception queuing order notification:', err)
    return { success: false, reason: err.message || 'Queuing failed' }
  }
}

/**
 * Process a specific job from outbox
 */
export async function processOutboxJob(jobId: string): Promise<SendEmailResult> {
  const diskJobs = loadDiskOutbox()
  const dbJobs = await loadSupabaseOutboxJobs()
  let job =
    inMemoryOutbox.find((j) => j.id === jobId) ||
    diskJobs.find((j) => j.id === jobId) ||
    dbJobs.find((j) => j.id === jobId)

  if (!job) {
    return { success: false, error: 'Job not found in outbox' }
  }

  // Update status to processing
  job.status = 'processing'
  job.attempts = (job.attempts || 0) + 1
  job.retry_count = job.attempts
  job.updated_at = new Date().toISOString()
  saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
  await updateJobInSupabase(job)

  try {
    const rendered = renderNotificationHtml(job.event_type || job.payload.event, job.payload)
    const sendRes = await sendEmail({
      to: job.customer_email || job.payload.recipient_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })

    if (sendRes.success) {
      const now = new Date().toISOString()
      if (sendRes.simulated) {
        job.status = 'simulated'
        job.sent_at = now
        job.message_id = sendRes.messageId || null
        job.last_error = sendRes.error || 'Notice: Simulated delivery (SMTP_PASS / GMAIL_APP_PASSWORD not set)'
      } else {
        job.status = 'sent'
        job.sent_at = now
        job.message_id = sendRes.messageId || null
        job.last_error = null
      }
      job.updated_at = now

      // Record audit trail in Supabase
      if (isSupabaseConfigured()) {
        try {
          const supabase = await createServiceClient()
          await supabase.from('admin_audit_logs').insert({
            admin_id: 'system',
            action: sendRes.simulated ? 'ORDER_EMAIL_SIMULATED' : 'ORDER_EMAIL_SENT',
            entity: 'order',
            entity_id: job.order_id || job.payload.order_id,
            metadata: {
              event: job.event_type || job.payload.event,
              recipient: job.customer_email || job.payload.recipient_email,
              message_id: sendRes.messageId,
              provider: sendRes.provider,
              simulated: sendRes.simulated,
            } as any,
          })
        } catch {}
      }

      await updateJobInSupabase(job)
      saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
      return sendRes
    } else {
      job.status = 'failed'
      job.last_error = sendRes.error || 'Failed to send'
      job.updated_at = new Date().toISOString()

      await updateJobInSupabase(job)
      saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
      return sendRes
    }
  } catch (err: any) {
    job.status = 'failed'
    job.last_error = err.message || 'Dispatch exception'
    job.updated_at = new Date().toISOString()

    await updateJobInSupabase(job)
    saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
    return { success: false, error: err.message }
  }
}

/**
 * Process all pending or failed (< 3 attempts) outbox notifications.
 * Called automatically by Vercel Cron worker or admin retry actions.
 */
export async function processPendingEmailOutboxJobs(limit = 10): Promise<{
  processed: number
  succeeded: number
  failed: number
  jobs: { id: string; status: string; error?: string | null }[]
}> {
  const jobs = await loadSupabaseOutboxJobs()
  const diskJobs = loadDiskOutbox()

  const allPending = [...jobs]
  for (const dj of diskJobs) {
    if (!allPending.some((j) => j.id === dj.id)) {
      allPending.push(dj)
    }
  }

  const eligibleJobs = allPending
    .filter(
      (j) =>
        j.status === 'pending' ||
        (j.status === 'failed' && (j.attempts || 0) < 3)
    )
    .slice(0, limit)

  let succeeded = 0
  let failed = 0
  const results: { id: string; status: string; error?: string | null }[] = []

  for (const job of eligibleJobs) {
    try {
      const res = await processOutboxJob(job.id)
      if (res.success) {
        succeeded++
        results.push({ id: job.id, status: res.simulated ? 'simulated' : 'sent', error: null })
      } else {
        failed++
        results.push({ id: job.id, status: 'failed', error: res.error })
      }
    } catch (err: any) {
      failed++
      results.push({ id: job.id, status: 'failed', error: err.message })
    }
  }

  return {
    processed: eligibleJobs.length,
    succeeded,
    failed,
    jobs: results,
  }
}

/**
 * Retry a failed job manually
 */
export async function retryOutboxJob(jobId: string): Promise<SendEmailResult> {
  const diskJobs = loadDiskOutbox()
  const dbJobs = await loadSupabaseOutboxJobs()
  const job =
    inMemoryOutbox.find((j) => j.id === jobId) ||
    diskJobs.find((j) => j.id === jobId) ||
    dbJobs.find((j) => j.id === jobId)

  if (!job) {
    return { success: false, error: 'Job not found' }
  }
  job.status = 'pending'
  job.updated_at = new Date().toISOString()
  saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
  await updateJobInSupabase(job)
  return processOutboxJob(jobId)
}

/**
 * Retrieve Outbox history for Admin Console
 */
export async function getOutboxHistory(options?: {
  limit?: number
  offset?: number
  status?: string
}): Promise<{ jobs: OutboxJobRecord[]; total: number }> {
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  let allJobs = [...inMemoryOutbox]
  const diskJobs = loadDiskOutbox()

  for (const dj of diskJobs) {
    if (!allJobs.some((j) => j.id === dj.id)) {
      allJobs.push(dj)
    }
  }

  // Load from Supabase
  const dbJobs = await loadSupabaseOutboxJobs()
  for (const dbj of dbJobs) {
    if (!allJobs.some((j) => j.id === dbj.id)) {
      allJobs.push(dbj)
    }
  }

  allJobs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (options?.status && options.status !== 'all') {
    allJobs = allJobs.filter((j) => j.status === options.status)
  }

  return {
    total: allJobs.length,
    jobs: allJobs.slice(offset, offset + limit),
  }
}

/**
 * Send test email for admin verification
 */
export async function sendTestOrderEmail(
  recipientEmail: string,
  event: OrderNotificationEvent
): Promise<SendEmailResult> {
  const samplePayload: OrderNotificationPayload = {
    order_id: 'ord_test_' + Date.now().toString().slice(-6),
    order_number: 'BB-TEST-' + Math.floor(1000 + Math.random() * 9000),
    event,
    recipient_email: recipientEmail,
    customer_name: 'Alex Mercer',
    total_amount: 3499,
    subtotal: 3499,
    shipping_amount: 0,
    payment_method: event === 'order_confirmed' ? 'cashfree' : 'cod',
    payment_status: event === 'order_confirmed' || event === 'refund_completed' ? 'paid' : 'pending',
    items: [
      {
        product_id: 'prod_hoodie_1',
        product_name: 'Heavyweight Boxy Hoodie',
        size: 'L',
        color: 'Washed Black',
        quantity: 1,
        price: 2499,
        total_amount: 2499,
        image_url: 'https://bubbleboom-clothing.vercel.app/images/products/hoodie-black.jpg',
      },
      {
        product_id: 'prod_tee_1',
        product_name: 'Oversized Acid Wash Tee',
        size: 'XL',
        color: 'Smoke Grey',
        quantity: 1,
        price: 1000,
        total_amount: 1000,
        image_url: 'https://bubbleboom-clothing.vercel.app/images/products/tee-grey.jpg',
      },
    ],
    shipping_address: {
      full_name: 'Alex Mercer',
      phone: '9876543210',
      address_line1: 'Flat 402, Highrise Tower, Indiranagar',
      address_line2: '100ft Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pin_code: '560038',
    },
    carrier: 'Bluedart Express',
    tracking_number: 'BLUEDART-882910382',
    tracking_url: 'https://bubbleboom-clothing.vercel.app/track-order?order_id=BB-TEST',
    estimated_delivery: 'October 16, 2026',
  }

  const rendered = renderNotificationHtml(event, samplePayload)
  return sendEmail({
    to: recipientEmail,
    subject: `[TEST PREVIEW] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  })
}
