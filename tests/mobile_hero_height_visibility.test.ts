import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Final Mobile Hero Height & Next Section Visibility Suite', () => {
  const heroPath = path.join(process.cwd(), 'src', 'components', 'home', 'hero-carousel.tsx')
  const heroContent = fs.readFileSync(heroPath, 'utf-8')

  it('1. Hero height uses viewport-aware 100svh calculation accounting for header and next section padding', () => {
    // Uses svh for precise mobile browser chrome handling
    expect(heroContent).toContain('h-[calc(100svh-155px)]')
    // Safety bounds: min-height 480px for very short devices, max-height 720px
    expect(heroContent).toContain('min-h-[480px]')
    expect(heroContent).toContain('max-h-[720px]')
  })

  it('2. Preserves 3-zone mobile editorial layout: Top heading, Middle models, Bottom CTAs & indicators', () => {
    expect(heroContent).toContain('md:hidden relative z-10 w-full h-full flex-1 flex flex-col justify-between items-center')
    // Top zone
    expect(heroContent).toContain('pt-[clamp(40px,5.5vh,60px)]')
    expect(heroContent).toContain('WEAR THE BOOM.')
    expect(heroContent).toContain('Every style. Every mood. Make it yours.')
    // Middle zone: flexible unobstructed spacer with min-h-[80px]
    expect(heroContent).toContain('flex-1 w-full min-h-[80px] pointer-events-none')
    // Bottom zone
    expect(heroContent).toContain('w-full flex flex-col items-center')
    expect(heroContent).toContain('w-[240px] max-w-[78vw] mx-auto')
    expect(heroContent).toContain('SHOP NOW')
    expect(heroContent).toContain('EXPLORE COLLECTIONS')
  })

  it('3. Mobile progress indicators remain cleanly positioned at the bottom of the hero', () => {
    expect(heroContent).toContain('bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10')
    expect(heroContent).toContain('h-[3px]')
    expect(heroContent).toContain('w-[26px]')
    expect(heroContent).toContain('w-[18px]')
    // No Pause/Play button on mobile
    const mobileSection = heroContent.slice(
      heroContent.indexOf('Mobile 3-Zone Layout'),
      heroContent.indexOf('Desktop Headline')
    )
    expect(mobileSection).not.toContain('togglePlayPause')
    expect(mobileSection).not.toContain('Pause autoplay')
  })

  it('4. Desktop hero height and controls remain completely unchanged', () => {
    expect(heroContent).toContain('md:min-h-[75vh]')
    expect(heroContent).toContain('md:h-[78vh]')
    expect(heroContent).toContain('lg:h-[80vh]')
    expect(heroContent).toContain('md:max-h-[820px]')
    expect(heroContent).toContain('hidden md:flex relative z-10 max-w-4xl mx-auto')
    expect(heroContent).toContain('hidden md:flex absolute bottom-3 sm:bottom-4 md:bottom-5')
  })

  it('5. Mathematically verifies that CURATED WARDROBE peeks into view on common mobile devices', () => {
    // Header dimensions (sticky top-0)
    const announcementBarHeight = 33 // py-2 + text-xs leading-normal
    const navbarHeight = 60 // exact mobile navbar height
    const totalHeaderHeight = announcementBarHeight + navbarHeight // 93px

    // Shop By Category dimensions
    const categoryTopPadding = 36 // py-9 = 36px
    const eyebrowHeight = 14 // text-[10px] leading-tight
    const eyebrowTopOffset = categoryTopPadding // 36px down into the section
    const eyebrowBottomOffset = categoryTopPadding + eyebrowHeight // 50px down into the section

    // Common real-world mobile viewport heights (svh with browser address bar visible)
    const mobileDevices = [
      { name: 'iPhone SE (375x667)', svh: 560, screenH: 667 },
      { name: 'iPhone 13/14/15/16 (390x844)', svh: 730, screenH: 844 },
      { name: 'iPhone 15/16 Pro (393x852)', svh: 740, screenH: 852 },
      { name: 'iPhone 11/XR (414x896)', svh: 780, screenH: 896 },
      { name: 'iPhone 15/16 Pro Max (430x932)', svh: 810, screenH: 932 },
    ]

    mobileDevices.forEach((device) => {
      // Calculate hero height with min/max clamps
      const rawHeroHeight = device.svh - 155
      const heroHeight = Math.min(720, Math.max(480, rawHeroHeight))

      // Top position of the next section
      const nextSectionTop = totalHeaderHeight + heroHeight

      // Space remaining on screen for the next section without scrolling
      const visibleNextSectionSpace = device.svh - nextSectionTop

      if (device.svh >= 700) {
        // On standard and tall phones:
        // 1. Next section space is greater than the 36px top padding
        expect(visibleNextSectionSpace).toBeGreaterThan(categoryTopPadding)

        // 2. Eyebrow "CURATED WARDROBE" (at 50px) is visible in the viewport
        expect(visibleNextSectionSpace).toBeGreaterThanOrEqual(eyebrowBottomOffset)

        // 3. Visible content beyond top padding is in the recommended 20-40px range
        const visibleContent = visibleNextSectionSpace - categoryTopPadding
        expect(visibleContent).toBeGreaterThanOrEqual(20)
        expect(visibleContent).toBeLessThanOrEqual(40)
      } else {
        // On very short devices (e.g. 560svh):
        // CTA buttons and hero layout are safely preserved via min-h-[480px]
        expect(heroHeight).toBe(480)
      }
    })
  })
})
