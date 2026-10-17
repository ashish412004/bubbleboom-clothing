import { describe, it, expect } from 'vitest'
import {
  parseProductImage,
  findImagesForVariantColor,
  findImageForVariantColor,
  ParsedProductImage,
} from '@/lib/utils'

describe('Multi-Image Colour Variants System', () => {
  // Test dataset: A product with 5+ photos for Gray, 5+ photos for Black, and 1 general photo
  const sampleImages: (ParsedProductImage | any)[] = [
    // 5 Gray photos
    {
      id: 'img-gray-1',
      image_url: 'https://images.bubbleboom.in/hoodie-gray-front.jpg',
      color: 'Gray',
      is_primary: true,
      sort_order: 0,
      alt_text: '[color:Gray][primary] Heavyweight Hoodie Front View',
    },
    {
      id: 'img-gray-2',
      image_url: 'https://images.bubbleboom.in/hoodie-gray-back.jpg',
      color: 'Gray',
      is_primary: false,
      sort_order: 1,
      alt_text: '[color:Gray] Heavyweight Hoodie Back View',
    },
    {
      id: 'img-gray-3',
      image_url: 'https://images.bubbleboom.in/hoodie-gray-side.jpg',
      color: 'Gray',
      is_primary: false,
      sort_order: 2,
      alt_text: '[color:Gray] Heavyweight Hoodie Side Profile',
    },
    {
      id: 'img-gray-4',
      image_url: 'https://images.bubbleboom.in/hoodie-gray-texture.jpg',
      color: 'Gray',
      is_primary: false,
      sort_order: 3,
      alt_text: '[color:Gray] Heavyweight Hoodie 400 GSM Fabric Close-up',
    },
    {
      id: 'img-gray-5',
      image_url: 'https://images.bubbleboom.in/hoodie-gray-model.jpg',
      color: 'Gray',
      is_primary: false,
      sort_order: 4,
      alt_text: '[color:Gray] Heavyweight Hoodie Model Look',
    },

    // 5 Black photos
    {
      id: 'img-black-1',
      image_url: 'https://images.bubbleboom.in/hoodie-black-front.jpg',
      color: 'Black',
      is_primary: true,
      sort_order: 5,
      alt_text: '[color:Black][primary] Onyx Black Hoodie Front View',
    },
    {
      id: 'img-black-2',
      image_url: 'https://images.bubbleboom.in/hoodie-black-back.jpg',
      color: 'Black',
      is_primary: false,
      sort_order: 6,
      alt_text: '[color:Black] Onyx Black Hoodie Back View',
    },
    {
      id: 'img-black-3',
      image_url: 'https://images.bubbleboom.in/hoodie-black-detail.jpg',
      color: 'Black',
      is_primary: false,
      sort_order: 7,
      alt_text: '[color:Black] Onyx Black Hoodie Cuff & Hem Detail',
    },
    {
      id: 'img-black-4',
      image_url: 'https://images.bubbleboom.in/hoodie-black-hood.jpg',
      color: 'Black',
      is_primary: false,
      sort_order: 8,
      alt_text: '[color:Black] Onyx Black Double-Lined Hood',
    },
    {
      id: 'img-black-5',
      image_url: 'https://images.bubbleboom.in/hoodie-black-lifestyle.jpg',
      color: 'Black',
      is_primary: false,
      sort_order: 9,
      alt_text: '[color:Black] Onyx Black Urban Streetwear Shot',
    },
  ]

  describe('1. Image Parsing & Resilience (parseProductImage)', () => {
    it('should parse explicit properties (color, is_primary, alt_text)', () => {
      const img = {
        image_url: 'https://images.bubbleboom.in/sample.jpg',
        color: 'Navy Blue',
        is_primary: true,
        alt_text: 'Navy Blue Hoodie',
      }
      const parsed = parseProductImage(img)
      expect(parsed).not.toBeNull()
      expect(parsed?.image_url).toBe('https://images.bubbleboom.in/sample.jpg')
      expect(parsed?.color).toBe('Navy Blue')
      expect(parsed?.is_primary).toBe(true)
      expect(parsed?.alt_text).toBe('Navy Blue Hoodie')
    })

    it('should extract color and primary flags encoded in alt_text for schema cache fallback', () => {
      const img = {
        image_url: 'https://images.bubbleboom.in/sample2.jpg',
        alt_text: '[color:Gray][primary] Acid Wash Streetwear Tee',
      }
      const parsed = parseProductImage(img)
      expect(parsed).not.toBeNull()
      expect(parsed?.color).toBe('Gray')
      expect(parsed?.is_primary).toBe(true)
      // Internal tags should be stripped for clean accessibility alt text
      expect(parsed?.alt_text).toBe('Acid Wash Streetwear Tee')
    })

    it('should correctly handle string URLs and unassigned images', () => {
      const parsed = parseProductImage('https://images.bubbleboom.in/plain.jpg')
      expect(parsed?.image_url).toBe('https://images.bubbleboom.in/plain.jpg')
      expect(parsed?.color).toBeNull()
      expect(parsed?.is_primary).toBe(false)
    })
  })

  describe('2. Strict Colour Gallery Isolation (findImagesForVariantColor)', () => {
    it('should return exactly and only Gray photos when Gray is selected', () => {
      const grayGallery = findImagesForVariantColor(sampleImages, 'Gray')
      expect(grayGallery).toHaveLength(5)
      grayGallery.forEach((img) => {
        expect(img.color?.toLowerCase()).toBe('gray')
        expect(img.image_url).toContain('gray')
        expect(img.image_url).not.toContain('black')
      })
    })

    it('should return exactly and only Black photos when Black is selected', () => {
      const blackGallery = findImagesForVariantColor(sampleImages, 'Black')
      expect(blackGallery).toHaveLength(5)
      blackGallery.forEach((img) => {
        expect(img.color?.toLowerCase()).toBe('black')
        expect(img.image_url).toContain('black')
        expect(img.image_url).not.toContain('gray')
      })
    })

    it('should place the primary image first in the gallery', () => {
      // Create a list where primary is at the end of the gray list
      const imagesWithLatePrimary = [
        { image_url: 'https://images.bubbleboom.in/gray-1.jpg', color: 'Gray', is_primary: false, sort_order: 0 },
        { image_url: 'https://images.bubbleboom.in/gray-2.jpg', color: 'Gray', is_primary: false, sort_order: 1 },
        { image_url: 'https://images.bubbleboom.in/gray-primary.jpg', color: 'Gray', is_primary: true, sort_order: 2 },
      ]
      const gallery = findImagesForVariantColor(imagesWithLatePrimary, 'Gray')
      expect(gallery[0].image_url).toBe('https://images.bubbleboom.in/gray-primary.jpg')
      expect(gallery[0].is_primary).toBe(true)
    })

    it('should be case-insensitive and handle whitespace (e.g. " gray ", "GRAY")', () => {
      const upperGallery = findImagesForVariantColor(sampleImages, 'GRAY')
      expect(upperGallery).toHaveLength(5)

      const paddedGallery = findImagesForVariantColor(sampleImages, '  gray  ')
      expect(paddedGallery).toHaveLength(5)
    })

    it('should never leak other colours when a non-existent colour is selected', () => {
      const result = findImagesForVariantColor(sampleImages, 'Neon Green')
      // Since all sample images belong explicitly to Gray or Black, it must return [] rather than mixing unrelated photos
      expect(result).toHaveLength(0)
    })

    it('should fall back to general unmapped images if available and variant color has no images', () => {
      const mixedImages = [
        { image_url: 'https://images.bubbleboom.in/general.jpg', color: null },
        { image_url: 'https://images.bubbleboom.in/black.jpg', color: 'Black' },
      ]
      const result = findImagesForVariantColor(mixedImages, 'White')
      expect(result).toHaveLength(1)
      expect(result[0].image_url).toBe('https://images.bubbleboom.in/general.jpg')
    })
  })

  describe('3. Cart & Checkout Thumbnail Selection (findImageForVariantColor)', () => {
    it('should return the primary Gray image when adding Gray to cart', () => {
      const primaryGray = findImageForVariantColor(sampleImages, 'Gray')
      expect(primaryGray?.image_url).toBe('https://images.bubbleboom.in/hoodie-gray-front.jpg')
      expect(primaryGray?.color).toBe('Gray')
      expect(primaryGray?.is_primary).toBe(true)
    })

    it('should return the primary Black image when adding Black to cart', () => {
      const primaryBlack = findImageForVariantColor(sampleImages, 'Black')
      expect(primaryBlack?.image_url).toBe('https://images.bubbleboom.in/hoodie-black-front.jpg')
      expect(primaryBlack?.color).toBe('Black')
      expect(primaryBlack?.is_primary).toBe(true)
    })

    it('should return the first available image if no color is specified or matched', () => {
      const fallback = findImageForVariantColor(sampleImages, null)
      expect(fallback?.image_url).toBe('https://images.bubbleboom.in/hoodie-gray-front.jpg')
    })
  })

  describe('4. Admin Form Gallery Management Logic', () => {
    it('supports setting an image as primary per colour and moving it to the front', () => {
      const currentImages = [
        { image_url: 'url-1.jpg', color: 'Gray', is_primary: true },
        { image_url: 'url-2.jpg', color: 'Gray', is_primary: false },
        { image_url: 'url-3.jpg', color: 'Black', is_primary: true },
      ]

      // Simulate admin clicking "Set Primary" on url-2.jpg (index 1)
      const targetIndex = 1
      const target = currentImages[targetIndex]
      const targetColor = target.color.trim().toLowerCase()

      const updated = currentImages.map((img, i) => {
        if (i === targetIndex) return { ...img, is_primary: true }
        if (img.color.trim().toLowerCase() === targetColor) return { ...img, is_primary: false }
        return img
      })

      // Reorder target to the front of Gray group
      const item = updated[targetIndex]
      const without = updated.filter((_, i) => i !== targetIndex)
      const firstIndexOfColor = without.findIndex((img) => img.color.trim().toLowerCase() === targetColor)
      without.splice(firstIndexOfColor, 0, item)

      expect(without[0].image_url).toBe('url-2.jpg')
      expect(without[0].is_primary).toBe(true)
      expect(without[1].image_url).toBe('url-1.jpg')
      expect(without[1].is_primary).toBe(false)
      // Black should remain unaffected
      expect(without[2].image_url).toBe('url-3.jpg')
      expect(without[2].is_primary).toBe(true)
    })

    it('supports moving images within a filtered colour tab without swapping across colours', () => {
      const images = [
        { id: 'g1', color: 'Gray', sort: 0 },
        { id: 'b1', color: 'Black', sort: 1 },
        { id: 'g2', color: 'Gray', sort: 2 },
        { id: 'b2', color: 'Black', sort: 3 },
      ]

      const selectedFilter = 'Gray'
      const matchingIndices = images
        .map((img, i) => (img.color === selectedFilter ? i : -1))
        .filter((i) => i !== -1)

      expect(matchingIndices).toEqual([0, 2]) // positions of Gray images in full list

      // Move g2 (index 2) left/earlier within Gray
      const posInFilter = matchingIndices.indexOf(2) // pos 1
      const targetPosInFilter = posInFilter - 1 // pos 0
      const targetGlobalIndex = matchingIndices[targetPosInFilter] // index 0

      // Swap images at index 2 and index 0
      const swapped = [...images]
      const temp = swapped[2]
      swapped[2] = swapped[targetGlobalIndex]
      swapped[targetGlobalIndex] = temp

      expect(swapped[0].id).toBe('g2')
      expect(swapped[1].id).toBe('b1') // Black image between them remains intact
      expect(swapped[2].id).toBe('g1')
      expect(swapped[3].id).toBe('b2')
    })
  })
})
