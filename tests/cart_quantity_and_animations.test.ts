import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCartStore, CartStoreItem } from '@/lib/cart-store'
import { calculateCartTotals } from '@/lib/cart'

describe('Bubble Boom – Premium Cart Quantity Controls & Smooth Remove Animations Suite', () => {
  beforeEach(() => {
    useCartStore.getState().resetCartAndWishlist()
    vi.restoreAllMocks()
  })

  const mockItemUK10: CartStoreItem = {
    id: 'item-uk-10',
    variant_id: 'variant-sneaker-uk-10',
    quantity: 2,
    variant: {
      id: 'variant-sneaker-uk-10',
      product_id: 'prod-sneaker-001',
      sku: 'BB-SNK-BLK-10',
      color: 'Black',
      size: 'UK 10',
      stock: 5,
      product: {
        id: 'prod-sneaker-001',
        name: 'Monochrome Chunky Sneakers',
        slug: 'bubble-boom-monochrome-chunky-sneakers',
        mrp: 3999,
        selling_price: 2499,
      },
    },
  }

  const mockItemUK6: CartStoreItem = {
    id: 'item-uk-6',
    variant_id: 'variant-sneaker-uk-6',
    quantity: 1,
    variant: {
      id: 'variant-sneaker-uk-6',
      product_id: 'prod-sneaker-001',
      sku: 'BB-SNK-BLK-6',
      color: 'Black',
      size: 'UK 6',
      stock: 3,
      product: {
        id: 'prod-sneaker-001',
        name: 'Monochrome Chunky Sneakers',
        slug: 'bubble-boom-monochrome-chunky-sneakers',
        mrp: 3999,
        selling_price: 2499,
      },
    },
  }

  it('1. Quantity 2 -> Plus -> 3 increases quantity and recalculates totals', async () => {
    useCartStore.getState().syncCartState([mockItemUK10])

    // Mock successful backend patch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any)

    const updatePromise = useCartStore.getState().updateCartItemQuantityAction('item-uk-10', 3)
    
    // Optimistic check immediately
    const state = useCartStore.getState()
    expect(state.items[0].quantity).toBe(3)
    expect(state.itemCount).toBe(3)
    expect(state.summary?.subtotal_paise).toBe(3 * 2499 * 100)

    const res = await updatePromise
    expect(res.success).toBe(true)
  })

  it('2. Quantity 2 -> Minus -> 1 decreases quantity and updates cart count', async () => {
    useCartStore.getState().syncCartState([{ ...mockItemUK10, quantity: 2 }])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any)

    const updatePromise = useCartStore.getState().updateCartItemQuantityAction('item-uk-10', 1)

    const state = useCartStore.getState()
    expect(state.items[0].quantity).toBe(1)
    expect(state.itemCount).toBe(1)
    expect(state.summary?.subtotal_paise).toBe(249900)

    const res = await updatePromise
    expect(res.success).toBe(true)
  })

  it('3. Quantity 1 -> Minus -> Item is automatically removed without validation error or popup', async () => {
    useCartStore.getState().syncCartState([mockItemUK6])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any)

    // Decrementing from 1 -> 0 triggers removal
    const res = await useCartStore.getState().updateCartItemQuantityAction('item-uk-6', 0)
    expect(res.success).toBe(true)

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(0)
    expect(state.itemCount).toBe(0)
    expect(state.summary?.subtotal_paise).toBe(0)
  })

  it('4. Delete icon -> Item is removed and cart totals update immediately', async () => {
    useCartStore.getState().syncCartState([mockItemUK10, mockItemUK6])
    expect(useCartStore.getState().itemCount).toBe(3)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any)

    const res = await useCartStore.getState().removeCartItemAction('item-uk-10')
    expect(res.success).toBe(true)

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].id).toBe('item-uk-6')
    expect(state.itemCount).toBe(1)
    expect(state.summary?.subtotal_paise).toBe(249900)
  })

  it('5. Remove last item -> transitions cleanly to empty cart (count = 0, subtotal = 0)', async () => {
    useCartStore.getState().syncCartState([mockItemUK6])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any)

    await useCartStore.getState().removeCartItemAction('item-uk-6')

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(0)
    expect(state.itemCount).toBe(0)
    expect(state.summary?.subtotal_paise).toBe(0)
    expect(state.summary?.total_paise).toBe(0)
  })

  it('6. Different shoe sizes (UK 10 vs UK 6) of the same product remain completely distinct', async () => {
    useCartStore.getState().syncCartState([mockItemUK10, mockItemUK6])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any)

    // Changing UK 10 must NOT mutate UK 6
    await useCartStore.getState().updateCartItemQuantityAction('item-uk-10', 4)

    const state = useCartStore.getState()
    const uk10 = state.items.find((i) => i.id === 'item-uk-10')
    const uk6 = state.items.find((i) => i.id === 'item-uk-6')

    expect(uk10?.quantity).toBe(4)
    expect(uk6?.quantity).toBe(1)
    expect(state.itemCount).toBe(5)
  })

  it('7. Cart totals and shipping threshold update accurately', () => {
    const singleSneaker = [{ ...mockItemUK6, quantity: 1 }]
    const totalsBelow = calculateCartTotals(singleSneaker as any)
    expect(totalsBelow.subtotal_paise).toBe(249900)
    // 2499 is above free shipping threshold (1499), so shipping is 0
    expect(totalsBelow.shipping_paise).toBe(0)

    const cheapItem = [
      {
        id: 'tee-1',
        quantity: 1,
        variant: {
          product: { selling_price: 999 },
        },
      },
    ]
    const totalsWithShipping = calculateCartTotals(cheapItem as any)
    expect(totalsWithShipping.subtotal_paise).toBe(99900)
    expect(totalsWithShipping.shipping_paise).toBe(9900)
    expect(totalsWithShipping.total_paise).toBe(99900 + 9900)
  })

  it('8. Cart badge count matches sum of all item quantities', () => {
    useCartStore.getState().syncCartState([
      { ...mockItemUK10, quantity: 3 },
      { ...mockItemUK6, quantity: 2 },
    ])
    expect(useCartStore.getState().itemCount).toBe(5)
  })

  it('9. Rapid clicking preserves latest requested quantity and prevents race conditions', async () => {
    useCartStore.getState().syncCartState([{ ...mockItemUK10, quantity: 1 }])

    let fetchCalls = 0
    let lastDispatchedQty = 0

    global.fetch = vi.fn().mockImplementation(async (_url, opts: any) => {
      fetchCalls++
      const body = JSON.parse(opts.body)
      lastDispatchedQty = body.quantity
      return {
        ok: true,
        json: async () => ({ success: true }),
      }
    })

    // Simulate 3 rapid clicks within milliseconds
    const p1 = useCartStore.getState().updateCartItemQuantityAction('item-uk-10', 2)
    const p2 = useCartStore.getState().updateCartItemQuantityAction('item-uk-10', 3)
    const p3 = useCartStore.getState().updateCartItemQuantityAction('item-uk-10', 4)

    // Store state must immediately reflect 4
    expect(useCartStore.getState().items[0].quantity).toBe(4)

    await Promise.all([p1, p2, p3])

    // Due to debouncing, earlier in-flight timers are cleared and only the final quantity is dispatched
    expect(lastDispatchedQty).toBe(4)
    expect(useCartStore.getState().items[0].quantity).toBe(4)
  })

  it('10. Quantity never exceeds available stock', async () => {
    useCartStore.getState().syncCartState([{ ...mockItemUK10, quantity: 5 }]) // Stock is 5
    const maxStock = mockItemUK10.variant.stock
    expect(maxStock).toBe(5)

    // Trying to restore or increase beyond stock
    const excessItem = { ...mockItemUK10, quantity: 10 }
    const res = await useCartStore.getState().restoreCartItemAction(excessItem)
    expect(res.success).toBe(false)
    expect(res.error).toContain('Product is no longer available in the requested quantity')
  })

  it('11. Failed backend request rolls back to previous confirmed state', async () => {
    useCartStore.getState().syncCartState([{ ...mockItemUK10, quantity: 2 }])

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Database timeout' }),
    } as any)

    const res = await useCartStore.getState().updateCartItemQuantityAction('item-uk-10', 3)
    expect(res.success).toBe(false)

    // Verified rollback
    const state = useCartStore.getState()
    expect(state.items[0].quantity).toBe(2)
    expect(state.itemCount).toBe(2)
  })

  it('12. Undo restore action reconstructs exact variant and quantity and calls backend', async () => {
    useCartStore.getState().syncCartState([mockItemUK6])

    let restoredPayload: any = null
    global.fetch = vi.fn().mockImplementation(async (_url, opts: any) => {
      restoredPayload = JSON.parse(opts.body)
      return {
        ok: true,
        json: async () => ({ success: true }),
      }
    })

    const res = await useCartStore.getState().restoreCartItemAction(mockItemUK10)
    expect(res.success).toBe(true)
    expect(restoredPayload.variant_id).toBe('variant-sneaker-uk-10')
    expect(restoredPayload.quantity).toBe(2)

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(2)
    expect(state.itemCount).toBe(3) // UK 6 (1) + UK 10 (2)
  })
})
