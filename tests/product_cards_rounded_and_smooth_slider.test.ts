import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Rounded Product Cards & Smooth Slider Suite', () => {
  const productCardPath = path.join(process.cwd(), 'src', 'components', 'product', 'product-card.tsx')
  const categorySliderPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-slider.tsx')
  const quickViewPath = path.join(process.cwd(), 'src', 'components', 'product', 'quick-view-modal.tsx')

  it('1. ProductCard image area has rounded-[20px] and overflow-hidden matching category cards', () => {
    const content = fs.readFileSync(productCardPath, 'utf-8')
    expect(content).toContain('rounded-[20px]')
    expect(content).toContain('overflow-hidden')
    expect(content).toContain('aspect-[3/4]')
    expect(content).toContain('relative aspect-[3/4] bg-neutral-100 overflow-hidden rounded-[20px]')
  })

  it('2. ProductCard image has smooth 500ms ease-out scale hover transition', () => {
    const content = fs.readFileSync(productCardPath, 'utf-8')
    expect(content).toContain('group-hover:scale-105 transition-transform duration-500 ease-out')
  })

  it('3. ProductCard badges and buttons adapt to rounded card corners', () => {
    const content = fs.readFileSync(productCardPath, 'utf-8')
    // Discount badge pill
    expect(content).toContain('top-3 left-3')
    expect(content).toContain('rounded-md')
    // Wishlist button
    expect(content).toContain('top-3 right-3')
    expect(content).toContain('rounded-full')
    // Quick View button
    expect(content).toContain('rounded-xl')
  })

  it('4. QuickViewModal dialog and gallery match rounded-[20px] curvature', () => {
    const content = fs.readFileSync(quickViewPath, 'utf-8')
    expect(content).toContain('rounded-[20px]')
    expect(content).toContain('relative aspect-[3/4] bg-neutral-100 border border-neutral-200 overflow-hidden rounded-[20px]')
  })

  it('5. CategorySlider contains fluid drag tracking and mobile momentum classes', () => {
    const content = fs.readFileSync(categorySliderPath, 'utf-8')
    expect(content).toContain('overscroll-x-contain')
    expect(content).toContain('[-webkit-overflow-scrolling:touch]')
    expect(content).toContain('scroll-smooth')
    expect(content).toContain('snap-x')
    expect(content).toContain('snap-mandatory')
  })

  it('6. CategorySlider dynamically manages scrollBehavior during drag to eliminate stutter', () => {
    const content = fs.readFileSync(categorySliderPath, 'utf-8')
    expect(content).toContain("el.style.scrollBehavior = 'auto'")
    expect(content).toContain("el.style.scrollSnapType = 'none'")
    expect(content).toContain("el.style.scrollBehavior = ''")
    expect(content).toContain("el.style.scrollSnapType = ''")
  })
})
