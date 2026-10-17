import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Horizontal Category Carousel (Option 3) Suite', () => {
  const sliderFilePath = path.join(process.cwd(), 'src', 'components', 'category', 'category-slider.tsx')
  const pageFilePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')
  const cardFilePath = path.join(process.cwd(), 'src', 'components', 'category', 'category-card.tsx')

  it('1. CategorySlider component file exists and is client component', () => {
    expect(fs.existsSync(sliderFilePath)).toBe(true)
    const content = fs.readFileSync(sliderFilePath, 'utf-8')
    expect(content).toContain("'use client'")
    expect(content).toContain('export function CategorySlider')
  })

  it('2. Prev and Next minimal monochrome controls are present with aria-labels', () => {
    const content = fs.readFileSync(sliderFilePath, 'utf-8')
    expect(content).toContain('aria-label="Previous categories"')
    expect(content).toContain('aria-label="Next categories"')
    expect(content).toContain('border border-black bg-white text-black')
    // Must NOT have circular button classes (rounded-full)
    expect(content).not.toContain('rounded-full')
  })

  it('3. NO autoplay is present in the category slider', () => {
    const content = fs.readFileSync(sliderFilePath, 'utf-8')
    expect(content).not.toContain('setInterval')
    expect(content).not.toContain('autoplay')
    expect(content).not.toContain('autoScroll')
  })

  it('4. Horizontal scroll container has snap-x, snap-mandatory, and touch-pan-x', () => {
    const content = fs.readFileSync(sliderFilePath, 'utf-8')
    expect(content).toContain('overflow-x-auto')
    expect(content).toContain('scroll-smooth')
    expect(content).toContain('snap-x')
    expect(content).toContain('snap-mandatory')
    expect(content).toContain('touch-pan-x')
  })

  it('5. Responsive card width classes provide expected visible card ratios', () => {
    const content = fs.readFileSync(sliderFilePath, 'utf-8')
    // Mobile: ~72% so next card peeks in as a swipe hint
    expect(content).toContain('flex-[0_0_72%]')
    // Tablet: 42% / 36%
    expect(content).toContain('sm:flex-[0_0_42%]')
    expect(content).toContain('md:flex-[0_0_36%]')
    // Desktop: ~30.5% (approx 3 cards) and 23.5% (approx 4 cards on xl)
    expect(content).toContain('lg:flex-[0_0_30.5%]')
    expect(content).toContain('xl:flex-[0_0_23.5%]')
    expect(content).toContain('max-w-[340px]')
  })

  it('6. Header retains "Curated Wardrobe", "Shop By Category", and "View All Categories"', () => {
    const content = fs.readFileSync(sliderFilePath, 'utf-8')
    expect(content).toContain('Curated Wardrobe')
    expect(content).toContain('Shop By Category')
    expect(content).toContain('View All Categories')
    expect(content).toContain('href="/categories"')
  })

  it('7. Mouse drag interaction suppresses accidental link clicks after dragging', () => {
    const content = fs.readFileSync(sliderFilePath, 'utf-8')
    expect(content).toContain('handleMouseDown')
    expect(content).toContain('handleMouseMove')
    expect(content).toContain('handleMouseUp')
    expect(content).toContain('hasMovedRef')
    expect(content).toContain('e.preventDefault()')
  })

  it('8. Homepage page.tsx uses CategorySlider instead of the previous static 4x2 / 2x4 grid', () => {
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8')
    expect(pageContent).toContain("import { CategorySlider } from '@/components/category/category-slider'")
    expect(pageContent).toContain('<CategorySlider categories={featuredCategories} />')
    // Ensure the old 4x2 grid container is removed from page.tsx categories section
    expect(pageContent).not.toContain('grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6')
  })

  it('9. CategoryCard supports custom onClick and draggable prop for drag cancellation', () => {
    const cardContent = fs.readFileSync(cardFilePath, 'utf-8')
    expect(cardContent).toContain('onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void')
    expect(cardContent).toContain('draggable?: boolean')
    expect(cardContent).toContain('draggable={draggable}')
  })
})
