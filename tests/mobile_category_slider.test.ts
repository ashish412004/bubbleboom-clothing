import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Reference-Matched Mobile Category Carousel Suite', () => {
  const sliderPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-slider.tsx')
  const cardPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-card.tsx')
  const sliderContent = fs.readFileSync(sliderPath, 'utf-8')
  const cardContent = fs.readFileSync(cardPath, 'utf-8')

  it('1. Mobile card size matches reference with 4:5 aspect ratio, rounded corners, and 78vw width', () => {
    // Aspect ratio 4/5
    expect(cardContent).toContain('aspect-[4/5]')
    // Rounded corners
    expect(cardContent).toContain('rounded-[20px]')
    // Mobile card width ~78vw and capped at 340px
    expect(sliderContent).toContain('flex-[0_0_78vw]')
    expect(sliderContent).toContain('max-w-[340px]')
    // Card gap is 12px (gap-3) on mobile
    expect(sliderContent).toContain('gap-3 sm:gap-6')
  })

  it('2. Category card content displays bold heading, editorial tagline, and outlined Shop Now button', () => {
    // Category title is bold uppercase streetwear typography
    expect(cardContent).toContain('font-black uppercase tracking-tight text-white')
    // Tagline with letter spacing
    expect(cardContent).toContain('tracking-[0.18em]')
    // Outlined Shop Now button
    expect(cardContent).toContain('border border-white text-white')
    expect(cardContent).toContain('Shop Now')
    // Dark gradient overlay near bottom
    expect(cardContent).toContain('bg-gradient-to-t from-black/85 via-black/40 to-transparent')
  })

  it('3. Navigation controls are square outlined buttons centered underneath cards', () => {
    expect(sliderContent).toContain('w-10 h-10 sm:w-11 sm:h-11')
    expect(sliderContent).toContain('ChevronLeft')
    expect(sliderContent).toContain('ChevronRight')
    expect(sliderContent).toContain('border border-neutral-300 hover:border-black bg-white text-black')
    expect(sliderContent).toContain('flex items-center justify-center gap-3')
  })

  it('4. Section spacing is clean and balanced', () => {
    expect(sliderContent).toContain('py-8 sm:py-16')
    expect(sliderContent).toContain('mb-4 sm:mb-8')
  })

  it('5. Responsive desktop layout remains polished', () => {
    expect(sliderContent).toContain('sm:gap-6')
    expect(sliderContent).toContain('lg:flex-[0_0_30.5%]')
    expect(sliderContent).toContain('xl:flex-[0_0_23.5%]')
    expect(sliderContent).toContain('max-w-[340px]')
  })
})
