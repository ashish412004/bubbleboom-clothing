import { NextRequest, NextResponse } from 'next/server'
import { getOrderByTracking } from '@/lib/orders'

export async function POST(req: NextRequest) {
  try {
    const { orderNumber, verifier } = await req.json()

    if (!orderNumber || !verifier) {
      return NextResponse.json(
        { error: 'Both Order Number and Email/Phone Number are required.' },
        { status: 400 }
      )
    }

    const result = await getOrderByTracking(orderNumber, verifier)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ success: true, order: result.data })
  } catch (error: any) {
    console.error('Track order error:', error)
    return NextResponse.json({ error: 'Failed to look up order tracking.' }, { status: 500 })
  }
}
