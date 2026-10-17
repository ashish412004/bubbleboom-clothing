import { createServiceClient, createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server'
import {
  NavigationItem,
  NavigationSettings,
  DEFAULT_NAVIGATION_ITEMS,
} from '@/types/navigation'
import { revalidatePath } from 'next/cache'

export * from '@/types/navigation'

interface NavCacheEntry {
  items: NavigationItem[]
  timestamp: number
}

let navCache: NavCacheEntry | null = null
const NAV_TTL_MS = 30 * 1000 // 30 seconds edge cache

export function clearNavigationCache() {
  navCache = null
}

/**
 * Calculates live eligible product counts for all navigation items
 * using authoritative published and active product records.
 */
export async function calculateEligibleProductCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {
    'nav-shop-all': 0,
    'nav-new-arrivals': 0,
    'nav-men': 0,
    'nav-women': 0,
    'nav-footwear': 0,
    'nav-collections': 0,
    'nav-sale': 0,
  }

  if (!isSupabaseConfigured()) {
    // Dev fallback counts
    counts['nav-shop-all'] = 2
    counts['nav-new-arrivals'] = 2
    counts['nav-men'] = 2
    counts['nav-women'] = 0
    counts['nav-footwear'] = 1
    counts['nav-collections'] = 1
    counts['nav-sale'] = 2
    return counts
  }

  try {
    const supabase = createPublicClient()

    // 1. Fetch published & active products with tags, department, category, mrp, selling_price
    const { data: products } = await supabase
      .from('products')
      .select('id, category_id, tags, mrp, selling_price, department, category:categories(id, slug, name)')
      .eq('is_published', true)
      .eq('is_active', true)

    const publishedProducts = products || []

    counts['nav-shop-all'] = publishedProducts.length
    counts['nav-new-arrivals'] = publishedProducts.length

    // Men: products where department is 'men' or 'unisex' OR tags contains 'men' or 'unisex'
    counts['nav-men'] = publishedProducts.filter((p: any) => {
      const dept = (p.department || '').toLowerCase().trim()
      const tags = Array.isArray(p.tags) ? p.tags.map((t: string) => t.toLowerCase()) : []
      return (
        dept === 'men' ||
        dept === 'unisex' ||
        tags.includes('men') ||
        tags.includes('unisex')
      )
    }).length

    // Women: products where department is 'women' or 'unisex' OR tags contains 'women' or 'unisex'
    counts['nav-women'] = publishedProducts.filter((p: any) => {
      const dept = (p.department || '').toLowerCase().trim()
      const tags = Array.isArray(p.tags) ? p.tags.map((t: string) => t.toLowerCase()) : []
      return (
        dept === 'women' ||
        dept === 'unisex' ||
        tags.includes('women') ||
        tags.includes('unisex')
      )
    }).length

    // Footwear: products belonging to Footwear category
    counts['nav-footwear'] = publishedProducts.filter((p: any) => {
      const catSlug = p.category?.slug?.toLowerCase() || ''
      const catName = p.category?.name?.toLowerCase() || ''
      const tags = Array.isArray(p.tags) ? p.tags.map((t: string) => t.toLowerCase()) : []
      return (
        catSlug === 'footwear' ||
        catName.includes('footwear') ||
        tags.includes('footwear') ||
        tags.includes('shoes') ||
        tags.includes('sneakers')
      )
    }).length

    // Sale: products with active genuine discount (mrp > selling_price)
    counts['nav-sale'] = publishedProducts.filter(
      (p: any) => typeof p.mrp === 'number' && typeof p.selling_price === 'number' && p.mrp > p.selling_price
    ).length

    // Collections: count published collections
    const { count: colCount } = await supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('is_visible', true)

    counts['nav-collections'] = colCount || 0

    return counts
  } catch (err) {
    console.warn('[Navigation] Error computing product counts:', err)
    return counts
  }
}

/**
 * Retrieve navigation items from store_settings.
 * Attaches real eligible product counts and respects auto-hide rules.
 */
