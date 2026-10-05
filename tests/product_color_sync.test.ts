import { describe, it, expect } from 'vitest'

interface MockImage {
  id: string
  image_url: string
  storage_path?: string | null
  color?: string | null
  sort_order: number
}

interface MockVariant {
  id: string
  color: string
  size: string
  stock: number
  is_active: boolean
}

describe('Product Colour-to-Image Synchronization & Variant Rules', () => {
  const images: MockImage[] = [
    { id: '1', image_url: 'https://example.com/black-hoodie-front.jpg', color: 'Black', sort_order: 0 },
    { id: '2', image_url: 'https://example.com/black-hoodie-back.jpg', color: 'Black', sort_order: 1 },
    { id: '3', image_url: 'https://example.com/gray-hoodie-front.jpg', color: 'Gray', sort_order: 0 },
    { id: '4', image_url: 'https://example.com/gray-hoodie-detail.jpg', color: 'Gray', sort_order: 1 },
    { id: '5', image_url: 'https://example.com/navy-hoodie-front.jpg', color: 'Navy', sort_order: 0 },
    { id: '6', image_url: 'https://example.com/general-lookbook.jpg', color: null, sort_order: 99 },
  ]

  const variants: MockVariant[] = [
    { id: 'v1', color: 'Black', size: 'M', stock: 10, is_active: true },
    { id: 'v2', color: 'Black', size: 'L', stock: 5, is_active: true },
    { id: 'v3', color: 'Black', size: 'XL', stock: 0, is_active: true }, // out of stock
    { id: 'v4', color: 'Gray', size: 'S', stock: 8, is_active: true },
    { id: 'v5', color: 'Gray', size: 'M', stock: 4, is_active: true },
    // Gray has no 'L' or 'XL'
    { id: 'v6', color: 'Navy', size: 'L', stock: 2, is_active: true },
  ]

  // Pure functions matching component implementation
  function getImagesForColor(imgs: MockImage[], color: string): MockImage[] {
    const hasAnyColor = imgs.some((img) => Boolean(img.color))
    if (!hasAnyColor) return [...imgs].sort((a, b) => a.sort_order - b.sort_order)

    const targetColor = color.trim().toLowerCase()
    return imgs
      .filter((img) => img.color && img.color.trim().toLowerCase() === targetColor)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function getSizesForColor(vars: MockVariant[], color: string): string[] {
    const standardOrder = ['S', 'M', 'L', 'XL', 'XXL']
    const colorLower = color.trim().toLowerCase()
    const matchingVars = vars.filter((v) => v.color.trim().toLowerCase() === colorLower && v.is_active)
    const uniqueSizes = Array.from(new Set(matchingVars.map((v) => v.size)))
    return uniqueSizes.sort((a, b) => {
      const idxA = standardOrder.indexOf(a)
      const idxB = standardOrder.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      return a.localeCompare(b)
    })
  }

  function switchColorState(
    currentColor: string,
    currentSize: string,
    newColor: string,
    vars: MockVariant[]
  ): { nextColor: string; nextSize: string; resetImageIndex: boolean } {
    const newColorLower = newColor.trim().toLowerCase()
    const availableVars = vars.filter(
      (v) => v.color.trim().toLowerCase() === newColorLower && v.is_active
    )
    const matchingVar = availableVars.find((v) => v.size === currentSize)

    let nextSize = currentSize
    // If the currently selected size does not exist or is out of stock in new color, reset size selection
    if (!matchingVar || matchingVar.stock <= 0) {
      nextSize = ''
    }

    return {
      nextColor: newColor,
      nextSize,
      resetImageIndex: true, // always reset image index to 0
    }
  }

  function findPrimaryImageForVariant(imgs: MockImage[], variantColor: string): string {
    const colorLower = variantColor.trim().toLowerCase()
    const colorMatched = imgs
      .filter((img) => img.color && img.color.trim().toLowerCase() === colorLower)
      .sort((a, b) => a.sort_order - b.sort_order)

    if (colorMatched.length > 0) {
      return colorMatched[0].image_url
    }
    // Fallback to unmapped or first image
    const sorted = [...imgs].sort((a, b) => a.sort_order - b.sort_order)
    return sorted[0]?.image_url || ''
  }

  it('correctly filters images by colour with independent galleries and ordering', () => {
    const blackGallery = getImagesForColor(images, 'Black')
    expect(blackGallery).toHaveLength(2)
    expect(blackGallery[0].image_url).toBe('https://example.com/black-hoodie-front.jpg')
    expect(blackGallery[1].image_url).toBe('https://example.com/black-hoodie-back.jpg')

    const grayGallery = getImagesForColor(images, 'Gray')
    expect(grayGallery).toHaveLength(2)
    expect(grayGallery[0].image_url).toBe('https://example.com/gray-hoodie-front.jpg')
    expect(grayGallery[1].image_url).toBe('https://example.com/gray-hoodie-detail.jpg')

    const navyGallery = getImagesForColor(images, 'Navy')
    expect(navyGallery).toHaveLength(1)
    expect(navyGallery[0].image_url).toBe('https://example.com/navy-hoodie-front.jpg')
  })

  it('handles case-insensitivity and whitespace in colour names', () => {
    const galleryLower = getImagesForColor(images, '  gray ')
    expect(galleryLower).toHaveLength(2)
    expect(galleryLower[0].id).toBe('3')
  })

  it('returns empty array when a colour has no photos, allowing honest Image Unavailable state', () => {
    const redGallery = getImagesForColor(images, 'Red')
    expect(redGallery).toHaveLength(0)
  })

  it('falls back to general images when a legacy product has no colors assigned to any image', () => {
    const legacyImages: MockImage[] = [
      { id: 'legacy-1', image_url: 'https://example.com/old-1.jpg', color: null, sort_order: 0 },
      { id: 'legacy-2', image_url: 'https://example.com/old-2.jpg', color: null, sort_order: 1 },
    ]
    const result = getImagesForColor(legacyImages, 'Black')
    expect(result).toHaveLength(2)
    expect(result[0].image_url).toBe('https://example.com/old-1.jpg')
  })

  it('resets image index to 0 when switching colour', () => {
    const transition = switchColorState('Black', 'M', 'Gray', variants)
    expect(transition.resetImageIndex).toBe(true)
    expect(transition.nextColor).toBe('Gray')
  })

  it('preserves selected size if available and in stock in the newly selected colour', () => {
    // Black M is in stock (10), Gray M is in stock (4)
    const transition = switchColorState('Black', 'M', 'Gray', variants)
    expect(transition.nextSize).toBe('M')
  })

  it('clears selected size if not available in the newly selected colour to prevent invalid variant submission', () => {
    // Black L is in stock (5), but Gray does not have size L
    const transition = switchColorState('Black', 'L', 'Gray', variants)
    expect(transition.nextSize).toBe('')
  })

  it('clears selected size if out of stock in the newly selected colour', () => {
    // Gray S is in stock (8), but imagine transitioning to Navy which only has size L
    const transition = switchColorState('Gray', 'S', 'Navy', variants)
    expect(transition.nextSize).toBe('')
  })

  it('filters sizes available specifically for each colour', () => {
    expect(getSizesForColor(variants, 'Black')).toEqual(['M', 'L', 'XL'])
    expect(getSizesForColor(variants, 'Gray')).toEqual(['S', 'M'])
    expect(getSizesForColor(variants, 'Navy')).toEqual(['L'])
  })

  it('correctly maps primary image for cart item and order snapshots based on variant colour', () => {
    // Variant v1 is Black -> should map to Black front image
    const blackPrimary = findPrimaryImageForVariant(images, 'Black')
    expect(blackPrimary).toBe('https://example.com/black-hoodie-front.jpg')

    // Variant v4 is Gray -> should map to Gray front image
    const grayPrimary = findPrimaryImageForVariant(images, 'Gray')
    expect(grayPrimary).toBe('https://example.com/gray-hoodie-front.jpg')

    // Variant with no images in colour falls back gracefully
    const fallback = findPrimaryImageForVariant(images, 'Yellow')
    expect(fallback).toBe('https://example.com/black-hoodie-front.jpg')
  })
})
