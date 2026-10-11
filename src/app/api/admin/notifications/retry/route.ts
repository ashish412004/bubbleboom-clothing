import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { retryOutboxJob } from '@/lib/emails/notifications'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { jobId } = await req.json()
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const result = await retryOutboxJob(jobId)

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      simulated: result.simulated,
    })
  } catch (error: any) {
    console.error('Error retrying notification job:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
