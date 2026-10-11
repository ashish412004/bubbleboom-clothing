import { NextRequest, NextResponse } from 'next/server'
import { processPendingEmailOutboxJobs } from '@/lib/emails/notifications'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Vercel Cron Worker: Process Pending Email Notifications
 * Securely authenticated via CRON_SECRET (Authorization: Bearer <token>)
 * or via authenticated Admin session.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // 1. Check CRON_SECRET Authorization header
    const isCronAuthorized = Boolean(
      cronSecret && authHeader === `Bearer ${cronSecret}`
    )

    // 2. Fallback: Authenticated Admin Session for manual admin trigger
    let isAdminAuthorized = false
    try {
      const user = await getCurrentUser()
      if (user && (await isAdmin(user.id))) {
        isAdminAuthorized = true
      }
    } catch {}

    // Allow local development testing if no secret configured
    const isDev = process.env.NODE_ENV !== 'production' && !cronSecret

    if (!isCronAuthorized && !isAdminAuthorized && !isDev) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid CRON_SECRET Bearer token or Admin session required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit')) || 20

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
