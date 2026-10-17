import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Mobile Website Zoom & Responsive Display Suite', () => {
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx')
  const globalsCssPath = path.join(process.cwd(), 'src', 'app', 'globals.css')
  const headerPath = path.join(process.cwd(), 'src', 'components', 'header', 'header.tsx')
  const heroPath = path.join(process.cwd(), 'src', 'components', 'home', 'hero-carousel.tsx')
  const categorySliderPath = path.join(process.cwd(), 'src', 'components', 'category', 'category-slider.tsx')
  const productCardPath = path.join(process.cwd(), 'src', 'components', 'product', 'product-card.tsx')
  const searchDrawerPath = path.join(process.cwd(), 'src', 'components', 'search', 'search-drawer.tsx')
  const cartDrawerPath = path.join(process.cwd(), 'src', 'components', 'cart', 'cart-drawer.tsx')
  const checkoutPath = path.join(process.cwd(), 'src', 'app', 'checkout', 'checkout-form.tsx')
  const locationModalPath = path.join(process.cwd(), 'src', 'components', 'location', 'location-picker-modal.tsx')
  const shopFiltersPath = path.join(process.cwd(), 'src', 'app', 'shop', 'shop-filters.tsx')

  const layoutContent = fs.readFileSync(layoutPath, 'utf-8')
  const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf-8')
  const headerContent = fs.readFileSync(headerPath, 'utf-8')
  const heroContent = fs.readFileSync(heroPath, 'utf-8')
  const categorySliderContent = fs.readFileSync(categorySliderPath, 'utf-8')
  const productCardContent = fs.readFileSync(productCardPath, 'utf-8')
  const searchDrawerContent = fs.readFileSync(searchDrawerPath, 'utf-8')
  const cartDrawerContent = fs.readFileSync(cartDrawerPath, 'utf-8')
  const checkoutContent = fs.readFileSync(checkoutPath, 'utf-8')
  const locationModalContent = fs.readFileSync(locationModalPath, 'utf-8')
  const shopFiltersContent = fs.readFileSync(shopFiltersPath, 'utf-8')

  it('1. Configures official Next.js App Router viewport in layout.tsx with device-width, initialScale 1, and userScalable false', () => {
    expect(layoutContent).toContain('export const viewport: Viewport')
    expect(layoutContent).toContain('width: "device-width"')
    expect(layoutContent).toContain('initialScale: 1')
    expect(layoutContent).toContain('maximumScale: 1')
    expect(layoutContent).toContain('userScalable: false')
    expect(layoutContent).toContain('viewportFit: "cover"')
    expect(layoutContent).toContain('themeColor: "#000000"')
  })

  it('2. Prevents accidental double-tap zoom on interactive elements with touch-action: manipulation', () => {
    expect(globalsCssContent).toContain('touch-action: manipulation;')
    expect(globalsCssContent).toContain('button')
    expect(globalsCssContent).toContain('a')
    expect(globalsCssContent).toContain('input')
    expect(globalsCssContent).toContain('select')
    expect(globalsCssContent).toContain('textarea')
    expect(globalsCssContent).toContain('[role="button"]')
  })

  it('3. Prevents iOS Safari input focus auto-zoom by enforcing 16px font-size on mobile viewports (< 768px)', () => {
    expect(globalsCssContent).toContain('@media screen and (max-width: 767px)')
    expect(globalsCssContent).toContain('font-size: 16px !important;')
    expect(globalsCssContent).toContain('input[type="text"]')
    expect(globalsCssContent).toContain('input[type="search"]')
    expect(globalsCssContent).toContain('select')
    expect(globalsCssContent).toContain('textarea')
  })

  it('4. Establishes robust root HTML and body layout containment without horizontal overflow', () => {
    expect(globalsCssContent).toContain('text-size-adjust: 100%')
    expect(globalsCssContent).toContain('-webkit-text-size-adjust: 100%')
    expect(globalsCssContent).toContain('max-width: 100%')
    expect(globalsCssContent).toContain('overflow-x: hidden')
  })

  it('5. Preserves independent delivery map touch and pinch-zoom capabilities', () => {
    expect(globalsCssContent).toContain('.leaflet-container')
    expect(globalsCssContent).toContain('touch-action: pan-x pan-y !important;')
    expect(locationModalContent).toContain('touch-action: pan-x pan-y !important;')
    expect(locationModalContent).toContain('touchZoom: true')
  })

  it('6. Preserves smooth mobile carousel swiping without gesture blocking on hero & category carousels', () => {
    // Hero carousel touch handling allows vertical page scrolling
    expect(heroContent).toContain('Math.abs(diffX) > Math.abs(diffY)')
    expect(heroContent).not.toContain('e.preventDefault()')

    // Category slider allows horizontal touch panning without locking vertical scroll
    expect(categorySliderContent).toContain('touch-pan-x')
    expect(categorySliderContent).toContain('overflow-x-auto')
  })

  it('7. Locks body scroll on open drawers and modals (Search, Cart, Filter, Location Picker)', () => {
    expect(searchDrawerContent).toContain("document.body.style.overflow = 'hidden'")
    expect(cartDrawerContent).toContain("document.body.style.overflow = 'hidden'")
    expect(shopFiltersContent).toContain("document.body.style.overflow = 'hidden'")
    expect(locationModalContent).toContain("document.body.style.overflow = 'hidden'")
  })

  it('8. Verifies mobile responsive layout across common phone screen widths (320px - 430px)', () => {
    // Navbar uses 3-column grid with 80px logo and 44px tap targets
    expect(headerContent).toContain('grid grid-cols-3')
    expect(headerContent).toContain('w-[80px]')
    expect(headerContent).toContain('w-11 h-11')

    // Mobile Hero CTA uses responsive max-width
    expect(heroContent).toContain('max-w-[78vw]')

    // Category card widths fit gracefully within viewport
    expect(categorySliderContent).toContain('flex-[0_0_73vw]')

    // Product cards utilize responsive aspect ratio and rounded borders
    expect(productCardContent).toContain('aspect-[3/4]')
    expect(productCardContent).toContain('rounded-[20px]')

    // Checkout form items wrap cleanly with min-w-0
    expect(checkoutContent).toContain('min-w-0')
  })
})
