import { NextRequest, NextResponse } from 'next/server'
import { validateCoupon } from '@/lib/coupons'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, subtotal_paise, product_ids, collection_ids } = body

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { valid: false, error: 'Please enter a coupon code' },
        { status: 200 }
      )
    }

    const normalizedCode = code.trim().toUpperCase()
    const user = await getCurrentUser()
    const userId = user?.id

    const result = await validateCoupon(
      normalizedCode,
      userId,
      typeof subtotal_paise === 'number' ? subtotal_paise : undefined,
      Array.isArray(product_ids) ? product_ids : [],
      Array.isArray(collection_ids) ? collection_ids : []
    )

    if (!result.valid || !result.coupon) {
      return NextResponse.json(
        { valid: false, error: result.error || 'Invalid or expired coupon code' },
        { status: 200 }
      )
    }

    const coupon = result.coupon
    const discountPaise = result.discount_paise || 0

    let message = ''
    if (coupon.discount_type === 'percentage') {
      message = `${coupon.code} applied: ${coupon.discount_value}% discount!`
      if (coupon.maximum_discount) {
        message += ` (Capped at ₹${coupon.maximum_discount.toLocaleString('en-IN')})`
      }
    } else {
      message = `${coupon.code} applied: ₹${coupon.discount_value.toLocaleString('en-IN')} flat discount!`
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount_paise: discountPaise,
      discount_rupees: Math.round(discountPaise / 100),
      message,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        minimum_amount: coupon.minimum_amount,
        maximum_discount: coupon.maximum_discount,
      },
    })
  } catch (error: any) {
    console.error('Coupon validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Unable to validate coupon at this time. Please try again.' },
      { status: 200 }
    )
  }
}
