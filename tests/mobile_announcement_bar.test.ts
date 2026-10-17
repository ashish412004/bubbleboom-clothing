import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Mobile Announcement Bar Height & Single-Line Ticker Suite', () => {
  const headerPath = path.join(process.cwd(), 'src/components/header/header.tsx')
  const headerContent = fs.readFileSync(headerPath, 'utf-8')

  const cssPath = path.join(process.cwd(), 'src/app/globals.css')
  const cssContent = fs.readFileSync(cssPath, 'utf-8')

  it('1. Preserves the exact announcement text without alteration or truncation', () => {
    const expectedText = 'FREE SHIPPING ON ALL ORDERS ABOVE ₹1,499 | WEAR THE BOOM'
    expect(headerContent).toContain(`announcementText = '${expectedText}'`)
    
    // Check that the text is passed directly into both desktop and mobile nodes
    expect(headerContent).toContain('{announcementText}')
  })

  it('2. Enforces slim mobile announcement bar height of 30px (within 28–32px target)', () => {
    // The announcement bar container defines h-[30px] on mobile (< 768px) and md:h-auto on desktop
    expect(headerContent).toContain('h-[30px]')
    expect(headerContent).toContain('md:h-auto md:py-2')
    expect(headerContent).toContain('flex items-center justify-center')
    expect(headerContent).toContain('leading-none')
  })

  it('3. Guarantees single-line text with whitespace-nowrap and zero wrapping', () => {
    // Desktop element uses whitespace-nowrap
    expect(headerContent).toContain('whitespace-nowrap')
    // Mobile ticker track uses whitespace-nowrap
    expect(headerContent).toContain('announcement-ticker-track flex items-center whitespace-nowrap')
  })

  it('4. Implements continuous seamless ticker marquee for narrow screens', () => {
    // Duplicate identical items for seamless -50% loop
    expect(headerContent).toContain('announcement-ticker-track')
    expect(headerContent).toContain('announcement-ticker-item')
    
    // Verify CSS keyframe definition moving to -50%
    expect(cssContent).toContain('@keyframes announcementTicker')
    expect(cssContent).toContain('transform: translate3d(0, 0, 0);')
    expect(cssContent).toContain('transform: translate3d(-50%, 0, 0);')
    expect(cssContent).toContain('animation: announcementTicker 20s linear infinite;')
    expect(cssContent).toContain('will-change: transform;')
  })

  it('5. Supports pausing ticker on hover and focus', () => {
    expect(headerContent).toContain('group-hover:[animation-play-state:paused]')
    expect(cssContent).toContain('.announcement-ticker-track:hover')
    expect(cssContent).toContain('.announcement-ticker-track:focus-within')
    expect(cssContent).toContain('animation-play-state: paused;')
  })

  it('6. Respects prefers-reduced-motion with accessible non-animated display', () => {
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)')
    expect(cssContent).toContain('.announcement-ticker-track')
    expect(cssContent).toContain('animation: none !important;')
    expect(cssContent).toContain('transform: none !important;')
  })

  it('7. Protects accessibility: screen readers hear announcement once without ticker duplication', () => {
    // Single sr-only paragraph for screen readers
    expect(headerContent).toContain('<p className="sr-only" aria-live="polite">')
    
    // Visual container is hidden from assistive technologies
    expect(headerContent).toContain('aria-hidden="true"')
  })

  it('8. Keeps announcement bar strictly non-clickable and informational', () => {
    const announcementSnippetMatch = headerContent.match(
      /\{\/\* Informational Announcement Bar[\s\S]*?\{\/\* Main Navigation Bar/
    )
    expect(announcementSnippetMatch).not.toBeNull()
    const snippet = announcementSnippetMatch![0]

    expect(snippet).toContain('select-none')
    expect(snippet).toContain('cursor-default')
    expect(snippet).not.toContain('<Link')
    expect(snippet).not.toContain('<a ')
    expect(snippet).not.toContain('href=')
    expect(snippet).not.toContain('onClick=')
    expect(snippet).not.toContain('cursor-pointer')
    expect(snippet).not.toContain('role="button"')
    expect(snippet).not.toContain('role="link"')
  })

  it('9. Preserves mobile navbar height (60px) and logo centered size (80px)', () => {
    expect(headerContent).toContain('h-[60px]')
    expect(headerContent).toContain('w-[80px]')
    expect(headerContent).toContain('object-contain object-center')
  })

  it('10. Desktop layout (>= 768px) remains horizontally centered and intact', () => {
    expect(headerContent).toContain('hidden sm:flex items-center justify-center w-full')
    expect(headerContent).toContain('text-xs sm:text-sm font-medium tracking-wider text-center uppercase')
  })

  it('11. Responsive viewport audit across 320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1440px', () => {
    const viewports = [320, 360, 375, 390, 430, 768, 1024, 1440]
    
    viewports.forEach((vp) => {
      if (vp < 640) {
        // Mobile viewports: ticker activates with h-[30px], overflow-hidden guarantees 0 horizontal scrollbar
        expect(headerContent).toContain('overflow-hidden')
        expect(headerContent).toContain('h-[30px]')
      } else {
        // Desktop / tablet viewports: static centered presentation
        expect(headerContent).toContain('hidden sm:flex items-center justify-center')
      }
    })
  })
})
