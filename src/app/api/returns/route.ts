import { NextRequest, NextResponse } from 'next/server'
import {
  createReturnRequest,
  getReturnsForOrder,
  isOrderEligibleForReturn,
} from '@/lib/returns'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const returns = await getReturnsForOrder(orderId)
    const eligibility = await isOrderEligibleForReturn(orderId)

    return NextResponse.json({
      success: true,
      returns,
      eligibility,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      order_id,
      order_item_id,
      quantity,
      reason,
      notes,
      request_type,
      exchange_variant_id,
      bank_details,
      images,
    } = body

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
      request_type: request_type || 'return',
      exchange_variant_id: exchange_variant_id || null,
      bank_details: bank_details || null,
      images: Array.isArray(images) ? images : [],
    })

    if (!result.success || result.error) {
      return NextResponse.json({ error: result.error || 'Failed to submit return' }, { status: 400 })
    }

    return NextResponse.json({ success: true, return: result.data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
