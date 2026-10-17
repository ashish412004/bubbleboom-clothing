import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Mobile Homepage Hero Redesign Suite', () => {
  const heroPath = path.join(process.cwd(), 'src', 'components', 'home', 'hero-carousel.tsx')
  const content = fs.readFileSync(heroPath, 'utf-8')

  it('1. Mobile layout restores full original height and divides hero into 3 distinct zones', () => {
    // Restored full-height mobile hero
    expect(content).toContain('min-h-[75vh]')
    expect(content).toContain('h-[80vh]')
    // Mobile container
    expect(content).toContain('md:hidden relative z-10 w-full h-full flex-1 flex flex-col justify-between items-center')
    // Top zone with top padding
    expect(content).toContain('pt-[clamp(48px,7vh,68px)]')
    // Middle zone: unobstructed visual spacer
    expect(content).toContain('flex-1 w-full min-h-[160px] pointer-events-none')
    // Bottom zone
    expect(content).toContain('w-full flex flex-col items-center')
  })

  it('2. Top zone has bold heading and subtitle with correct spacing', () => {
    expect(content).toContain('WEAR THE BOOM.')
    expect(content).toContain('Every style. Every mood. Make it yours.')
    expect(content).toContain('mt-3 min-[380px]:mt-3.5')
    expect(content).toContain('text-3xl min-[380px]:text-4xl min-[440px]:text-5xl')
  })

  it('3. Bottom zone has vertically stacked CTA buttons with equal widths and proper separation', () => {
    expect(content).toContain('flex flex-col gap-2.5 sm:gap-3 w-full max-w-[280px] min-[380px]:max-w-[320px]')
    expect(content).toContain('h-11 min-[380px]:h-12')
    expect(content).toContain('mb-5 min-[380px]:mb-6')
  })

  it('4. Mobile slider capsule is extra compact, light, transparent, and removes visible Pause/Play button', () => {
    expect(content).toContain('bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10')
    expect(content).toContain('h-[3px]')
    expect(content).toContain('w-[26px]')
    expect(content).toContain('w-[18px]')
    // The mobile capsule does not include the togglePlayPause button
    const mobileSection = content.slice(content.indexOf('Mobile 3-Zone Layout'), content.indexOf('Desktop Headline'))
    expect(mobileSection).not.toContain('togglePlayPause')
    expect(mobileSection).not.toContain('Pause autoplay')
    expect(mobileSection).not.toContain('Resume autoplay')
  })

  it('5. Desktop layout remains completely unchanged on md and above', () => {
    expect(content).toContain('hidden md:flex relative z-10 max-w-4xl mx-auto')
    expect(content).toContain('hidden md:flex absolute bottom-3 sm:bottom-4 md:bottom-5')
    expect(content).toContain('w-[44px]')
    expect(content).toContain('w-[28px]')
    expect(content).toContain('h-[3.5px]')
    expect(content).toContain('togglePlayPause')
    expect(content).toContain('Pause autoplay')
    expect(content).toContain('Resume autoplay')
  })
})
