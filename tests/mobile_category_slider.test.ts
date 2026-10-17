import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Reference-Matched Mobile Category Carousel Suite', () => {
  const sliderPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-slider.tsx')
  const cardPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-card.tsx')
  const sliderContent = fs.readFileSync(sliderPath, 'utf-8')
  const cardContent = fs.readFileSync(cardPath, 'utf-8')

  it('1. Mobile card size matches reference with subtle 8-10% reduction, rounded corners, and 72-74vw width', () => {
    // Aspect ratio 3:4 on mobile, 4:5 on desktop
    expect(cardContent).toContain('aspect-[3/4]')
    expect(cardContent).toContain('sm:aspect-[4/5]')
    // Rounded corners
    expect(cardContent).toContain('rounded-[20px]')
    // Mobile card width ~72-74vw and capped proportionally
    expect(sliderContent).toMatch(/flex-\[0_0_7[234]vw\]/)
    expect(sliderContent).toContain('max-w-[305px] sm:max-w-[340px]')
    // Card gap is 12px (gap-3) on mobile
    expect(sliderContent).toContain('gap-3 sm:gap-6')
  })

  it('2. Category card content displays uncropped image, avoids duplicate text, and keeps outlined Shop Now button', () => {
    // Preserves complete image without aggressive cropping
    expect(cardContent).toContain('object-contain sm:object-cover')
    // Avoids duplicate overlay headings when poster graphic already embeds typography
    expect(cardContent).toContain('hasEmbeddedPosterText')
    // Outlined Shop Now button
    expect(cardContent).toContain('border border-white text-white')
    expect(cardContent).toContain('Shop Now')
    // Dark gradient overlay near bottom
    expect(cardContent).toContain('bg-gradient-to-t from-black/85')
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
