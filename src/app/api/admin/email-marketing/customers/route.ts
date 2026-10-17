import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getCustomerEmailDirectory } from '@/lib/email-marketing/directory'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const directory = await getCustomerEmailDirectory()
    return NextResponse.json(directory)
  } catch (err: any) {
    console.error('[API Customers Directory] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch customer email directory' },
      { status: 500 }
    )
  }
}
