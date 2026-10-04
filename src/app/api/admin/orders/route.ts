import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { updateOrderStatus } from '@/lib/orders'
import { executeRefund } from '@/lib/returns'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { action, orderId, status, courierPartner, trackingNumber, refundAmountPaise, refundReason } = body

    const supabase = await createServiceClient()

    if (action === 'UPDATE_STATUS') {
      const res = await updateOrderStatus(orderId, status, user.id)
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, order: res.data })
    }

    if (action === 'ASSIGN_TRACKING') {
      const { data, error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber,
          carrier: courierPartner,
          status: 'shipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'ASSIGN_TRACKING',
        entity: 'orders',
        entity_id: orderId,
        metadata: { courierPartner, trackingNumber },
      })

      return NextResponse.json({ success: true, order: data })
    }

    if (action === 'PROCESS_REFUND') {
      const res = await executeRefund(orderId, null, refundAmountPaise, refundReason, user.id)
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, refund: res.data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Admin order action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