export async function getNavigationItems(options?: {
  forAdmin?: boolean
  device?: 'desktop' | 'mobile' | 'all'
}): Promise<NavigationItem[]> {
  const { forAdmin = false, device = 'all' } = options || {}

  let rawItems: NavigationItem[] = DEFAULT_NAVIGATION_ITEMS

  // Check in-memory cache if not admin request
  if (!forAdmin && navCache && Date.now() - navCache.timestamp < NAV_TTL_MS) {
    rawItems = navCache.items
  } else if (isSupabaseConfigured()) {
    try {
      const supabase = createPublicClient()
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'navigation')
        .maybeSingle()

      const val = data?.value as any
      if (!error && val?.items && Array.isArray(val.items)) {
        rawItems = val.items
      } else {
        // Fallback: seed or use default items
        rawItems = DEFAULT_NAVIGATION_ITEMS
      }
    } catch (err) {
      console.warn('[Navigation] Failed to fetch settings, using defaults:', err)
      rawItems = DEFAULT_NAVIGATION_ITEMS
    }

    if (!forAdmin) {
      navCache = { items: rawItems, timestamp: Date.now() }
    }
  }

  // Calculate product counts for auto-hide and admin view
  const counts = await calculateEligibleProductCounts()

  const enrichedItems = rawItems.map((item) => {
    let eligibleCount = counts[item.id]
    if (eligibleCount === undefined) {
      // Dynamic count for category/collection items if needed
      if (item.type === 'category' && item.url.includes('category=')) {
        const cat = item.url.split('category=')[1]?.split('&')[0]?.toLowerCase()
        if (cat === 'footwear') eligibleCount = counts['nav-footwear']
        else eligibleCount = counts['nav-shop-all']
      } else if (item.type === 'collection') {
        eligibleCount = counts['nav-collections']
      } else if (item.type === 'sale') {
        eligibleCount = counts['nav-sale']
      } else {
        eligibleCount = counts['nav-shop-all']
      }
    }

    return {
      ...item,
      eligible_count: eligibleCount,
    }
  })

  // For Admin: return all items with counts attached, sorted by order
  if (forAdmin) {
    return enrichedItems.sort((a, b) => a.sort_order - b.sort_order)
  }

  // For Public Storefront:
  // 1. Manual Admin is_visible takes highest priority (if false, ALWAYS hide)
  // 2. If auto_hide_empty is true and eligible_count === 0, auto-hide
  // 3. Filter by device (desktop / mobile)
  const visibleItems = enrichedItems
    .filter((item) => {
      // Master toggle check
      if (!item.is_visible) return false

      // Auto-hide when empty check
      if (item.auto_hide_empty && item.eligible_count === 0) {
        return false
      }

      // Device check
      if (device === 'desktop' && item.show_on_desktop === false) return false
      if (device === 'mobile' && item.show_on_mobile === false) return false

      return true
    })
    .map((item) => {
      // Filter dropdown items by device and visibility
      if (item.dropdown_items && Array.isArray(item.dropdown_items)) {
        const filteredSubs = item.dropdown_items
          .filter((sub) => {
            if (!sub.is_visible) return false
            if (device === 'desktop' && sub.show_on_desktop === false) return false
            if (device === 'mobile' && sub.show_on_mobile === false) return false
            return true
          })
          .sort((a, b) => a.sort_order - b.sort_order)

        return { ...item, dropdown_items: filteredSubs }
      }
      return item
    })
    .sort((a, b) => a.sort_order - b.sort_order)

  return visibleItems
}

/**
 * Persists navigation configuration into Supabase store_settings.
 * Validates URLs and orders, logs admin action, and triggers cache revalidation.
 */
