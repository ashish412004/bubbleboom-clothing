import { NextRequest, NextResponse } from 'next/server'
import { inspectConfirmationToken } from '@/lib/newsletter'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          status: 'invalid',
          message: 'Confirmation token is missing.',
        },
        { status: 400 }
      )
    }

    const inspection = await inspectConfirmationToken({ token })

    return NextResponse.json(inspection, { status: 200 })
  } catch (err: any) {
    console.error('Newsletter token inspection error:', err)
    return NextResponse.json(
      {
        valid: false,
        status: 'invalid',
        message: 'Unable to inspect confirmation link.',
      },
      { status: 500 }
    )
  }
}
