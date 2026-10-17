import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Mobile Shop By Category Slider Size & Spacing Suite', () => {
  const sliderPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-slider.tsx')
  const cardPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-card.tsx')
  const sliderContent = fs.readFileSync(sliderPath, 'utf-8')
  const cardContent = fs.readFileSync(cardPath, 'utf-8')

  it('1. Mobile card size is reduced by 25-30% with 4/5 aspect ratio and max-w-[270px]', () => {
    // Aspect ratio 4/5 on mobile (reduced from tall 3/4)
    expect(cardContent).toContain('aspect-[4/5] sm:aspect-[4/5]')
    // Mobile card width ~72vw and capped at 270px
    expect(sliderContent).toContain('flex-[0_0_72%]')
    expect(sliderContent).toContain('max-w-[270px] sm:max-w-[340px]')
    // Card gap is 12px (gap-3) on mobile
    expect(sliderContent).toContain('gap-3 sm:gap-6')
  })

  it('2. Category card content is simplified on mobile to prevent crowded text overlay', () => {
    // "Explore Drop" text overlay is hidden on mobile screens
    expect(cardContent).toContain('hidden sm:flex mt-2 items-center justify-between text-neutral-400')
    expect(cardContent).toContain('Explore Drop')
    // Category title remains bold with shadow
    expect(cardContent).toContain('text-sm sm:text-lg md:text-xl font-extrabold uppercase')
  })

  it('3. Navigation controls are smaller and more subtle on mobile (w-8 h-8 vs sm:w-10 sm:h-10)', () => {
    expect(sliderContent).toContain('w-8 h-8 sm:w-10 sm:h-10')
    expect(sliderContent).toContain('ChevronLeft size={16} className="sm:hidden"')
    expect(sliderContent).toContain('ChevronRight size={16} className="sm:hidden"')
    expect(sliderContent).toContain('border border-black bg-white text-black')
  })

  it('4. Section spacing is optimized to eliminate excessive empty vertical space', () => {
    // Section padding reduced to 36px on mobile (within 32-48px recommendation)
    expect(sliderContent).toContain('py-9 sm:py-24')
    // Heading to cards spacing reduced to 20px on mobile (within 18-24px recommendation)
    expect(sliderContent).toContain('mb-5 sm:mb-12')
    // Cards to View All button spacing reduced to 20px on mobile (within 20-24px recommendation)
    expect(sliderContent).toContain('mt-5 text-center sm:hidden')
    // Compact View All button
    expect(sliderContent).toContain('py-2.5 sm:py-3')
  })

  it('5. Desktop layout, card dimensions, and controls remain completely unchanged', () => {
    expect(sliderContent).toContain('sm:py-24')
    expect(sliderContent).toContain('sm:mb-12')
    expect(sliderContent).toContain('sm:gap-6')
    expect(sliderContent).toContain('lg:flex-[0_0_30.5%]')
    expect(sliderContent).toContain('xl:flex-[0_0_23.5%]')
    expect(sliderContent).toContain('sm:max-w-[340px]')
    expect(sliderContent).toContain('sm:w-10 sm:h-10')
    expect(cardContent).toContain('sm:aspect-[4/5]')
  })
})
