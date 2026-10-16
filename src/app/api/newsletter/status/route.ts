import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Newsletter service has been retired.' },
    { status: 410 }
  )
}
