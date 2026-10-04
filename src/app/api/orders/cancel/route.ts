import { NextRequest, NextResponse } from 'next/server'
import { cancelOrder } from '@/lib/orders'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, reason } = await req.json()

    if (!orderId || !reason) {
      return NextResponse.json({ error: 'Order ID and reason are required' }, { status: 400 })
    }

    const result = await cancelOrder(orderId, reason, user.id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, order: result.data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
