import { NextRequest, NextResponse } from 'next/server'
import { createReturnRequest } from '@/lib/returns'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { order_id, order_item_id, quantity, reason, notes } = await req.json()

    if (!order_id || !order_item_id || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Order ID, Item ID, quantity, and reason are required' },
        { status: 400 }
      )
    }

    const result = await createReturnRequest({
      order_id,
      user_id: user.id,
      order_item_id,
      quantity: Number(quantity),
      reason,
      notes,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, return: result.data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
