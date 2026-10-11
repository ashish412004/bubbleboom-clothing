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
  return path.join(os.tmpdir(), 'bb_email_outbox.json')
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
 * Tries `outbox_jobs` table first. If missing (PGRST205), seamlessly persists
 * to `store_settings` under key `email_outbox_jobs`.
 */
async function persistJobToSupabase(job: OutboxJobRecord) {
  if (!isSupabaseConfigured()) return
  try {
    const supabase = await createServiceClient()
    const { error: outboxErr } = await (supabase.from('outbox_jobs') as any).insert({
      id: job.id,
      job_type: job.job_type,
      payload: job.payload as any,
      status: job.status,
      retry_count: job.retry_count || 0,
      max_retries: job.max_retries || 3,
      last_error: job.last_error || null,
      message_id: job.message_id || null,
      scheduled_at: job.scheduled_at,
      created_at: job.created_at,
      updated_at: job.updated_at,
    })

    if (!outboxErr) return

    // Fallback: If outbox_jobs table doesn't exist, store in store_settings
    if (
      outboxErr.message?.includes('outbox_jobs') ||
      outboxErr.code === 'PGRST205' ||
      outboxErr.message?.includes('schema cache')
    ) {
      const { data: existing } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'email_outbox_jobs')
        .maybeSingle()

      const currentJobs: OutboxJobRecord[] =
        Array.isArray((existing?.value as any)?.jobs)
          ? (existing!.value as any).jobs
          : []

      const updatedJobs = [job, ...currentJobs.filter((j) => j.id !== job.id)].slice(0, 200)

      await supabase.from('store_settings').upsert({
        key: 'email_outbox_jobs',
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
    const { error: outboxErr } = await (supabase.from('outbox_jobs') as any)
      .update({
        status: job.status,
        retry_count: job.retry_count,
        last_error: job.last_error,
        message_id: job.message_id,
        updated_at: job.updated_at,
      })
      .eq('id', job.id)

    if (!outboxErr) return

    // Fallback: update in store_settings
    if (
      outboxErr.message?.includes('outbox_jobs') ||
      outboxErr.code === 'PGRST205' ||
      outboxErr.message?.includes('schema cache')
    ) {
      const { data: existing } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'email_outbox_jobs')
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
        key: 'email_outbox_jobs',
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
    const { data: outboxRows, error } = await (supabase.from('outbox_jobs') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && Array.isArray(outboxRows) && outboxRows.length > 0) {
      return outboxRows as OutboxJobRecord[]
    }

    // Fallback: query store_settings
    const { data: settingRow } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'email_outbox_jobs')
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

    // 2. Deduplication check (memory, disk, and database)
    const existingMemory = inMemoryOutbox.find(
      (j) =>
        (j.payload.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
        j.payload.event === payload.event &&
        (j.status === 'completed' || j.status === 'simulated')
    )
    if (existingMemory) {
      return { success: true, skipped: true, reason: 'Already delivered (in-memory deduplicated)' }
    }

    const diskJobs = loadDiskOutbox()
    const existingDisk = diskJobs.find(
      (j) =>
        (j.payload.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
        j.payload.event === payload.event &&
        (j.status === 'completed' || j.status === 'simulated')
    )
    if (existingDisk) {
      return { success: true, skipped: true, reason: 'Already delivered (disk deduplicated)' }
    }

    const dbJobs = await loadSupabaseOutboxJobs()
    const existingDb = dbJobs.find(
      (j) =>
        (j.payload.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
        j.payload.event === payload.event &&
        (j.status === 'completed' || j.status === 'simulated')
    )
    if (existingDb) {
      return { success: true, skipped: true, reason: 'Already delivered (database deduplicated)' }
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const jobRecord: OutboxJobRecord = {
      id: jobId,
      job_type: `ORDER_EMAIL_${payload.event.toUpperCase()}`,
      payload,
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      last_error: null,
      scheduled_at: now,
      created_at: now,
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
  job.updated_at = new Date().toISOString()
  saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
  await updateJobInSupabase(job)

  try {
    const rendered = renderNotificationHtml(job.payload.event, job.payload)
    const sendRes = await sendEmail({
      to: job.payload.recipient_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })

    if (sendRes.success) {
      if (sendRes.simulated) {
        job.status = 'simulated' as any
        job.message_id = sendRes.messageId || null
        job.last_error = sendRes.error || 'Notice: Simulated delivery (SMTP_PASS / GMAIL_APP_PASSWORD not set)'
      } else {
        job.status = 'completed'
        job.message_id = sendRes.messageId || null
        job.last_error = null
      }
      job.updated_at = new Date().toISOString()

      // Record audit trail in Supabase
      if (isSupabaseConfigured()) {
        try {
          const supabase = await createServiceClient()
          await supabase.from('admin_audit_logs').insert({
            admin_id: 'system',
            action: sendRes.simulated ? 'ORDER_EMAIL_SIMULATED' : 'ORDER_EMAIL_SENT',
            entity: 'order',
            entity_id: job.payload.order_id,
            metadata: {
              event: job.payload.event,
              recipient: job.payload.recipient_email,
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
      job.retry_count = (job.retry_count || 0) + 1
      job.last_error = sendRes.error || 'Failed to send'
      job.updated_at = new Date().toISOString()

      await updateJobInSupabase(job)
      saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
      return sendRes
    }
  } catch (err: any) {
    job.status = 'failed'
    job.retry_count = (job.retry_count || 0) + 1
    job.last_error = err.message || 'Dispatch exception'
    job.updated_at = new Date().toISOString()

    await updateJobInSupabase(job)
    saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
    return { success: false, error: err.message }
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
