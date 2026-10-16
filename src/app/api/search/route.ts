import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/products'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limitParam = parseInt(searchParams.get('limit') || '12', 10)
    const limit = Math.min(50, Math.max(1, isNaN(limitParam) ? 12 : limitParam))

    if (!q) {
      return NextResponse.json(
        {
          query: '',
          products: [],
          suggestions: ['Oversized Tee', 'Heavyweight Hoodie', 'Cargo Pants', 'Boxy Shirt', 'Acid Wash', 'Monochrome'],
          total: 0,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      )
    }

    const allMatched = await getProducts({ search: q })
    const products = allMatched.slice(0, limit).map((p) => {
      const firstImg = p.images?.[0]?.image_url || null
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        mrp: p.mrp,
        selling_price: p.selling_price,
        image_url: firstImg,
        category: p.category?.name || null,
        in_stock: p.variants?.some((v: any) => v.is_active && v.stock > 0) ?? true,
      }
    })

    // Generate smart keyword suggestions based on product names & categories
    const suggestionSet = new Set<string>()
    const qLower = q.toLowerCase()

    for (const p of allMatched) {
      if (p.name.toLowerCase().includes(qLower)) {
        suggestionSet.add(p.name)
      }
      if (p.category?.name && p.category.name.toLowerCase().includes(qLower)) {
        suggestionSet.add(p.category.name)
      }
      if (Array.isArray(p.tags)) {
        for (const tag of p.tags) {
          if (typeof tag === 'string' && tag.toLowerCase().includes(qLower)) {
            suggestionSet.add(tag)
          }
        }
      }
      if (suggestionSet.size >= 6) break
    }

    return NextResponse.json(
      {
        query: q,
        products,
        suggestions: Array.from(suggestionSet).slice(0, 5),
        total: allMatched.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (err: any) {
    console.error('Search API error:', err)
    return NextResponse.json(
      { error: err.message || 'Search request failed', products: [], suggestions: [], total: 0 },
      { status: 500 }
    )
  }
}
