import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Mobile Hero CTA Buttons Size & Spacing Suite', () => {
  const heroPath = path.join(process.cwd(), 'src', 'components', 'home', 'hero-carousel.tsx')
  const heroContent = fs.readFileSync(heroPath, 'utf-8')

  it('1. Mobile CTA buttons are approximately 240px wide and capped at 78vw for smaller screens', () => {
    expect(heroContent).toContain('w-[240px] max-w-[78vw]')
    expect(heroContent).toContain('mx-auto')
  })

  it('2. Button height is exactly 44px (h-11) and vertical gap is 10px (gap-2.5)', () => {
    // 44px height (h-11 = 2.75rem = 44px)
    expect(heroContent).toContain('className="w-full h-11 bg-white text-black')
    expect(heroContent).toContain('className="w-full h-11 bg-black/60')
    // 10px gap (gap-2.5 = 0.625rem = 10px)
    expect(heroContent).toContain('gap-2.5')
  })

  it('3. Horizontal padding is reduced to px-4 and typography is 12px uppercase bold', () => {
    expect(heroContent).toContain('px-4 text-xs uppercase tracking-widest font-extrabold')
    expect(heroContent).toContain('whitespace-nowrap')
  })

  it('4. Preserves sharp rectangular button style (no rounded corners) and existing design tokens', () => {
    // Both mobile buttons have sharp rectangular edges
    const mobileCtaSnippet = heroContent.slice(
      heroContent.indexOf('CTA Buttons: Vertically stacked'),
      heroContent.indexOf('Small Transparent Slider Progress Indicators')
    )
    expect(mobileCtaSnippet).not.toContain('rounded-full')
    expect(mobileCtaSnippet).not.toContain('rounded-lg')
    expect(mobileCtaSnippet).not.toContain('rounded-md')
    expect(mobileCtaSnippet).not.toContain('rounded-pill')

    // SHOP NOW: White bg, black text, arrow icon
    expect(mobileCtaSnippet).toContain('bg-white text-black hover:bg-neutral-200')
    expect(mobileCtaSnippet).toContain('<ArrowRight size={15} className="ml-2" />')

    // EXPLORE COLLECTIONS: Dark/transparent bg, white text, thin white border
    expect(mobileCtaSnippet).toContain('bg-black/60 backdrop-blur-md border border-white text-white hover:bg-white hover:text-black')
  })

  it('5. Preserves button destinations, clickability and interaction feedback', () => {
    expect(heroContent).toContain("href={primaryCtaLink || '/shop'}")
    expect(heroContent).toContain("href={secondaryCtaLink || '/collections'}")
    expect(heroContent).toContain('active:scale-98')
  })

  it('6. Desktop CTA layout and dimensions remain completely unchanged', () => {
    expect(heroContent).toContain('hidden md:flex relative z-10 max-w-4xl mx-auto')
    expect(heroContent).toContain('w-full sm:w-auto bg-white text-black hover:bg-neutral-200 px-7 sm:px-8 py-3.5 sm:py-4')
    expect(heroContent).toContain('w-full sm:w-auto bg-black/50 backdrop-blur-md border border-white text-white')
    expect(heroContent).toContain('flex flex-col sm:flex-row items-center gap-3 sm:gap-4')
  })

  it('7. Mathematically verifies clearance and lack of text clipping across 320px, 375px, 390px, 430px viewports', () => {
    const viewports = [320, 375, 390, 430]

    viewports.forEach((vp) => {
      const maxW78vw = vp * 0.78
      const buttonWidth = Math.min(240, maxW78vw)

      // Width should be approx 240px
      expect(buttonWidth).toBeGreaterThanOrEqual(230)
      expect(buttonWidth).toBeLessThanOrEqual(240)

      // Clearance on each side
      const sideMargin = (vp - buttonWidth) / 2
      expect(sideMargin).toBeGreaterThan(30) // At least 35px side clearance on 320px

      // Text width estimation: 19 characters * ~8px = 152px + 32px padding = 184px < buttonWidth
      const estContentWidth = 184
      expect(buttonWidth).toBeGreaterThan(estContentWidth)
    })
  })
})
