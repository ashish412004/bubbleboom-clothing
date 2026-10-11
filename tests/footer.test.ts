import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('Responsive Footer Redesign Suite', () => {
  const footerSource = fs.readFileSync('src/components/footer/footer.tsx', 'utf-8')

  it('removes Admin Portal link from the public footer', () => {
    expect(footerSource).not.toContain('Admin Portal')
    expect(footerSource).not.toContain('href="/admin"')
  })

  it('displays the business email only once in the entire footer component', () => {
    const matches = footerSource.match(/bubbleboomstore2026@gmail\.com/g)
    expect(matches).not.toBeNull()
    expect(matches?.length).toBe(1)
  })

  it('contains the accurate brand statement and concise brand description', () => {
    expect(footerSource).toContain('YOUR STYLE. YOUR RULES.')
    expect(footerSource).toContain('Premium streetwear. Made to stand out.')
    expect(footerSource).toContain('Track Your Order')
  })

  it('includes all required Shop category and drop links including Footwear', () => {
    expect(footerSource).toContain("href: '/shop'")
    expect(footerSource).toContain("href: '/shop?sort=newest'")
    expect(footerSource).toContain("href: '/shop?category=men'")
    expect(footerSource).toContain("href: '/shop?category=women'")
    expect(footerSource).toContain("href: '/shop?category=footwear'")
    expect(footerSource).toContain("href: '/collections'")
    expect(footerSource).toContain("href: '/shop?sale=true'")
  })

  it('includes all required Customer Care links and tracking', () => {
    expect(footerSource).toContain("href: '/contact'")
    expect(footerSource).toContain("href: '/track-order'")
    expect(footerSource).toContain("href: '/size-guide'")
    expect(footerSource).toContain("href: '/shipping-policy'")
    expect(footerSource).toContain("href: '/returns-refunds'")
  })

  it('includes all required Legal links without redundancy', () => {
    expect(footerSource).toContain("href: '/about'")
    expect(footerSource).toContain("href: '/privacy-policy'")
    expect(footerSource).toContain("href: '/terms'")
  })

  it('implements accessible mobile accordion menus collapsed by default', () => {
    // Verifies accordion state defaults to false for all sections
    expect(footerSource).toContain('shop: false')
    expect(footerSource).toContain('care: false')
    expect(footerSource).toContain('legal: false')

    // Verifies aria-expanded and aria-controls for screen readers
    expect(footerSource).toContain('aria-expanded={openSections.shop}')
    expect(footerSource).toContain('aria-controls="footer-shop-menu"')
    expect(footerSource).toContain('aria-expanded={openSections.care}')
    expect(footerSource).toContain('aria-controls="footer-care-menu"')
    expect(footerSource).toContain('aria-expanded={openSections.legal}')
    expect(footerSource).toContain('aria-controls="footer-legal-menu"')

    // Verifies Plus and Minus toggle icons
    expect(footerSource).toContain('<Plus')
    expect(footerSource).toContain('<Minus')
  })

  it('provides responsive desktop/tablet grid layout without horizontal overflow', () => {
    // 4-column desktop / 2-column tablet
    expect(footerSource).toContain('md:grid-cols-2 lg:grid-cols-4')
    expect(footerSource).toContain('hidden md:grid')
    expect(footerSource).toContain('block md:hidden')
  })

  it('contains the compact value props strip with accurate shipping and returns policies', () => {
    expect(footerSource).toContain('Fast All-India Shipping')
    expect(footerSource).toContain('Free delivery on orders above ₹1,499')
    expect(footerSource).toContain('7-Day Easy Returns')
    expect(footerSource).toContain('100% Secure Payments')
  })

  it('connects newsletter form to /api/newsletter with storefront_footer source', () => {
    expect(footerSource).toContain('/api/newsletter')
    expect(footerSource).toContain('storefront_footer')
    expect(footerSource).toContain('Join the Boom Squad')
    expect(footerSource).toContain('Unsubscribe anytime.')
  })

  it('displays a compact copyright and payment support bottom bar', () => {
    expect(footerSource).toContain('©')
    expect(footerSource).toContain('BUBBLE BOOM. All rights reserved.')
    expect(footerSource).toContain('UPI')
    expect(footerSource).toContain('Cards')
    expect(footerSource).toContain('Net Banking')
    expect(footerSource).toContain('COD Available')
  })
})
