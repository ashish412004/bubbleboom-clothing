import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import {
  resolveVariantId,
  getWishlist,
  getWishlistSummary,
  addToWishlist,
  removeFromWishlist,
  toggleWishlistItem,
  mergeGuestWishlistIntoUserWishlist,
} from '@/lib/wishlist'
import { useCartStore } from '@/lib/cart-store'
import fs from 'fs'

describe('Wishlist Functionality & Supabase Persistence Suite', () => {
  const testUserId = 'test_usr_' + Date.now()
  const testSessionId = 'test_sess_' + Date.now()
  const testVariantId = '17471ccf-3fa5-4745-8018-5e71fd904956'
  const testProductId = '92d1dd51-e0c3-4aa3-b7c2-554ca4c94d66'

  beforeEach(() => {
    vi.restoreAllMocks()
    useCartStore.setState({
      wishlistCount: 0,
      wishlistProductIds: [],
      wishlistVariantIds: [],
    })
  })

  // 1. Variant and Product ID Resolution
  it('correctly resolves variant and product IDs', async () => {
    // Direct variant resolution
    const resVariant = await resolveVariantId(testVariantId)
    expect(resVariant.variantId).toBe(testVariantId)
    expect(resVariant.productId).toBe(testProductId)

    // Product ID resolution finds an active variant of that product
    const resProduct = await resolveVariantId(testProductId)
    expect(resProduct.productId).toBe(testProductId)
    expect(resProduct.variantId).toBeDefined()
  })

  // 2. Add to Wishlist & Deduplication
  it('adds product/variant to wishlist and prevents duplicate entries', async () => {
    // 1st Add
    const res1 = await addToWishlist(testVariantId, testUserId)
    expect(res1.success).toBe(true)
    expect(res1.inWishlist).toBe(true)

    // 2nd Add duplicate
    const res2 = await addToWishlist(testVariantId, testUserId)
    expect(res2.success).toBe(true)
    expect(res2.message).toContain('Already')

    // Add by productId should recognize variant already present
    const res3 = await addToWishlist(testProductId, testUserId)
    expect(res3.success).toBe(true)

    // Verify summary count is 1
    const summary = await getWishlistSummary(testUserId)
    expect(summary.count).toBe(1)
    expect(summary.productIds).toContain(testProductId)
    expect(summary.variantIds).toContain(testVariantId)
  })

  // 3. Retrieve Wishlist with Product Details
  it('retrieves wishlist items with joined product & pricing details', async () => {
    const items = await getWishlist(testUserId)
    expect(items.length).toBeGreaterThanOrEqual(1)
    const item = items.find((i) => i.variant_id === testVariantId)
    expect(item).toBeDefined()
    expect(item?.variant.product.name).toBeDefined()
    expect(item?.variant.product.selling_price).toBeGreaterThan(0)
    expect(Array.isArray(item?.variant.product.images)).toBe(true)
  })

  // 4. Toggle Wishlist Item
  it('toggles wishlist items between in-wishlist and removed', async () => {
    const altSession = 'sess_toggle_' + Date.now()
    
    // Toggle ON
    const toggleOn = await toggleWishlistItem(testVariantId, undefined, altSession)
    expect(toggleOn.inWishlist).toBe(true)

    let summary = await getWishlistSummary(undefined, altSession)
    expect(summary.count).toBe(1)

    // Toggle OFF
    const toggleOff = await toggleWishlistItem(testVariantId, undefined, altSession)
    expect(toggleOff.inWishlist).toBe(false)

    summary = await getWishlistSummary(undefined, altSession)
    expect(summary.count).toBe(0)
  })

  // 5. Remove from Wishlist
  it('removes item from wishlist by variantId or productId cleanly', async () => {
    const remUser = 'user_rem_' + Date.now()
    await addToWishlist(testVariantId, remUser)
    
    const remRes = await removeFromWishlist(testProductId, remUser)
    expect(remRes.success).toBe(true)

    const summary = await getWishlistSummary(remUser)
    expect(summary.count).toBe(0)
  })

  // 6. Guest Wishlist Merging into User Wishlist on Login
  it('merges guest wishlist items into user account upon authentication', async () => {
    const guestSess = 'guest_merge_' + Date.now()
    const targetUser = 'user_merge_' + Date.now()

    await addToWishlist(testVariantId, undefined, guestSess)
    const guestSum = await getWishlistSummary(undefined, guestSess)
    expect(guestSum.count).toBe(1)

    const mergeRes = await mergeGuestWishlistIntoUserWishlist(targetUser, guestSess)
    expect(mergeRes.success).toBe(true)

    const userSum = await getWishlistSummary(targetUser)
    expect(userSum.count).toBe(1)
    expect(userSum.productIds).toContain(testProductId)

    // Clean up
    await removeFromWishlist(testProductId, targetUser)
  })

  // 7. Zustand Store State Synchronization & Optimistic UI
  it('synchronizes Zustand cart/wishlist store state optimistically', () => {
    const store = useCartStore.getState()
    expect(store.isItemWishlisted(testProductId)).toBe(false)

    // Simulate store state update
    useCartStore.setState({
      wishlistCount: 2,
      wishlistProductIds: [testProductId],
      wishlistVariantIds: [testVariantId],
    })

    const updatedStore = useCartStore.getState()
    expect(updatedStore.wishlistCount).toBe(2)
    expect(updatedStore.isItemWishlisted(testProductId)).toBe(true)
    expect(updatedStore.isItemWishlisted(undefined, testVariantId)).toBe(true)
    expect(updatedStore.isItemWishlisted('random_id')).toBe(false)
  })

  // 8. Auth / Login preservation
  it('preserves login redirect next parameter support in login page', () => {
    const loginPageCode = fs.readFileSync('src/app/login/page.tsx', 'utf-8')
    expect(loginPageCode).toContain('getSafeRedirect(params.next')
  })

  // Clean up primary test data
  afterAll?.(async () => {
    await removeFromWishlist(testProductId, testUserId)
  })
})
