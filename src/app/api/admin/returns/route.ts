import { NextRequest, NextResponse } from 'next/server'
import {
  getAllReturns,
  getReturnById,
  updateReturnApproval,
  scheduleReversePickup,
  markReturnReceived,
  processReturnInspection,
  dispatchExchangeOrder,
  executeRefund,
} from '@/lib/returns'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const returns = await getAllReturns()
    return NextResponse.json({ success: true, returns })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { action, returnId } = body

    if (!returnId) {
      return NextResponse.json({ error: 'Return ID is required' }, { status: 400 })
    }

    // 1. Approval / Rejection
    if (action === 'approve' || action === 'reject') {
      const res = await updateReturnApproval(returnId, action, {
        rejection_reason: body.rejection_reason,
        adminNotes: body.adminNotes,
        adminUserId: user.id,
      })
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ success: true, data: res.data })
    }

    // 2. Schedule Reverse Pickup
    if (action === 'schedule_pickup') {
      const { courier_name, reverse_awb, tracking_url, pickup_date } = body
      if (!courier_name || !reverse_awb) {
        return NextResponse.json({ error: 'Courier Name and Reverse AWB are required' }, { status: 400 })
      }
      const res = await scheduleReversePickup(returnId, {
        courier_name,
        reverse_awb,
        tracking_url,
        pickup_date,
        adminUserId: user.id,
      })
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ success: true, data: res.data })
    }

    // 3. Mark Received at Warehouse
    if (action === 'mark_received') {
      const res = await markReturnReceived(returnId, user.id)
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ success: true, data: res.data })
    }

    // 4. Quality Inspection (Supports legacy and new format)
    if (action === 'inspect' || body.decision) {
      const decision = body.decision || (action === 'inspect_pass' ? 'approved' : 'rejected')
      const restockDecision = body.restockDecision !== undefined ? Boolean(body.restockDecision) : true
      const res = await processReturnInspection(
        returnId,
        decision,
        restockDecision,
        body.adminNotes,
        user.id
      )
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ success: true, data: res.data })
    }

    // 5. Dispatch Size/Colour Exchange Order
    if (action === 'dispatch_exchange') {
      const { carrier, tracking_number, tracking_url } = body
      if (!carrier || !tracking_number) {
        return NextResponse.json({ error: 'Courier carrier and tracking number are required' }, { status: 400 })
      }
      const res = await dispatchExchangeOrder(returnId, {
        carrier,
        tracking_number,
        tracking_url,
        adminUserId: user.id,
      })
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ success: true, data: res.data })
    }

    // 6. Execute Refund (Cashfree or COD manual bank payout)
    if (action === 'execute_refund') {
      const ret = await getReturnById(returnId)
      if (!ret) return NextResponse.json({ error: 'Return not found' }, { status: 404 })

      const amountPaise = body.amount_paise || (ret.refund_amount * 100)
      const res = await executeRefund(
        ret.order_id,
        ret.id,
        amountPaise,
        body.reason || `Approved Return Refund (${ret.return_reference})`,
        user.id,
        body.bank_reference
      )
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ success: true, data: res.data })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
