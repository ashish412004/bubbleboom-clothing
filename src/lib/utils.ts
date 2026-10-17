import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatDiscount(mrp: number, sellingPrice: number): number {
  return Math.round(((mrp - sellingPrice) / mrp) * 100)
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function getSafeImageUrl(
  url: any,
  fallback: string = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
): string {
  if (!url || typeof url !== 'string') return fallback
  const trimmed = url.trim()
  if (!trimmed) return fallback
  // Discard local Windows/disk file paths like C:\Users\...
  if (trimmed.includes('\\') || /^[a-zA-Z]:/.test(trimmed)) {
    return fallback
  }
  // Discard obvious web pages or non-image URLs (e.g. Amazon / Flipkart product pages)
  if (
    trimmed.includes('/dp/') ||
    trimmed.includes('/gp/product/') ||
    trimmed.includes('/p/') && trimmed.includes('flipkart.com') ||
    /\.(html?|php)(\?.*)?$/i.test(trimmed)
  ) {
    return fallback
  }
  // Valid web path or relative public asset
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed
  }
  return fallback
}

/**
 * Resolves any image URL (relative, storage path, or absolute) into a valid,
 * publicly accessible absolute HTTPS URL strictly required for email clients (Gmail, Outlook).
 */
export function toAbsoluteEmailImageUrl(
  url: any,
  fallback: string = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
): string {
  if (!url || typeof url !== 'string') return fallback
  const trimmed = url.trim()
  if (!trimmed) return fallback

  // Discard local disk paths or invalid links
  if (trimmed.includes('\\') || /^[a-zA-Z]:/.test(trimmed)) {
    return fallback
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app').replace(/\/$/, '')
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').replace(/\/$/, '')

  // 1. If absolute URL
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    if (trimmed.includes('localhost:') || trimmed.includes('127.0.0.1:')) {
      const pathPart = trimmed.replace(/^https?:\/\/[^\/]+/, '')
      return `${siteUrl}${pathPart.startsWith('/') ? '' : '/'}${pathPart}`
    }
    return trimmed
  }

  // 2. If relative web path (e.g. /images/products/...)
  if (trimmed.startsWith('/')) {
    return `${siteUrl}${trimmed}`
  }

  // 3. If Supabase storage path (e.g. products/... or product-images/...)
  const cleanPath = trimmed.replace(/^product-images\//, '').replace(/^\/+/, '')
  return `${supabaseUrl}/storage/v1/object/public/product-images/${cleanPath}`
}

export function normalizeColor(c?: string | null): string {
  if (!c) return ''
  const trimmed = c.trim().toLowerCase()
  if (trimmed === 'grey') return 'gray'
  return trimmed
}

export interface ParsedProductImage {
  id?: string
  product_id?: string
  image_url: string
  storage_path?: string | null
  color: string | null
  alt_text: string | null
  sort_order: number
  is_primary?: boolean
}

export function parseProductImage(img: any): ParsedProductImage | null {
  if (!img) return null
  const rawUrl = typeof img === 'string' ? img : img.image_url
  if (!rawUrl) return null
  const imageUrl = getSafeImageUrl(rawUrl)

  let color: string | null = null
  if (typeof img === 'object' && img.color) {
    color = img.color.trim()
  }

  let rawAlt = (typeof img === 'object' && img.alt_text ? img.alt_text : '') || ''
  if (!color && rawAlt) {
    const match = rawAlt.match(/\[color:([^\]]+)\]/i)
    if (match) {
      color = match[1].trim()
    }
  }

  let isPrimary = false
  if (typeof img === 'object' && typeof img.is_primary === 'boolean') {
    isPrimary = img.is_primary
  } else if (rawAlt && /\[primary\]/i.test(rawAlt)) {
    isPrimary = true
  }

  // Strip [color:...] and [primary] tags from user-facing alt text for clean accessibility presentation
  const cleanAlt = rawAlt
    .replace(/\[color:[^\]]+\]/gi, '')
    .replace(/\[primary\]/gi, '')
    .trim()

  return {
    id: typeof img === 'object' ? img.id : undefined,
    product_id: typeof img === 'object' ? img.product_id : undefined,
    image_url: imageUrl,
    storage_path: (typeof img === 'object' ? img.storage_path : null) || null,
    color: color || null,
    alt_text: cleanAlt || null,
    sort_order: typeof img === 'object' && typeof img.sort_order === 'number' ? img.sort_order : 0,
    is_primary: isPrimary,
  }
}

/**
 * Returns all images for a specific product colour variant, ordered with the primary image first.
 * Never leaks photos from another named colour.
 */
export function findImagesForVariantColor(
  images: any[],
  color?: string | null
): ParsedProductImage[] {
  if (!images || images.length === 0) return []
  const parsed = images
    .map(parseProductImage)
    .filter((i): i is ParsedProductImage => Boolean(i))
  if (parsed.length === 0) return []

  const hasAnyColorAssigned = parsed.some((img) => Boolean(img.color))

  if (color) {
    const targetNorm = normalizeColor(color)
    const colorMatches = parsed.filter(
      (img) => img.color && normalizeColor(img.color) === targetNorm
    )

    if (colorMatches.length > 0) {
      return colorMatches.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      })
    }

    // If colour has no specific photos:
    // If other colours have photos, check if there are unassigned/general images
    if (hasAnyColorAssigned) {
      const general = parsed.filter((img) => !img.color)
      return general.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      })
    }
  }

  // No colour specified or legacy product without colour tags: return all images
  return parsed.sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
}

/**
 * Returns the primary/main image for a colour variant.
 */
export function findImageForVariantColor(
  images: any[],
  color?: string | null
): ParsedProductImage | null {
  const list = findImagesForVariantColor(images, color)
  return list[0] || null
}

