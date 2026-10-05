import { NextRequest, NextResponse } from 'next/server'
import { getStoreSettings, StoreShippingSettings } from '@/lib/settings'
import { checkPincodeDelivery } from '@/lib/delivery'

export async function GET(request: NextRequest) {
  const pinCode = request.nextUrl.searchParams.get('pincode') || ''
  const shippingSettings = await getStoreSettings<StoreShippingSettings>('shipping')
  const result = checkPincodeDelivery(pinCode, shippingSettings)

  return NextResponse.json(result, { status: result.valid ? 200 : 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const pinCode = (body.pincode || body.pin_code || '').toString()

    const shippingSettings = await getStoreSettings<StoreShippingSettings>('shipping')
    const result = checkPincodeDelivery(pinCode, shippingSettings)

    return NextResponse.json(result, { status: result.valid ? 200 : 400 })
  } catch (err: any) {
    console.error('Delivery check API error:', err)
    return NextResponse.json(
      { error: err.message || 'Error checking delivery' },
      { status: 500 }
    )
  }
}
