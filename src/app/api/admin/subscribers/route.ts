import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Newsletter subscriber management has been retired.' },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'Newsletter subscriber management has been retired.' },
    { status: 410 }
  )
}
