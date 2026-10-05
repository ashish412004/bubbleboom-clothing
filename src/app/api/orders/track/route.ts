import { NextRequest, NextResponse } from 'next/server'
import { getOrderByTracking } from '@/lib/orders'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { orderNumber, verifier } = await req.json()

    if (!orderNumber || !orderNumber.trim()) {
      return NextResponse.json(
        { error: 'Order Number is required.' },
        { status: 400 }
      )
    }

    const user = await getCurrentUser()

    if (!user && (!verifier || !verifier.trim())) {
      return NextResponse.json(
        { error: 'Email or phone number is required to track this order.' },
        { status: 400 }
      )
    }

    const result = await getOrderByTracking(orderNumber, verifier || '', user?.id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ success: true, order: result.data })
  } catch (error: any) {
    console.error('Track order error:', error)
    return NextResponse.json({ error: 'Failed to look up order tracking.' }, { status: 500 })
  }
}
