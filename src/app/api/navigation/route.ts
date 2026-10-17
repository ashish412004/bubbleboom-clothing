import { NextRequest, NextResponse } from 'next/server'
import { getNavigationItems } from '@/lib/navigation'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const device = (searchParams.get('device') || 'all') as 'desktop' | 'mobile' | 'all'

    const items = await getNavigationItems({
      forAdmin: false,
      device,
    })

    return NextResponse.json(
      { success: true, items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (err: any) {
    console.error('[API/Navigation] Error fetching items:', err)
    return NextResponse.json(
      { error: 'Failed to load navigation items' },
      { status: 500 }
    )
  }
}
