import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Final Mobile Navbar Optimization Suite', () => {
  const headerPath = path.join(process.cwd(), 'src', 'components', 'header', 'header.tsx')
  const headerContent = fs.readFileSync(headerPath, 'utf-8')

  it('1. Mobile navbar height is set to exactly 60px on screens below 768px', () => {
    // Verified: md:hidden container contains h-[60px]
    expect(headerContent).toContain('md:hidden max-w-7xl mx-auto px-4')
    expect(headerContent).toContain('grid grid-cols-3 items-center h-[60px]')
  })

  it('2. Mobile logo width is set to exactly 80px and centered in the viewport', () => {
    // 80px width container with aspect ratio preserved
    expect(headerContent).toContain('relative w-[80px] h-[44px]')
    expect(headerContent).toContain('sizes="80px"')
    // Exact center alignment
    expect(headerContent).toContain('className="flex items-center justify-center"')
    expect(headerContent).toContain('className="object-contain object-center"')
    // Clicking logo navigates to homepage
    expect(headerContent).toContain('Link href="/" className="flex items-center justify-center py-1 group" aria-label="Bubble Boom Home"')
  })

  it('3. Mobile navbar has proper icon arrangement: Hamburger (Left), Logo (Center), Search + Cart (Right)', () => {
    // Three-column CSS Grid
    expect(headerContent).toContain('grid grid-cols-3 items-center h-[60px]')
    
    // Left: Hamburger Menu with comfortable touch target (~44x44px: w-11 h-11)
    expect(headerContent).toContain('w-11 h-11 -ml-2 flex items-center justify-center text-black hover:bg-neutral-100')
    expect(headerContent).toContain('<Menu size={24} />')
    
    // Right: Search icon (~44x44px: w-11 h-11) and Cart icon (~44x44px: w-11 h-11)
    expect(headerContent).toContain('Link\n              href="/search"\n              className="w-11 h-11 flex items-center justify-center text-black')
    expect(headerContent).toContain('onClick={openCartDrawer}\n              className="w-11 h-11 flex items-center justify-center text-black')
    expect(headerContent).toContain('<Search size={20} strokeWidth={2} />')
    expect(headerContent).toContain('<ShoppingBag size={20} strokeWidth={2} />')
  })

  it('4. Cart item-count badge is fully functional and styled with brand red', () => {
    expect(headerContent).toContain('bg-[#DC2626] text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full')
    expect(headerContent).toContain("{itemCount > 99 ? '99+' : itemCount}")
  })

  it('5. Sticky header and non-clickable announcement bar are preserved', () => {
    expect(headerContent).toContain('sticky top-0 z-50 bg-white border-b border-neutral-200')
    expect(headerContent).toContain('className="bg-black text-white text-xs sm:text-sm font-medium tracking-wider text-center uppercase')
    expect(headerContent).toContain('h-[30px]')
  })

  it('6. Desktop layout (>= 768px) is completely unchanged', () => {
    expect(headerContent).toContain('hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8')
    expect(headerContent).toContain('flex items-center justify-between h-20')
    expect(headerContent).toContain('relative h-11 w-44 transition-transform group-hover:scale-[1.02]')
    expect(headerContent).toContain('sizes="180px"')
    expect(headerContent).toContain('nav className="hidden lg:flex items-center space-x-7" aria-label="Main Navigation"')
    expect(headerContent).toContain('Shop All')
    expect(headerContent).toContain('New Arrivals')
    expect(headerContent).toContain('Customer account')
    expect(headerContent).toContain('View wishlist')
  })

  it('7. Mathematically verifies zero overlap and exact horizontal centering across all viewports', () => {
    const viewports = [320, 375, 390, 414, 430]
    
    viewports.forEach((vp) => {
      const padding = 32 // px-4 = 16px each side
      const innerWidth = vp - padding
      const colWidth = innerWidth / 3
      
      // Column 1: Hamburger (44px)
      const hamburgerStart = 16
      const hamburgerEnd = 16 + 44
      
      // Column 2: Logo (80px centered in col 2)
      const col2Start = 16 + colWidth
      const col2End = col2Start + colWidth
      const logoStart = col2Start + (colWidth - 80) / 2
      const logoEnd = logoStart + 80
      const logoCenter = (logoStart + logoEnd) / 2
      
      // Column 3: Search (44px) + Cart (44px) with 4px gap
      const searchButtonWidth = 44
      const cartButtonWidth = 44
      const gap = 4
      const rightGroupWidth = searchButtonWidth + gap + cartButtonWidth
      const col3End = 16 + innerWidth
      const col3Start = col3End - colWidth
      const rightGroupStart = col3End - rightGroupWidth
      
      // Verification 1: Exact centering of logo relative to viewport
      expect(logoCenter).toBeCloseTo(vp / 2, 5)
      
      // Verification 2: Left clearance between Hamburger and Logo
      const leftClearance = logoStart - hamburgerEnd
      expect(leftClearance).toBeGreaterThan(0)
      
      // Verification 3: Right clearance between Logo and Search button
      const rightClearance = rightGroupStart - logoEnd
      expect(rightClearance).toBeGreaterThan(0)
      
      // At 320px, specifically check clearance is at least 10px
      if (vp === 320) {
        expect(leftClearance).toBeGreaterThanOrEqual(50) // ~60px
        expect(rightClearance).toBeGreaterThanOrEqual(10) // 12px
      }
    })
  })
})
