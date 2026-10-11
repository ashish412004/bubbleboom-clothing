import { NextRequest, NextResponse } from 'next/server'
import { processPendingEmailOutboxJobs } from '@/lib/emails/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Vercel Cron Worker: Process Pending Email Notifications
 * Triggered automatically by Vercel Cron (* * * * *) or internal maintenance jobs.
 */
export async function GET(req: NextRequest) {
  try {
    // Optional secret check if CRON_SECRET is configured in environment
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // In production, Vercel sends authorization header when CRON_SECRET is set
      const isVercelCron = req.headers.get('x-vercel-cron') === '1'
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit')) || 10

    const startTime = Date.now()
    const result = await processPendingEmailOutboxJobs(limit)
    const durationMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      jobs: result.jobs,
    })
  } catch (error: any) {
    console.error('[Cron Worker] Exception processing email outbox:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Worker failure' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
