/**
 * Bubble Boom – Product Mode & Validation System
 * Safe for both Client Components and Server Components (no node fs/headers dependencies).
 */

/**
 * Determines whether a product is classified as a Test / Demo item.
 * Test products:
 * - Remain visible on storefront for UI, sizing, image, and wishlist testing
 * - Remain editable in Admin
 * - Blocked from real payment collection / live COD checkout in production
 * - Excluded from Google indexing (noindex) and sitemap.xml
 * - Excluded from Google Product schema rich result markup
 */
export function isProductTest(product: any): boolean {
  if (!product) return false

  // 1. Authoritative database field (Single source of truth)
  // When an explicit mode exists in the database, tags and slug heuristics must NEVER override it.
  if (product.is_test === false || product.product_mode === 'live') {
    return false
  }
  if (product.is_test === true || product.product_mode === 'test') {
    return true
  }

  // 2. Tag markers (legacy fail-safe ONLY when explicit database fields are null or undefined)
  const tags = Array.isArray(product.tags)
    ? product.tags.map((t: string) => String(t).toLowerCase().trim())
    : []
  if (tags.includes('mode:live') || tags.includes('live-product')) {
    return false
  }
  if (tags.includes('mode:test') || tags.includes('test-product') || tags.includes('demo')) {
    return true
  }

  // 3. Name or slug fallback detection for unclassified legacy demo items
  const name = String(product.name || '').toLowerCase()
  const slug = String(product.slug || '').toLowerCase()
  if (name.includes('demo') || slug.includes('demo') || name.includes('test') || slug.includes('test')) {
    return true
  }

  // 4. Default: unclassified inventory during pre-launch testing defaults to test (safe)
  return true
}

export function getProductMode(product: any): 'test' | 'live' {
  return isProductTest(product) ? 'test' : 'live'
}

/**
 * Validates whether a product meets all criteria for Live customer purchase mode.
 */
export function validateProductForLive(
  product: any,
  variants: any[] = [],
  images: any[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 1. Core identification
  if (!product?.name || String(product.name).trim().length < 3) {
    errors.push('Product name is required (at least 3 characters).')
  }
  if (!product?.slug || String(product.slug).trim().length < 3) {
    errors.push('Product URL slug is required.')
  }
  if (!product?.description || String(product.description).trim().length < 10) {
    errors.push('Product description is required (at least 10 characters).')
  }

  // 2. Real price & MRP
  const sellingPrice = Number(product?.selling_price)
  const mrp = Number(product?.mrp) || sellingPrice
  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    errors.push('A valid selling price greater than ₹0 is required for live purchase.')
  }
  if (mrp < sellingPrice) {
    errors.push('MRP cannot be lower than the selling price.')
  }

  // 3. Real photos
  const validImages = (images || []).filter((img: any) => {
    const url = typeof img === 'string' ? img : img?.image_url
    return Boolean(url && url.trim().length > 0)
  })
  if (validImages.length === 0) {
    errors.push('At least one authentic product photograph is required.')
  }

  // 4. Variants & inventory
  const activeVariants = (variants || []).filter((v: any) => v.is_active !== false)
  if (activeVariants.length === 0) {
    errors.push('At least one active size and colour variant is required.')
  } else {
    const totalStock = activeVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
    if (totalStock <= 0) {
      errors.push('Live products must have real physical stock quantity (> 0 units).')
    }
  }

  // 5. Categorization & availability
  if (!product?.category_id && !product?.category) {
    errors.push('A valid product category must be assigned for live navigation.')
  }
  if (product?.is_published === false) {
    errors.push('Product must be marked as Published to be accessible in live mode.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
