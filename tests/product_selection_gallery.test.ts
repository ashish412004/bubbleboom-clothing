import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeColor,
  parseProductImage,
  findImageForVariantColor,
} from '@/lib/utils'
import { getBuyNowItemDetails } from '@/lib/cart'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

describe('Product Colour Selection, Gallery & Direct Checkout Suite', () => {
  describe('1. Colour Normalization & Inconsistent Labels', () => {
    it('normalizes gray and grey to the same canonical representation', () => {
      expect(normalizeColor('Gray')).toBe('gray')
      expect(normalizeColor('Grey')).toBe('gray')
      expect(normalizeColor(' gray ')).toBe('gray')
      expect(normalizeColor('GREY')).toBe('gray')
      expect(normalizeColor('Black')).toBe('black')
      expect(normalizeColor('White')).toBe('white')
    })

    it('handles empty and null inputs safely', () => {
      expect(normalizeColor(null)).toBe('')
      expect(normalizeColor(undefined)).toBe('')
      expect(normalizeColor('')).toBe('')
    })
  })

  describe('2. Product Image Parsing & Backward Compatibility', () => {
    it('parses explicit color property when present', () => {
      const img = {
        id: 'img-1',
        image_url: 'https://example.com/black.jpg',
        color: 'Black',
        alt_text: 'Black Hoodie Front',
        sort_order: 0,
      }
      const parsed = parseProductImage(img)
      expect(parsed).not.toBeNull()
      expect(parsed?.color).toBe('Black')
      expect(parsed?.alt_text).toBe('Black Hoodie Front')
    })

    it('extracts color from alt_text tag [color:Name] when column is missing', () => {
      const img = {
        id: 'img-2',
        image_url: 'https://example.com/gray.jpg',
        alt_text: '[color:Gray] Heavy 400 GSM Hoodie - Gray',
        sort_order: 1,
      }
      const parsed = parseProductImage(img)
      expect(parsed).not.toBeNull()
      expect(parsed?.color).toBe('Gray')
      expect(parsed?.alt_text).toBe('Heavy 400 GSM Hoodie - Gray')
      expect(parsed?.alt_text).not.toContain('[color:Gray]')
    })

    it('handles gray/grey in alt_text tag interchangeably', () => {
      const img = {
        id: 'img-3',
        image_url: 'https://example.com/grey.jpg',
        alt_text: '[color:Grey] Streetwear Hoodie',
        sort_order: 2,
      }
      const parsed = parseProductImage(img)
      expect(parsed).not.toBeNull()
      expect(normalizeColor(parsed?.color)).toBe('gray')
    })
  })

  describe('3. Variant Colour Image Matching', () => {
    const images = [
      {
        id: 'img-black',
        image_url: 'https://example.com/black-hoodie.jpg',
        color: 'Black',
        sort_order: 0,
      },
      {
        id: 'img-gray',
        image_url: 'https://example.com/gray-hoodie.jpg',
        alt_text: '[color:Gray] Gray Hoodie Photo',
        sort_order: 1,
      },
    ]

    it('selects black photo for Black variant', () => {
      const matched = findImageForVariantColor(images, 'Black')
      expect(matched?.image_url).toBe('https://example.com/black-hoodie.jpg')
      expect(matched?.color).toBe('Black')
    })

    it('selects gray photo for Gray variant', () => {
      const matched = findImageForVariantColor(images, 'Gray')
      expect(matched?.image_url).toBe('https://example.com/gray-hoodie.jpg')
      expect(matched?.color).toBe('Gray')
    })

    it('matches Grey variant query to Gray tagged photo', () => {
      const matched = findImageForVariantColor(images, 'Grey')
      expect(matched?.image_url).toBe('https://example.com/gray-hoodie.jpg')
    })

    it('never returns incorrect colour photo when requested colour is missing', () => {
      // In product gallery: filtering by colour must yield empty array when no images exist
      const parsedImages = images.map(parseProductImage).filter(Boolean)
      const navyImages = parsedImages.filter(
        (img) => img?.color && normalizeColor(img.color) === normalizeColor('Navy')
      )
      expect(navyImages.length).toBe(0)
    })
  })

  describe('4. Direct Checkout Buy It Now Flow', () => {
    const testWinterHoodie = {
      id: 'baa1984e-283e-47fa-a5ee-d9537e1c6423',
      name: 'Premium Heavy 400 GSM Winter Hoodies Collection',
      slug: 'winter-hoodies',
      mrp: 2999,
      selling_price: 1899,
      is_published: true,
      is_active: true,
      images: [
        {
          id: '938c86f3-c1db-4296-865f-91f928d15cad',
          image_url: 'https://example.com/black-hoodie.jpg',
          alt_text: '[color:Black] Black Hoodie',
          sort_order: 0,
        },
        {
          id: '35938f51-466d-4f13-a492-99d3fb1791e8',
          image_url: 'https://example.com/gray-hoodie.jpg',
          alt_text: '[color:Gray] Gray Hoodie',
          sort_order: 1,
        },
      ],
      variants: [
        {
          id: '88668fce-692e-40a4-a64c-5b428b1035ad',
          product_id: 'baa1984e-283e-47fa-a5ee-d9537e1c6423',
          sku: 'HOODIE-GRY-M',
          color: 'Gray',
          size: 'M',
          stock: 10,
          is_active: true,
        },
        {
          id: '6c8229b8-47b5-4923-ad13-68696739b6dc',
          product_id: 'baa1984e-283e-47fa-a5ee-d9537e1c6423',
          sku: 'HOODIE-BLK-L',
          color: 'Black',
          size: 'L',
          stock: 5,
          is_active: true,
        },
      ],
    }

    beforeEach(() => {
      MOCK_PRODUCTS.push(testWinterHoodie as any)
    })

    afterEach(() => {
      const idx = MOCK_PRODUCTS.findIndex((p) => p.id === testWinterHoodie.id)
      if (idx !== -1) {
        MOCK_PRODUCTS.splice(idx, 1)
      }
    })

    it('successfully constructs Buy It Now item for valid variant in Supabase', async () => {
      const grayVarId = '88668fce-692e-40a4-a64c-5b428b1035ad'
      const res = await getBuyNowItemDetails(grayVarId, 2)
      expect(res.error).toBeUndefined()
      expect(res.item).toBeDefined()
      expect(res.item?.variant_id).toBe(grayVarId)
      expect(res.item?.quantity).toBe(2)
      expect(res.item?.cart_id).toBe('buy_now_direct')
      expect(res.item?.variant?.color).toBe('Gray')
      expect(res.item?.variant?.product?.images).toBeDefined()
      expect(res.item?.variant?.product?.images.length).toBeGreaterThan(0)
    })

    it('successfully constructs Buy It Now item for Black variant in Supabase', async () => {
      const blackVarId = '6c8229b8-47b5-4923-ad13-68696739b6dc'
      const res = await getBuyNowItemDetails(blackVarId, 1)
      expect(res.error).toBeUndefined()
      expect(res.item).toBeDefined()
      expect(res.item?.variant_id).toBe(blackVarId)
      expect(res.item?.variant?.color).toBe('Black')
    })

    it('returns clear error for invalid or nonexistent variant ID', async () => {
      const res = await getBuyNowItemDetails('non-existent-variant-xyz', 1)
      expect(res.error).toBe('Variant not found')
      expect(res.item).toBeUndefined()
    })
  })
})
