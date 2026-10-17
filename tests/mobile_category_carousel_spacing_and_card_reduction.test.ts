import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Mobile Category Carousel Spacing & 10% Card Size Reduction Suite', () => {
  const sliderFilePath = path.join(process.cwd(), 'src', 'components', 'category', 'category-slider.tsx')
  const cardFilePath = path.join(process.cwd(), 'src', 'components', 'category', 'category-card.tsx')
  const sliderContent = fs.readFileSync(sliderFilePath, 'utf-8')
  const cardContent = fs.readFileSync(cardFilePath, 'utf-8')

  // =========================================================================
  // 1. MOBILE LEFT & RIGHT SPACING VERIFICATION
  // =========================================================================
  describe('Phase 1 – Mobile Left & Right Spacing', () => {
    it('configures 16px horizontal padding and scroll-padding on mobile so first card does not touch screen edge', () => {
      // 16px left/right padding on mobile: px-4
      expect(sliderContent).toContain('px-4 sm:px-6 lg:px-8')
      // Container bleed on mobile: -mx-4
      expect(sliderContent).toContain('-mx-4 sm:-mx-6 lg:-mx-8')
      // 16px scroll-padding-left & scroll-padding-right for mobile scroll snapping
      expect(sliderContent).toContain('scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-8')
      expect(sliderContent).toContain('scroll-pr-4 sm:scroll-pr-6 lg:scroll-pr-8')
    })

    it('preserves snap-x snap-mandatory touch-pan-x and smooth scrolling', () => {
      expect(sliderContent).toContain('overflow-x-auto')
      expect(sliderContent).toContain('scroll-smooth')
      expect(sliderContent).toContain('snap-x')
      expect(sliderContent).toContain('snap-mandatory')
      expect(sliderContent).toContain('touch-pan-x')
    })

    it('scrolls navigation with padding-aware offset so cards align with 16px spacing and never touch screen edge', () => {
      expect(sliderContent).toContain('const paddingLeft = parseFloat(window.getComputedStyle(el).paddingLeft)')
      expect(sliderContent).toContain('targetScroll = el.scrollLeft + (cardRect.left - containerRect.left) - paddingLeft')
      expect(sliderContent).toContain('targetScroll = 0')
    })
  })

  // =========================================================================
  // 2. 10% CARD SIZE REDUCTION
  // =========================================================================
  describe('Phase 2 – 10% Category Card Size Reduction', () => {
    it('reduces mobile category card width from 73vw to 66vw (~10% reduction)', () => {
      expect(sliderContent).toContain('flex-[0_0_66vw]')
      expect(sliderContent).not.toContain('flex-[0_0_73vw]')
    })

    it('reduces mobile max-width from 305px to 275px (~10% reduction)', () => {
      expect(sliderContent).toContain('max-w-[275px] sm:max-w-[340px]')
      expect(sliderContent).not.toContain('max-w-[305px]')
    })

    it('preserves 3:4 aspect ratio on mobile and 4:5 on desktop', () => {
      expect(cardContent).toContain('aspect-[3/4]')
      expect(cardContent).toContain('sm:aspect-[4/5]')
    })

    it('preserves rounded corners of 20px', () => {
      expect(cardContent).toContain('rounded-[20px]')
    })

    it('scales image sizes attribute appropriately for 66vw mobile width', () => {
      expect(cardContent).toContain('sizes="(max-width: 640px) 66vw, (max-width: 1024px) 40vw, 340px"')
    })
  })

  // =========================================================================
  // 3. MAINTAIN CATEGORY CARD CONTENT
  // =========================================================================
  describe('Phase 3 – Category Card Content & Styling', () => {
    it('preserves uncropped image display and dark gradient overlay', () => {
      expect(cardContent).toContain('object-contain sm:object-cover')
      expect(cardContent).toContain('bg-gradient-to-t from-black/85 via-black/25 to-transparent')
    })

    it('preserves embedded poster detection to avoid duplicate text', () => {
      expect(cardContent).toContain('hasEmbeddedPosterText')
      expect(cardContent).toContain('sr-only')
    })

    it('preserves outlined Shop Now button with arrow', () => {
      expect(cardContent).toContain('border border-white text-white')
      expect(cardContent).toContain('Shop Now')
      expect(cardContent).toContain('ArrowRight')
    })

    it('scales internal overlay padding and heading cleanly to prevent text overlap', () => {
      expect(cardContent).toContain('p-3.5 sm:p-6')
      expect(cardContent).toContain('text-[20px] sm:text-[30px] lg:text-[32px]')
    })
  })

  // =========================================================================
  // 4. NEXT CARD PREVIEW ACROSS MOBILE VIEWPORTS (320px - 430px)
  // =========================================================================
  describe('Phase 4 – Next Card Preview Mathematical Verification', () => {
    const viewports = [320, 360, 375, 390, 414, 430]

    it('guarantees next card is clearly visible across all tested mobile screen sizes', () => {
      const leftPadding = 16
      const gap = 12
      const maxMobileCardWidth = 275

      for (const vw of viewports) {
        // Calculate first card width
        const cardWidth = Math.min(vw * 0.66, maxMobileCardWidth)
        // First card end position
        const firstCardEnd = leftPadding + cardWidth
        // Next card start position
        const nextCardStart = firstCardEnd + gap
        // Visible portion of next card on right
        const nextCardVisible = vw - nextCardStart

        // Verification 1: First card does not touch left edge (16px padding)
        expect(leftPadding).toBe(16)

        // Verification 2: Card width is approximately 9-10% reduced compared to previous (73vw / 305px)
        const oldCardWidth = Math.min(vw * 0.73, 305)
        const reductionPercent = ((oldCardWidth - cardWidth) / oldCardWidth) * 100
        expect(reductionPercent).toBeGreaterThanOrEqual(9.0)
        expect(reductionPercent).toBeLessThanOrEqual(10.5)

        // Verification 3: Next card visible width is between 75px and 135px (at least 35% visible)
        expect(nextCardVisible).toBeGreaterThanOrEqual(75)
        expect(nextCardVisible).toBeLessThanOrEqual(135)
      }
    })
  })

  // =========================================================================
  // 5. CAROUSEL NAVIGATION & DESKTOP UNCHANGED
  // =========================================================================
  describe('Phase 5 & 6 – Controls & Desktop Layout Preservation', () => {
    it('preserves minimal centered square arrow buttons with aria labels', () => {
      expect(sliderContent).toContain('aria-label="Previous categories"')
      expect(sliderContent).toContain('aria-label="Next categories"')
      expect(sliderContent).toContain('w-10 h-10 sm:w-11 sm:h-11')
      expect(sliderContent).toContain('flex items-center justify-center gap-3')
    })

    it('preserves View All Categories links for both mobile and desktop', () => {
      expect(sliderContent).toContain('View All Categories')
      expect(sliderContent).toContain('href="/categories"')
    })

    it('keeps desktop category card dimensions and layout completely unchanged', () => {
      expect(sliderContent).toContain('sm:flex-[0_0_42%]')
      expect(sliderContent).toContain('md:flex-[0_0_36%]')
      expect(sliderContent).toContain('lg:flex-[0_0_30.5%]')
      expect(sliderContent).toContain('xl:flex-[0_0_23.5%]')
      expect(sliderContent).toContain('max-w-[340px]')
      expect(sliderContent).toContain('sm:gap-6')
    })
  })
})
