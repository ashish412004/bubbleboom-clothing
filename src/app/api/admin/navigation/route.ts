import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import {
  getNavigationItems,
  updateNavigationItems,
  resetNavigationToDefaults,
  NavigationItem,
} from '@/lib/navigation'

export const dynamic = 'force-dynamic'

async function checkAdminAuth() {
  const user = await getCurrentUser()
  if (!user || !(await isAdmin(user.id))) {
    return null
  }
  return user
}

export async function GET(req: NextRequest) {
  try {
    const user = await checkAdminAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const items = await getNavigationItems({ forAdmin: true })
    return NextResponse.json({ success: true, items })
  } catch (err: any) {
    console.error('[Admin/Navigation] GET error:', err)
    return NextResponse.json({ error: err.message || 'Failed to load navigation items' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await checkAdminAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { items } = body

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Expected items array' }, { status: 400 })
    }

    const res = await updateNavigationItems(items, user.id)
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to update navigation' }, { status: 500 })
    }

    return NextResponse.json({ success: true, items: res.items })
  } catch (err: any) {
    console.error('[Admin/Navigation] PUT error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save navigation' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await checkAdminAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()

    // 1. Reset to defaults action
    if (body.action === 'reset') {
      const res = await resetNavigationToDefaults(user.id)
      return NextResponse.json(res)
    }

    // 2. Add single menu item
    const newItem: NavigationItem = body.item
    if (!newItem || !newItem.name || !newItem.url) {
      return NextResponse.json({ error: 'Menu name and destination URL are required' }, { status: 400 })
    }

    const currentItems = await getNavigationItems({ forAdmin: true })
    const maxOrder = currentItems.reduce((max, it) => Math.max(max, it.sort_order), 0)

    const fullItem: NavigationItem = {
      id: newItem.id || `nav-custom-${Date.now()}`,
      name: newItem.name.trim(),
      type: newItem.type || 'custom',
      url: newItem.url.trim().startsWith('/') || newItem.url.trim().startsWith('http')
        ? newItem.url.trim()
        : `/${newItem.url.trim()}`,
      is_visible: newItem.is_visible ?? true,
      show_on_desktop: newItem.show_on_desktop ?? true,
      show_on_mobile: newItem.show_on_mobile ?? true,
      auto_hide_empty: newItem.auto_hide_empty ?? false,
      sort_order: typeof newItem.sort_order === 'number' ? newItem.sort_order : maxOrder + 1,
      is_default: false,
      badge: newItem.badge ? newItem.badge.trim() : null,
      target: newItem.target === '_blank' ? '_blank' : '_self',
      dropdown_items: newItem.dropdown_items || [],
    }

    const updatedList = [...currentItems, fullItem]
    const res = await updateNavigationItems(updatedList, user.id)

    return NextResponse.json(res)
  } catch (err: any) {
    console.error('[Admin/Navigation] POST error:', err)
    return NextResponse.json({ error: err.message || 'Failed to add navigation item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await checkAdminAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    const currentItems = await getNavigationItems({ forAdmin: true })
    const targetItem = currentItems.find((it) => it.id === id)

    if (!targetItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    let updatedList: NavigationItem[]
    // If it is a core default item, archive/hide instead of permanent destructive deletion
    if (targetItem.is_default) {
      updatedList = currentItems.map((it) => (it.id === id ? { ...it, is_visible: false } : it))
    } else {
      updatedList = currentItems.filter((it) => it.id !== id)
    }

    // Re-index sort order
    updatedList = updatedList.map((it, idx) => ({ ...it, sort_order: idx + 1 }))

    const res = await updateNavigationItems(updatedList, user.id)
    return NextResponse.json(res)
  } catch (err: any) {
    console.error('[Admin/Navigation] DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete navigation item' }, { status: 500 })
  }
}
