import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createCategory, updateCategory, deleteCategory } from '@/lib/categories'
import { generateSlug } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

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
      image_url,
      featured_product_id,
      auto_image,
      show_on_homepage,
      homepage_order,
      sort_order,
      is_active,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const res = await createCategory({
      name: name.trim(),
      slug: slug ? generateSlug(slug) : generateSlug(name.trim()),
      description: description ? description.trim() : null,
      image_url: image_url ? image_url.trim() : null,
      featured_product_id: featured_product_id || null,
      auto_image: auto_image !== undefined ? Boolean(auto_image) : true,
      show_on_homepage: show_on_homepage !== undefined ? Boolean(show_on_homepage) : false,
      homepage_order: Number(homepage_order) || 99,
      sort_order: Number(sort_order) || 0,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    } as any)

    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    try {
      revalidatePath('/', 'layout')
      revalidatePath('/categories')
      revalidatePath('/admin/categories')
    } catch {}

    return NextResponse.json({ success: true, category: res.data })
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
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const res = await updateCategory(id, updates)
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    try {
      revalidatePath('/', 'layout')
      revalidatePath('/categories')
      revalidatePath('/admin/categories')
    } catch {}

    return NextResponse.json({ success: true, category: res.data })
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
      return NextResponse.json({ error: 'Category ID is required for deletion' }, { status: 400 })
    }

    const res = await deleteCategory(id)
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    try {
      revalidatePath('/', 'layout')
      revalidatePath('/categories')
      revalidatePath('/admin/categories')
    } catch {}

    return NextResponse.json({ success: true, message: 'Category deleted successfully', id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
