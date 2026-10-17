import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Homepage Premium Layout & Mobile Optimization Suite', () => {
  const pagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')
  const heroPath = path.join(process.cwd(), 'src', 'components', 'home', 'hero-carousel.tsx')

  it('1. Hero section has compact desktop height (75-85vh) and responsive max-height', () => {
    const content = fs.readFileSync(heroPath, 'utf-8')
    // Compact responsive height classes
    expect(content).toContain('md:min-h-[75vh]')
    expect(content).toContain('md:h-[78vh]')
    expect(content).toContain('lg:h-[80vh]')
    // Restored original full-height mobile hero
    expect(content).toContain('min-h-[75vh]')
    expect(content).toContain('h-[80vh]')
  })

  it('2. Hero section preserves headline, subtitle, buttons, images, and progress bars', () => {
    const content = fs.readFileSync(heroPath, 'utf-8')
    expect(content).toContain('WEAR THE BOOM.')
    expect(content).toContain('Every style. Every mood. Make it yours.')
    expect(content).toContain('SHOP NOW')
    expect(content).toContain('EXPLORE COLLECTIONS')
    expect(content).toContain('hidden md:block absolute inset-0')
    expect(content).toContain('block md:hidden absolute inset-0')
    expect(content).toContain('w-[44px]')
    expect(content).toContain('w-[28px]')
    expect(content).toContain('h-[3.5px]')
    expect(content).toContain('heroProgressFill')
  })

  it('3. New Arrivals implements product-count-aware layout (1, 2, 3, and 4+ products)', () => {
    const content = fs.readFileSync(pagePath, 'utf-8')
    // 1 product: centered max-w-[280px] sm:max-w-[320px]
    expect(content).toContain('newArrivals.length === 1')
    expect(content).toContain('max-w-[280px] sm:max-w-[320px]')
    // 2 products: centered 2-col max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto
    expect(content).toContain('newArrivals.length === 2')
    expect(content).toContain('grid grid-cols-2 max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto')
    // 3 products: balanced 3-col max-w-3xl lg:max-w-4xl mx-auto
    expect(content).toContain('newArrivals.length === 3')
    expect(content).toContain('grid grid-cols-2 sm:grid-cols-3 max-w-3xl lg:max-w-4xl mx-auto')
    // 4+ products: full grid-cols-2 lg:grid-cols-4
    expect(content).toContain('newArrivals.length >= 4')
    expect(content).toContain('grid grid-cols-2 lg:grid-cols-4')
  })

  it('4. Featured Capsule is compact with 45/55 split and cinematic aspect ratio', () => {
    const content = fs.readFileSync(pagePath, 'utf-8')
    // Reduced padding
    expect(content).toContain('py-10 sm:py-14 lg:py-16')
    // 45/55 split using 12 columns
    expect(content).toContain('grid grid-cols-1 lg:grid-cols-12')
    expect(content).toContain('lg:col-span-5')
    expect(content).toContain('lg:col-span-7')
    // Cinematic aspect ratio and max height
    expect(content).toContain('aspect-[16/10]')
    expect(content).toContain('max-h-[360px]')
    // Heading and CTA intact
    expect(content).toContain('Shop The Capsule')
    expect(content).toContain('Featured Capsule')
  })

  it('5. Repetitive Best Sellers is removed when products are already in New Arrivals', () => {
    const content = fs.readFileSync(pagePath, 'utf-8')
    // Checks that newArrivalIds are filtered out to prevent duplicates
    expect(content).toContain('const newArrivalIds = new Set(newArrivals.map((p) => p.id))')
    expect(content).toContain('const distinctFeaturedProducts = products.filter((p) => !newArrivalIds.has(p.id))')
    // Conditionally renders only when distinct products exist
    expect(content).toContain('distinctFeaturedProducts.length > 0')
    expect(content).toContain('Featured Products')
    // Does NOT render hardcoded duplicate Best Sellers
    expect(content).not.toContain('const bestSellers = products.slice(0, 4)')
  })
})
