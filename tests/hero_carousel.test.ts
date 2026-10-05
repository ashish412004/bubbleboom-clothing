import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

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
})
