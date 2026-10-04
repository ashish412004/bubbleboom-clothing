import { NextRequest, NextResponse } from 'next/server'
import { adjustInventory } from '@/lib/inventory'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { variantId, quantityChange, notes, movementType } = await req.json()

    if (!variantId || quantityChange === undefined || !notes) {
      return NextResponse.json(
        { error: 'Variant ID, quantity adjustment, and audit reason note are required' },
        { status: 400 }
      )
    }

    const result = await adjustInventory(
      variantId,
      Number(quantityChange),
      undefined,
      movementType || 'adjustment',
      notes,
      user.id
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, updatedStock: result.newStock })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
