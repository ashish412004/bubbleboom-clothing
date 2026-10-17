import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
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
      start_date,
      expiry_date,
      usage_limit,
      per_customer_limit,
    } = body

    if (!code || !discount_value) {
      return NextResponse.json({ error: 'Coupon code and discount value are required' }, { status: 400 })
    }

    const numDiscountValue = Number(discount_value)
    if (isNaN(numDiscountValue) || numDiscountValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 })
    }

    if (discount_type === 'percentage' && numDiscountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    const numUsageLimit = usage_limit ? Number(usage_limit) : null
    const numPerCustomerLimit = per_customer_limit ? Number(per_customer_limit) : null

    if (numUsageLimit !== null && numUsageLimit <= 0) {
      return NextResponse.json({ error: 'Total usage limit must be at least 1' }, { status: 400 })
    }

    if (numPerCustomerLimit !== null && numPerCustomerLimit <= 0) {
      return NextResponse.json({ error: 'Per-user limit must be at least 1' }, { status: 400 })
    }

    // Enforce Requirement 4: For a limited-use coupon, per-user usage must not exceed total usage limit
    if (numUsageLimit !== null && numPerCustomerLimit !== null && numPerCustomerLimit > numUsageLimit) {
      return NextResponse.json(
        { error: `Per-user limit (${numPerCustomerLimit}) cannot exceed the total usage limit (${numUsageLimit}).` },
        { status: 400 }
      )
    }

    const payload: Record<string, any> = {
      code: code.trim().toUpperCase(),
      description: description ? description.trim() : null,
      discount_type: discount_type || 'percentage',
      discount_value: numDiscountValue,
      minimum_amount: Number(minimum_amount) >= 0 ? Number(minimum_amount) : 0,
      maximum_discount: maximum_discount ? Number(maximum_discount) : null,
      start_date: start_date ? new Date(start_date).toISOString() : new Date().toISOString(),
      expiry_date: expiry_date ? new Date(expiry_date).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      usage_limit: numUsageLimit,
      is_active: true,
    }

    if (numPerCustomerLimit !== null) {
      payload.per_customer_limit = numPerCustomerLimit
    }

    if (!isSupabaseConfigured()) {
      const newCoupon = {
        id: `cpn-${Date.now()}`,
        ...payload,
        usage_count: 0,
        per_customer_limit: numPerCustomerLimit,
      }
      return NextResponse.json({ success: true, coupon: newCoupon })
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('coupons')
      .insert(payload)
      .select()
      .single()

    if (error) {
      if (error.message?.includes('per_customer_limit') || error.code === 'PGRST204') {
        return NextResponse.json(
          {
            error:
              "Could not find the 'per_customer_limit' column of 'coupons' in the database schema. Please run migration 'supabase/migrations/020_coupons_per_customer_limit.sql' in your Supabase SQL Editor and reload the schema cache.",
          },
          { status: 400 }
        )
      }
      throw error
    }

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

    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Toggle active state
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Check discount type & value validations
    if (body.discount_value !== undefined) {
      const numVal = Number(body.discount_value)
      if (isNaN(numVal) || numVal <= 0) {
        return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 })
      }
      if (body.discount_type === 'percentage' && numVal > 100) {
        return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
      }
      updateData.discount_value = numVal
    }

    if (body.code !== undefined) updateData.code = body.code.trim().toUpperCase()
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.discount_type !== undefined) updateData.discount_type = body.discount_type
    if (body.minimum_amount !== undefined) updateData.minimum_amount = Number(body.minimum_amount) >= 0 ? Number(body.minimum_amount) : 0
    if (body.maximum_discount !== undefined) updateData.maximum_discount = body.maximum_discount ? Number(body.maximum_discount) : null

    const numUsageLimit = body.usage_limit ? Number(body.usage_limit) : body.usage_limit === null ? null : undefined
    const numPerCustomerLimit = body.per_customer_limit ? Number(body.per_customer_limit) : body.per_customer_limit === null ? null : undefined

    if (numUsageLimit !== undefined) updateData.usage_limit = numUsageLimit
    if (numPerCustomerLimit !== undefined) updateData.per_customer_limit = numPerCustomerLimit

    // Validate limits if both are being updated
    if (numUsageLimit && numPerCustomerLimit && numPerCustomerLimit > numUsageLimit) {
      return NextResponse.json(
        { error: `Per-user limit (${numPerCustomerLimit}) cannot exceed the total usage limit (${numUsageLimit}).` },
        { status: 400 }
      )
    }

    if (body.start_date !== undefined) updateData.start_date = body.start_date ? new Date(body.start_date).toISOString() : new Date().toISOString()
    if (body.expiry_date !== undefined) updateData.expiry_date = body.expiry_date ? new Date(body.expiry_date).toISOString() : new Date().toISOString()

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, coupon: { id, ...updateData } })
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.message?.includes('per_customer_limit') || error.code === 'PGRST204') {
        return NextResponse.json(
          {
            error:
              "Could not find the 'per_customer_limit' column of 'coupons' in the database schema. Please run migration 'supabase/migrations/020_coupons_per_customer_limit.sql' in your Supabase SQL Editor and reload the schema cache.",
          },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, coupon: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  return PATCH(req)
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await req.json()
        id = body?.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Coupon deleted', id })
    }

    const supabase = await createServiceClient()
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) {
      console.warn('Coupon hard delete failed, setting is_active = false:', error.message)
      await supabase.from('coupons').update({ is_active: false }).eq('id', id)
    }

    return NextResponse.json({ success: true, message: 'Coupon deleted', id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
