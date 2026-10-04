import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createCollection, updateCollection, deleteCollection } from '@/lib/collections'
import { generateSlug } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { name, slug, description, banner_image_url, sort_order, is_visible } = body

    if (!name) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 })
    }

    const res = await createCollection({
      name,
      slug: slug ? generateSlug(slug) : generateSlug(name),
      description: description || null,
      banner_image_url: banner_image_url || null,
      sort_order: Number(sort_order) || 0,
      is_visible: is_visible !== undefined ? Boolean(is_visible) : true,
    } as any)

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

    return NextResponse.json({ success: true, message: 'Collection deleted successfully', id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
