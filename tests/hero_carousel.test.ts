import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { HERO_SLIDES } from '@/components/home/hero-carousel'

describe('Homepage Hero Background Carousel Assets & Optimization', () => {
  const brandDir = path.join(process.cwd(), 'public', 'images', 'brand')

  it('provides all 4 optimized hero banners across WebP, AVIF, and PNG formats', () => {
    for (let i = 1; i <= 4; i++) {
      const webpFile = path.join(brandDir, `hero-banner-${i}.webp`)
      const avifFile = path.join(brandDir, `hero-banner-${i}.avif`)
      const pngFile = path.join(brandDir, `hero-banner-${i}.png`)

      expect(fs.existsSync(webpFile), `hero-banner-${i}.webp exists`).toBe(true)
      expect(fs.existsSync(avifFile), `hero-banner-${i}.avif exists`).toBe(true)
      expect(fs.existsSync(pngFile), `hero-banner-${i}.png exists`).toBe(true)

      // Ensure optimized file sizes are compact (< 250KB)
      const webpSize = fs.statSync(webpFile).size
      const avifSize = fs.statSync(avifFile).size
      expect(webpSize).toBeLessThan(250 * 1024)
      expect(avifSize).toBeLessThan(250 * 1024)
    }
  })

  it('has prioritized banner 1 for initial LCP render', () => {
    const banner1Webp = path.join(brandDir, 'hero-banner-1.webp')
    const banner1Size = fs.statSync(banner1Webp).size

    // Extremely lightweight initial payload for rapid First Contentful Paint
    expect(banner1Size).toBeLessThan(100 * 1024)
  })

  it('defines structured slides with accessible labels and fallback support', () => {
    expect(HERO_SLIDES.length).toBe(4)
    for (const slide of HERO_SLIDES) {
      expect(slide.id).toBeDefined()
      expect(slide.src).toMatch(/\.(webp|png|jpg)$/)
      expect(slide.alt.length).toBeGreaterThan(10)
      expect(slide.title).toBeDefined()
    }
  })

  it('verifies hero-carousel.tsx includes manual arrows and reduced darkness styling', () => {
    const componentPath = path.join(process.cwd(), 'src', 'components', 'home', 'hero-carousel.tsx')
    const content = fs.readFileSync(componentPath, 'utf-8')

    // Verifies arrows are present
    expect(content).toContain('Previous slide')
    expect(content).toContain('Next slide')
    expect(content).toContain('ChevronLeft')
    expect(content).toContain('ChevronRight')

    // Verifies reduced darkness overlay styling
    expect(content).toContain('radial-gradient')
    expect(content).toContain('linear-gradient')
    expect(content).not.toContain('bg-black/60 bg-gradient-to-t from-black')

    // Verifies autoplay hover-pause & touch gestures
    expect(content).toContain('onMouseEnter')
    expect(content).toContain('onMouseLeave')
    expect(content).toContain('onTouchStart')
    expect(content).toContain('onTouchEnd')
  })

  it('provides dedicated vertical mobile hero images for all 4 slides', () => {
    for (let i = 1; i <= 4; i++) {
      const ext = i === 1 ? 'png' : 'jpg'
      const mobileFile = path.join(brandDir, `hero-banner-${i}-mobile.${ext}`)
      expect(fs.existsSync(mobileFile), `hero-banner-${i}-mobile.${ext} exists`).toBe(true)

      const slide = HERO_SLIDES[i - 1]
      expect(slide.mobileSrc).toBe(`/images/brand/hero-banner-${i}-mobile.${ext}`)
    }
  })

  it('implements responsive image separation with 768px (md) breakpoint and LCP priority', () => {
    const componentPath = path.join(process.cwd(), 'src', 'components', 'home', 'hero-carousel.tsx')
    const content = fs.readFileSync(componentPath, 'utf-8')

    // Desktop container hidden on mobile (< 768px), visible on md and up
    expect(content).toContain('hidden md:block absolute inset-0')
    // Mobile container visible on mobile (< 768px), hidden on md and up
    expect(content).toContain('block md:hidden absolute inset-0')

    // Uses separate mobileSrc with fallback to slide.src
    expect(content).toContain('src={slide.mobileSrc || slide.src}')

    // Preserves original desktop src and cropping
    expect(content).toContain('src={slide.src}')
    expect(content).toContain('object-[72%_center] sm:object-center')

    // Preserves LCP priority on primary slide
    expect(content).toContain('priority={index === 0}')

    // Verifies removal of the BUBBLE BOOM ORIGINALS badge while preserving headline and CTAs
    expect(content).not.toContain('BUBBLE BOOM ORIGINALS')
    expect(content).toContain('WEAR THE BOOM.')
    expect(content).toContain('SHOP NOW')
    expect(content).toContain('EXPLORE COLLECTIONS')
  })
})