export async function updateNavigationItems(
  items: NavigationItem[],
  adminUserId?: string
): Promise<{ success: boolean; items: NavigationItem[]; error?: string }> {
  clearNavigationCache()

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, items: [], error: 'Navigation items must be a non-empty array' }
  }

  // Normalize and sanitize each item
  const sanitizedItems: NavigationItem[] = items.map((item, idx) => {
    const rawUrl = (item.url || '').trim()
    const validUrl = rawUrl.startsWith('/') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `/${rawUrl}`

    const sanitizedDropdown = Array.isArray(item.dropdown_items)
      ? item.dropdown_items.map((sub, sIdx) => ({
          id: sub.id || `sub-${idx}-${sIdx}-${Date.now()}`,
          label: (sub.label || '').trim(),
          url: (sub.url || '').trim().startsWith('/') || (sub.url || '').trim().startsWith('http')
            ? (sub.url || '').trim()
            : `/${(sub.url || '').trim()}`,
          sort_order: typeof sub.sort_order === 'number' ? sub.sort_order : sIdx + 1,
          is_visible: sub.is_visible ?? true,
          show_on_desktop: sub.show_on_desktop ?? true,
          show_on_mobile: sub.show_on_mobile ?? true,
        }))
      : []

    return {
      id: item.id || `nav-${Date.now()}-${idx}`,
      name: (item.name || '').trim(),
      type: item.type || 'link',
      url: validUrl,
      is_visible: item.is_visible ?? true,
      show_on_desktop: item.show_on_desktop ?? true,
      show_on_mobile: item.show_on_mobile ?? true,
      auto_hide_empty: item.auto_hide_empty ?? false,
      sort_order: typeof item.sort_order === 'number' ? item.sort_order : idx + 1,
      is_default: Boolean(item.is_default),
      badge: item.badge ? item.badge.trim() : null,
      target: item.target === '_blank' ? '_blank' : '_self',
      dropdown_items: sanitizedDropdown,
    }
  })

  if (!isSupabaseConfigured()) {
    return { success: true, items: sanitizedItems }
  }

  try {
    const supabase = await createServiceClient()

    const payload: NavigationSettings = {
      items: sanitizedItems,
      updated_at: new Date().toISOString(),
      updated_by: adminUserId,
    }

    const { error } = await supabase.from('store_settings').upsert({
      key: 'navigation',
      value: payload as any,
      description: 'Public storefront header and mobile navigation configuration',
      updated_at: new Date().toISOString(),
      updated_by: adminUserId || null,
    })

    if (error) {
      throw error
    }

    // Also sync to navigation_items table if it exists (idempotent, won't break if not migrated yet)
    try {
      for (const item of sanitizedItems) {
        await supabase.from('navigation_items').upsert({
          id: item.id,
          name: item.name,
          type: item.type,
          url: item.url,
          is_visible: item.is_visible,
          show_on_desktop: item.show_on_desktop,
          show_on_mobile: item.show_on_mobile,
          auto_hide_empty: item.auto_hide_empty,
          sort_order: item.sort_order,
          is_default: item.is_default ?? false,
          badge: item.badge,
          target: item.target,
          dropdown_items: (item.dropdown_items || []) as any,
          updated_at: new Date().toISOString(),
        })
      }
    } catch {}

    // Audit log
    if (adminUserId) {
      try {
        await supabase.from('admin_audit_logs').insert({
          admin_id: adminUserId,
          action: 'UPDATE_NAVIGATION_MENU',
          entity: 'store_settings',
          entity_id: 'navigation',
          metadata: { itemCount: sanitizedItems.length },
        })
      } catch {}
    }

    // Instant Next.js edge revalidation across public routes
    try {
      revalidatePath('/', 'layout')
      revalidatePath('/', 'page')
      revalidatePath('/shop', 'page')
      revalidatePath('/categories', 'page')
      revalidatePath('/collections', 'page')
      revalidatePath('/admin/settings', 'page')
    } catch {}

    return { success: true, items: sanitizedItems }
  } catch (err: any) {
    console.error('[Navigation] Failed to save navigation settings:', err)
    return { success: false, items: [], error: err.message || 'Failed to update navigation' }
  }
}

/**
 * Reset navigation back to Bubble Boom default configuration
 */
export async function resetNavigationToDefaults(adminUserId?: string) {
  return updateNavigationItems(DEFAULT_NAVIGATION_ITEMS, adminUserId)
}
