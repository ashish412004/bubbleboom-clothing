import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const {
      code,
      description,
      discount_type,
      discount_value,
      minimum_amount,
      maximum_discount,
      expiry_date,
      usage_limit,
    } = body

    if (!code || !discount_value) {
      return NextResponse.json({ error: 'Coupon code and discount value are required' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: code.trim().toUpperCase(),
        description: description || null,
        discount_type: discount_type || 'percentage',
        discount_value: Number(discount_value),
        minimum_amount: Number(minimum_amount) || 0,
        maximum_discount: maximum_discount ? Number(maximum_discount) : null,
        start_date: new Date().toISOString(),
        expiry_date: expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: usage_limit ? Number(usage_limit) : null,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, coupon: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id, is_active } = await req.json()
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, coupon: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
