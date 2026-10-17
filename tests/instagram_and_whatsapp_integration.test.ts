import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  cleanWhatsAppNumber,
  isWhatsAppSupportActive,
  buildWhatsAppUrl,
  DEFAULT_SOCIAL_SETTINGS,
} from '../src/lib/settings'

describe('Bubble Boom – Instagram & WhatsApp Integration Suite', () => {
  const footerPath = path.join(process.cwd(), 'src', 'components', 'footer', 'footer.tsx')
  const aboutPagePath = path.join(process.cwd(), 'src', 'app', 'about', 'page.tsx')
  const contactPagePath = path.join(process.cwd(), 'src', 'app', 'contact', 'page.tsx')
  const contactClientPath = path.join(process.cwd(), 'src', 'app', 'contact', 'contact-client.tsx')
  const settingsTypesPath = path.join(process.cwd(), 'src', 'types', 'settings.ts')
  const settingsLibPath = path.join(process.cwd(), 'src', 'lib', 'settings.ts')
  const adminSettingsClientPath = path.join(process.cwd(), 'src', 'app', 'admin', 'settings', 'settings-client.tsx')
  const socialConfigApiPath = path.join(process.cwd(), 'src', 'app', 'api', 'social-config', 'route.ts')
  const floatingButtonPath = path.join(process.cwd(), 'src', 'components', 'support', 'whatsapp-floating-button.tsx')
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx')
  const ordersDrawerPath = path.join(process.cwd(), 'src', 'components', 'account', 'orders-view-with-drawer.tsx')
  const accountOrderDetailPath = path.join(process.cwd(), 'src', 'app', 'account', 'orders', '[id]', 'page.tsx')
  const productInteractivePath = path.join(process.cwd(), 'src', 'app', 'products', '[slug]', 'product-interactive.tsx')

  const footerContent = fs.readFileSync(footerPath, 'utf-8')
  const aboutPageContent = fs.readFileSync(aboutPagePath, 'utf-8')
  const contactPageContent = fs.readFileSync(contactPagePath, 'utf-8')
  const contactClientContent = fs.readFileSync(contactClientPath, 'utf-8')
  const settingsTypesContent = fs.readFileSync(settingsTypesPath, 'utf-8')
  const settingsLibContent = fs.readFileSync(settingsLibPath, 'utf-8')
  const adminSettingsClientContent = fs.readFileSync(adminSettingsClientPath, 'utf-8')
  const socialConfigApiContent = fs.readFileSync(socialConfigApiPath, 'utf-8')
  const floatingButtonContent = fs.readFileSync(floatingButtonPath, 'utf-8')
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8')
  const ordersDrawerContent = fs.readFileSync(ordersDrawerPath, 'utf-8')
  const accountOrderDetailContent = fs.readFileSync(accountOrderDetailPath, 'utf-8')
  const productInteractiveContent = fs.readFileSync(productInteractivePath, 'utf-8')

  // ==========================================
  // SECTION 1: INSTAGRAM INTEGRATION
  // ==========================================
  it('1. Footer displays accessible Instagram icon on desktop and mobile linking to official profile', () => {
    expect(footerContent).toContain('https://www.instagram.com/bubbleboomstore/')
    expect(footerContent).toContain('aria-label="Follow Bubble Boom on Instagram"')
    expect(footerContent).toContain('target="_blank"')
    expect(footerContent).toContain('rel="noopener noreferrer"')
    expect(footerContent).toContain('@bubbleboomstore')
    // Hover animation
    expect(footerContent).toContain('hover:scale-110')
  })

  it('2. About Bubble Boom page includes the FOLLOW THE BOOM section with required text and CTA', () => {
    expect(aboutPageContent).toContain('FOLLOW THE BOOM')
    expect(aboutPageContent).toContain('Stay connected for new drops, fresh fits, and everything Bubble Boom.')
    expect(aboutPageContent).toContain('FOLLOW US ON INSTAGRAM ↗')
    expect(aboutPageContent).toContain('https://www.instagram.com/bubbleboomstore/')
    expect(aboutPageContent).toContain('@bubbleboomstore')
  })

  it('3. Contact Us page displays official Instagram as alternative social channel', () => {
    expect(contactClientContent).toContain('@bubbleboomstore')
    expect(contactClientContent).toContain('Visit Instagram')
    expect(contactClientContent).toContain('Instagram DMs are checked periodically and not monitored 24/7')
  })

  // ==========================================
  // SECTION 2: CENTRALIZED CONFIG & DEFAULT STATE
  // ==========================================
  it('4. Centralized StoreSocialSettings defaults to WhatsApp DISABLED with empty number', () => {
    expect(DEFAULT_SOCIAL_SETTINGS.whatsapp_support_enabled).toBe(false)
    expect(DEFAULT_SOCIAL_SETTINGS.whatsapp_number).toBe('')
    expect(DEFAULT_SOCIAL_SETTINGS.instagram_url).toBe('https://www.instagram.com/bubbleboomstore/')
    expect(DEFAULT_SOCIAL_SETTINGS.instagram_handle).toBe('@bubbleboomstore')
    expect(DEFAULT_SOCIAL_SETTINGS.instagram_enabled).toBe(true)

    expect(settingsTypesContent).toContain('StoreSocialSettings')
    expect(settingsLibContent).toContain('getSocialSettings')
  })

  it('5. WhatsApp helper functions sanitize numbers and guard against invalid/disabled states', () => {
    // Sanitization
    expect(cleanWhatsAppNumber('+91 98765-43210')).toBe('919876543210')
    expect(cleanWhatsAppNumber('  91 98765 43210 ')).toBe('919876543210')
    expect(cleanWhatsAppNumber('')).toBe('')
    expect(cleanWhatsAppNumber(null)).toBe('')

    // Active checker
    expect(isWhatsAppSupportActive({ whatsapp_support_enabled: false, whatsapp_number: '919876543210' })).toBe(false)
    expect(isWhatsAppSupportActive({ whatsapp_support_enabled: true, whatsapp_number: '' })).toBe(false)
    expect(isWhatsAppSupportActive({ whatsapp_support_enabled: true, whatsapp_number: '123' })).toBe(false)
    expect(isWhatsAppSupportActive({ whatsapp_support_enabled: true, whatsapp_number: '919876543210' })).toBe(true)

    // URL builder
    expect(buildWhatsAppUrl('', 'Test message')).toBeNull()
    expect(buildWhatsAppUrl('123', 'Test message')).toBeNull()
    const builtUrl = buildWhatsAppUrl('919876543210', 'Hi Bubble Boom, I need help with my order.')
    expect(builtUrl).toBe('https://wa.me/919876543210?text=Hi%20Bubble%20Boom%2C%20I%20need%20help%20with%20my%20order.')
  })

  // ==========================================
  // SECTION 3: CONDITIONAL WHATSAPP TOUCHPOINTS
  // ==========================================
  it('6. Floating WhatsApp button renders null when disabled or number is missing', () => {
    expect(floatingButtonContent).toContain('if (!config || !config.whatsapp_support_enabled || !config.whatsapp_number)')
    expect(floatingButtonContent).toContain('return null')
    expect(floatingButtonContent).toContain('Chat with Bubble Boom on WhatsApp')
    expect(floatingButtonContent).toContain('min-w-[44px]')
    expect(floatingButtonContent).toContain('min-h-[44px]')
    // Mobile position: bottom-20 (above safe-area & sticky controls)
    expect(floatingButtonContent).toContain('bottom-20')
    // Desktop position: bottom-6
    expect(floatingButtonContent).toContain('sm:bottom-6')

    // Mounted in layout
    expect(layoutContent).toContain('<WhatsAppFloatingButton />')
  })

  it('7. Contact Us WhatsApp action is conditionally rendered only when enabled with valid number', () => {
    expect(contactClientContent).toContain('isWhatsAppActive')
    expect(contactClientContent).toContain('CHAT ON WHATSAPP ↗')
    expect(contactClientContent).toContain('wa.me')
  })

  it('8. My Orders drawer and detail page support action is hidden until WhatsApp enabled with order reference', () => {
    // Drawer
    expect(ordersDrawerContent).toContain('NEED HELP WITH THIS ORDER?')
    expect(ordersDrawerContent).toContain('whatsapp_support_enabled')
    expect(ordersDrawerContent).toContain('selectedOrder.order_number')

    // Full-page order detail
    expect(accountOrderDetailContent).toContain('NEED HELP WITH THIS ORDER?')
    expect(accountOrderDetailContent).toContain('isWhatsAppActive')
    expect(accountOrderDetailContent).toContain('order.order_number')
  })

  it('9. Product detail page includes discreet WhatsApp enquiry link when enabled', () => {
    expect(productInteractiveContent).toContain('Ask About This Product')
    expect(productInteractiveContent).toContain('whatsapp_support_enabled')
    expect(productInteractiveContent).toContain('product.name')
  })

  // ==========================================
  // SECTION 4: ADMIN SETTINGS CONTROL
  // ==========================================
  it('10. Admin Settings includes comprehensive Social Media & WhatsApp controls with validation & preview', () => {
    expect(adminSettingsClientContent).toContain('Social Media &amp; WhatsApp Customer Support')
    expect(adminSettingsClientContent).toContain('Official Profile URL')
    expect(adminSettingsClientContent).toContain('WhatsApp Business Number')
    expect(adminSettingsClientContent).toContain('Enable WhatsApp Support')
    expect(adminSettingsClientContent).toContain('Default Customer Greeting')
    // Validation
    expect(adminSettingsClientContent).toContain('cleanWaDigits.length < 10')
    // Live link preview
    expect(adminSettingsClientContent).toContain('https://wa.me/')
    expect(adminSettingsClientContent).toContain('Test WhatsApp')
  })
})
