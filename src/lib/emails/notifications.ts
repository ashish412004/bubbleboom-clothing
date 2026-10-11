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

export * from '@/lib/emails/templates'

function getOutboxDiskPath() {
  const dir = path.join(process.cwd(), '.next')
  return path.join(dir, 'bb_email_outbox.json')
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
 * Queue order notification safely into Outbox (idempotent, non-blocking)
 */
export async function queueOrderNotification(
  payload: OrderNotificationPayload
): Promise<{ success: boolean; jobId?: string; skipped?: boolean; reason?: string }> {
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

    // 2. Deduplication check (memory and disk)
    const existingMemory = inMemoryOutbox.find(
      (j) =>
        (j.payload.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
        j.payload.event === payload.event &&
        j.status === 'completed'
    )
    if (existingMemory) {
      return { success: true, skipped: true, reason: 'Already delivered (in-memory deduplicated)' }
    }

    const diskJobs = loadDiskOutbox()
    const existingDisk = diskJobs.find(
      (j) =>
        (j.payload.order_id === payload.order_id || j.payload.order_number === orderNumber) &&
        j.payload.event === payload.event &&
        j.status === 'completed'
    )
    if (existingDisk) {
      return { success: true, skipped: true, reason: 'Already delivered (disk deduplicated)' }
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
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServiceClient()
        const { error: outboxErr } = await supabase.from('outbox_jobs').insert({
          id: jobId,
          job_type: jobRecord.job_type,
          payload: jobRecord.payload as any,
          status: 'pending',
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          scheduled_at: now,
          created_at: now,
          updated_at: now,
        })

        if (outboxErr) {
          console.warn('[Outbox] outbox_jobs table notice:', outboxErr.message)
        }
      } catch (err: any) {
        console.warn('[Outbox] Supabase queue error (persisted to disk):', err.message)
      }
    }

    // 4. Asynchronously process job immediately without blocking caller
    processOutboxJob(jobId).catch((procErr) => {
      console.warn(`[Outbox] Async dispatch error for job ${jobId}:`, procErr)
    })

    return { success: true, jobId }
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
  let job = inMemoryOutbox.find((j) => j.id === jobId) || diskJobs.find((j) => j.id === jobId)

  if (!job) {
    return { success: false, error: 'Job not found in outbox' }
  }

  // Update status to processing
  job.status = 'processing'
  job.updated_at = new Date().toISOString()
  saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])

  try {
    const rendered = renderNotificationHtml(job.payload.event, job.payload)
    const sendRes = await sendEmail({
      to: job.payload.recipient_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })

    if (sendRes.success) {
      job.status = 'completed'
      job.message_id = sendRes.messageId || null
      job.last_error = null
      job.updated_at = new Date().toISOString()

      // Record audit trail if Supabase configured
      if (isSupabaseConfigured()) {
        try {
          const supabase = await createServiceClient()
          await supabase.from('admin_audit_logs').insert({
            admin_id: 'system',
            action: 'ORDER_EMAIL_SENT',
            entity: 'order',
            entity_id: job.payload.order_id,
            metadata: {
              event: job.payload.event,
              recipient: job.payload.recipient_email,
              message_id: sendRes.messageId,
              provider: sendRes.provider,
            } as any,
          })

          // Also update outbox_jobs table if it exists
          await supabase
            .from('outbox_jobs')
            .update({
              status: 'completed',
              updated_at: job.updated_at,
            })
            .eq('id', jobId)
        } catch {}
      }

      saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
      return sendRes
    } else {
      job.status = 'failed'
      job.retry_count = (job.retry_count || 0) + 1
      job.last_error = sendRes.error || 'Failed to send'
      job.updated_at = new Date().toISOString()
      saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
      return sendRes
    }
  } catch (err: any) {
    job.status = 'failed'
    job.retry_count = (job.retry_count || 0) + 1
    job.last_error = err.message || 'Dispatch exception'
    job.updated_at = new Date().toISOString()
    saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
    return { success: false, error: err.message }
  }
}

/**
 * Retry a failed job manually
 */
export async function retryOutboxJob(jobId: string): Promise<SendEmailResult> {
  const diskJobs = loadDiskOutbox()
  const job = inMemoryOutbox.find((j) => j.id === jobId) || diskJobs.find((j) => j.id === jobId)
  if (!job) {
    return { success: false, error: 'Job not found' }
  }
  job.status = 'pending'
  job.updated_at = new Date().toISOString()
  saveDiskOutbox([job, ...diskJobs.filter((j) => j.id !== jobId)])
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

  // Also query Supabase outbox_jobs if present
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data } = await supabase
        .from('outbox_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (data && Array.isArray(data)) {
        for (const row of data) {
          if (!allJobs.some((j) => j.id === row.id)) {
            allJobs.push({
              id: row.id,
              job_type: row.job_type,
              payload: row.payload as any,
              status: row.status as any,
              retry_count: row.retry_count,
              max_retries: row.max_retries,
              last_error: row.last_error,
              scheduled_at: row.scheduled_at,
              created_at: row.created_at,
              updated_at: row.updated_at,
            })
          }
        }
      }
    } catch {}
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
