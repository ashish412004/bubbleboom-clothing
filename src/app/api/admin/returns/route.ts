import { NextRequest, NextResponse } from 'next/server'
import { processReturnInspection } from '@/lib/returns'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { returnId, decision, restockDecision, adminNotes } = await req.json()

    if (!returnId || !decision) {
      return NextResponse.json({ error: 'Return ID and inspection decision are required' }, { status: 400 })
    }

    const result = await processReturnInspection(
      returnId,
      decision,
      Boolean(restockDecision),
      adminNotes,
      user.id
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
