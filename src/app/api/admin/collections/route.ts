import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import {
  createCollection,
  updateCollection,
  deleteCollection,
  getCollections,
  getProductsByCollectionId,
  getAvailableProductsForCollection,
} from '@/lib/collections'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const wantsProducts = searchParams.get('products') === 'true'
    const collectionId = searchParams.get('collection_id')
    const search = searchParams.get('search') || undefined

    if (wantsProducts) {
      if (collectionId) {
        const assigned = await getProductsByCollectionId(collectionId)
        return NextResponse.json({ success: true, products: assigned })
      }
      const available = await getAvailableProductsForCollection(search)
      return NextResponse.json({ success: true, products: available })
    }

    const collections = await getCollections(true)
    return NextResponse.json({ success: true, collections })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      slug,
      description,
      short_description,
      banner_image_url,
      mobile_banner_image_url,
      sort_order,
      is_visible,
      is_featured,
      seo_title,
      seo_description,
      seo_image_url,
      product_ids,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 })
    }

    const res = await createCollection({
      name: name.trim(),
      slug: slug?.trim() || undefined,
      description: description?.trim() || null,
      short_description: short_description?.trim() || null,
      banner_image_url: banner_image_url || null,
      mobile_banner_image_url: mobile_banner_image_url || null,
      sort_order: Number(sort_order) || 0,
      is_visible: is_visible !== undefined ? Boolean(is_visible) : true,
      is_featured: Boolean(is_featured),
      seo_title: seo_title?.trim() || null,
      seo_description: seo_description?.trim() || null,
      seo_image_url: seo_image_url || null,
      product_ids: Array.isArray(product_ids) ? product_ids : [],
    })

    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, collection: res.data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
    }

    const res = await updateCollection(id, updates)
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, collection: res.data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await req.json()
        id = body?.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required for deletion' }, { status: 400 })
    }

    const res = await deleteCollection(id)
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Collection archived/deleted successfully', id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
