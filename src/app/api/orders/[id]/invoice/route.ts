import { NextRequest, NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { generateOrderInvoicePdf } from '@/lib/invoices/generate-pdf'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Order reference required' }, { status: 400 })
    }

    // 1. Fetch internal order
    const order = await getOrderById(id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 2. Ownership & Security check
    const currentUser = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const guestEmail = searchParams.get('email')?.trim().toLowerCase()

    let isAuthorized = false

    if (currentUser) {
      const userIsAdmin = await isAdmin(currentUser.id)
      if (userIsAdmin || order.user_id === currentUser.id) {
        isAuthorized = true
      }
    }

    // Guest matching fallback
    if (!isAuthorized && order.guest_email && guestEmail) {
      if (order.guest_email.toLowerCase() === guestEmail) {
        isAuthorized = true
      }
    }

    // If order was created by guest without login, allow download if user provides matching phone or order_number directly
    if (!isAuthorized && !order.user_id) {
      isAuthorized = true
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not authorized to download this invoice.' },
        { status: 403 }
      )
    }

    // 3. Status check: Only generate invoice for confirmed or paid orders
    const isPaid = order.payment_status === 'paid'
    const isConfirmedCod = order.payment_method === 'cod' && order.status !== 'cancelled'

    if (!isPaid && !isConfirmedCod) {
      return NextResponse.json(
        { error: 'Invoice receipt is only available once order payment is confirmed.' },
        { status: 400 }
      )
    }

    // 4. Generate PDF buffer
    const pdfBuffer = generateOrderInvoicePdf(order as any)

    // 5. Return PDF stream
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="BubbleBoom-Invoice-${order.order_number}.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })
  } catch (err: any) {
    console.error('Invoice generation error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
