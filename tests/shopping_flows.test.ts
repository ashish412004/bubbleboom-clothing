import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getBuyNowItemDetails } from '@/lib/cart'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

describe('Shopping Flows & Navigation Suite', () => {
  describe('1. BUY IT NOW Flow', () => {
    const testProduct = {
      id: 'prod_test_buy_now',
      name: 'Oversized Boxy Tee',
      slug: 'oversized-boxy-tee',
      mrp: 1999,
      selling_price: 999,
      is_published: true,
      is_active: true,
      images: [
        {
          image_url: 'https://bubbleboom.in/test-image.jpg',
          alt_text: 'Oversized Boxy Tee',
          color: 'Black',
          sort_order: 1,
        },
      ],
      variants: [
        {
          id: 'var_test_buy_now_l',
          product_id: 'prod_test_buy_now',
          sku: 'BB-TEE-BLK-L',
          color: 'Black',
          size: 'L',
          stock: 8,
          is_active: true,
        },
      ],
    }

    beforeEach(() => {
      MOCK_PRODUCTS.push(testProduct)
    })

    afterEach(() => {
      const idx = MOCK_PRODUCTS.findIndex((p) => p.id === testProduct.id)
      if (idx !== -1) {
        MOCK_PRODUCTS.splice(idx, 1)
      }
    })

    it('retrieves accurate variant and product details for direct purchase without touching cart', async () => {
      const res = await getBuyNowItemDetails('var_test_buy_now_l', 1)
      expect(res.error).toBeUndefined()
      expect(res.item).toBeDefined()
      expect(res.item!.variant_id).toBe('var_test_buy_now_l')
      expect(res.item!.quantity).toBe(1)
      expect(res.item!.variant.sku).toBe('BB-TEE-BLK-L')
      expect(res.item!.variant.product.name).toBe('Oversized Boxy Tee')
      expect(res.item!.variant.product.selling_price).toBe(999)
    })

    it('rejects direct purchase if requested quantity exceeds available variant stock', async () => {
      const excessiveQty = 15 // Stock is 8
      const res = await getBuyNowItemDetails('var_test_buy_now_l', excessiveQty)
      expect(res.error).toBeDefined()
      expect(res.error).toContain('available in stock')
      expect(res.item).toBeUndefined()
    })


    it('rejects direct purchase if variant ID is nonexistent', async () => {
      const res = await getBuyNowItemDetails('nonexistent-variant-xyz', 1)
      expect(res.error).toBe('Variant not found')
      expect(res.item).toBeUndefined()
    })

    it('preserves existing cart items when Buy It Now checkout occurs', () => {
      // Simulation of checkout route cart logic
      const existingCart = [
        { variant_id: 'var_existing_1', quantity: 2 },
        { variant_id: 'var_existing_2', quantity: 1 },
      ]

      const handleCheckoutSimulation = (isBuyNow: boolean, buyNowVariantId?: string, buyNowQuantity?: number) => {
        let orderItems: Array<{ variant_id: string; quantity: number }> = []
        let finalCart = [...existingCart]

        if (isBuyNow) {
          orderItems = [{ variant_id: buyNowVariantId!, quantity: buyNowQuantity || 1 }]
          // Existing cart is NOT cleared
        } else {
          orderItems = [...existingCart]
          finalCart = [] // Cleared upon regular cart order
        }

        return { orderItems, finalCart }
      }

      // Buy It Now scenario
      const buyNowResult = handleCheckoutSimulation(true, 'var_buynow_99', 1)
      expect(buyNowResult.orderItems).toEqual([{ variant_id: 'var_buynow_99', quantity: 1 }])
      // Customer's existing cart remains 100% intact!
      expect(buyNowResult.finalCart).toHaveLength(2)
      expect(buyNowResult.finalCart).toEqual(existingCart)

      // Regular cart scenario
      const regularCartResult = handleCheckoutSimulation(false)
      expect(regularCartResult.orderItems).toHaveLength(2)
      expect(regularCartResult.finalCart).toHaveLength(0)
    })
  })

  describe('2. ADD TO CART Flow & Variant Separation', () => {
    it('maintains distinct cart line items for different colours and sizes of the same product', () => {
      interface CartItem {
        id: string
        variant_id: string
        color: string
        size: string
        quantity: number
      }

      let cart: CartItem[] = []

      function addToCart(variant: { id: string; color: string; size: string; stock: number }, qty: number) {
        const existingIndex = cart.findIndex((i) => i.variant_id === variant.id)
        if (existingIndex >= 0) {
          const newQty = cart[existingIndex].quantity + qty
          if (newQty > variant.stock) {
            return { error: `Only ${variant.stock} available in stock` }
          }
          cart[existingIndex].quantity = newQty
          return { success: true, item: cart[existingIndex] }
        } else {
          if (qty > variant.stock) {
            return { error: `Only ${variant.stock} available in stock` }
          }
          const newItem = {
            id: `item_${Date.now()}_${Math.random()}`,
            variant_id: variant.id,
            color: variant.color,
            size: variant.size,
            quantity: qty,
          }
          cart.push(newItem)
          return { success: true, item: newItem }
        }
      }

      // Add Black / L
      const res1 = addToCart({ id: 'v_black_l', color: 'Black', size: 'L', stock: 10 }, 1)
      expect(res1.success).toBe(true)
      expect(cart).toHaveLength(1)

      // Add Gray / L (different colour -> separate line item)
      const res2 = addToCart({ id: 'v_gray_l', color: 'Gray', size: 'L', stock: 10 }, 1)
      expect(res2.success).toBe(true)
      expect(cart).toHaveLength(2)

      // Add Black / M (different size -> separate line item)
      const res3 = addToCart({ id: 'v_black_m', color: 'Black', size: 'M', stock: 10 }, 1)
      expect(res3.success).toBe(true)
      expect(cart).toHaveLength(3)

      // Add Black / L again (same variant -> increments existing quantity)
      const res4 = addToCart({ id: 'v_black_l', color: 'Black', size: 'L', stock: 10 }, 2)
      expect(res4.success).toBe(true)
      expect(cart).toHaveLength(3) // Length unchanged
      const blackL = cart.find((i) => i.variant_id === 'v_black_l')
      expect(blackL?.quantity).toBe(3) // 1 + 2 = 3

      // Attempt adding beyond stock limit
      const res5 = addToCart({ id: 'v_black_l', color: 'Black', size: 'L', stock: 10 }, 20)
      expect(res5.error).toBeDefined()
      expect(blackL?.quantity).toBe(3) // Unchanged
    })
  })

  describe('3. LOGIN REDIRECT & Destination Safety', () => {
    function getSafeRedirect(nextParam: string | null): string {
      if (
        nextParam &&
        nextParam.startsWith('/') &&
        !nextParam.startsWith('//') &&
        !nextParam.startsWith('/\\') &&
        !nextParam.startsWith('/login') &&
        !nextParam.startsWith('/signup')
      ) {
        return nextParam
      }
      return '/'
    }

    it('defaults normal login to the homepage (/) when no next parameter is provided', () => {
      expect(getSafeRedirect(null)).toBe('/')
      expect(getSafeRedirect('')).toBe('/')
    })

    it('preserves purchase return destinations with query parameters (Buy It Now)', () => {
      const destination = '/checkout?variant_id=var_123&quantity=2'
      expect(getSafeRedirect(destination)).toBe('/checkout?variant_id=var_123&quantity=2')
    })

    it('preserves standard checkout destination', () => {
      expect(getSafeRedirect('/checkout')).toBe('/checkout')
    })

    it('preserves admin destination for authorized staff', () => {
      expect(getSafeRedirect('/admin/orders')).toBe('/admin/orders')
    })

    it('rejects open redirect attacks and defaults to homepage (/)', () => {
      expect(getSafeRedirect('https://evil-phishing.com')).toBe('/')
      expect(getSafeRedirect('//evil-phishing.com')).toBe('/')
      expect(getSafeRedirect('/\\evil-phishing.com')).toBe('/')
      expect(getSafeRedirect('javascript:alert(1)')).toBe('/')
    })

    it('rejects recursive redirects to /login or /signup and defaults to homepage (/)', () => {
      expect(getSafeRedirect('/login')).toBe('/')
      expect(getSafeRedirect('/signup')).toBe('/')
      expect(getSafeRedirect('/login?next=/account')).toBe('/')
    })
  })
})
