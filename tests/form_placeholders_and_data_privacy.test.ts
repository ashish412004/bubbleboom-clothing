import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Storefront Form Placeholders & Personal Data Privacy Verification', () => {
  const rootDir = process.cwd()

  it('checkout form contains standard generic placeholders and no personal sample data', () => {
    const filePath = path.join(rootDir, 'src', 'app', 'checkout', 'checkout-form.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Must not contain personal names or specific mock data
    expect(content).not.toContain('Mihir Sharma')
    expect(content).not.toContain('mihir@example.com')
    expect(content).not.toContain('Flat 402, Block C, Green Park Residency')

    // Must contain standard placeholders
    expect(content).toContain('placeholder="Enter your full name"')
    expect(content).toContain('placeholder="you@example.com"')
    expect(content).toContain('placeholder="Enter 10-digit mobile number"')
    expect(content).toContain('placeholder="e.g., House/Flat no., street and area"')
    expect(content).toContain('placeholder="e.g., Building name or floor number"')
    expect(content).toContain('placeholder="e.g., Near a school or main road"')
    expect(content).toContain('placeholder="Enter 6-digit PIN code"')
    expect(content).toContain('placeholder="Enter your city"')
    expect(content).toContain('<option value="">Select your state</option>')
    expect(content).toContain('placeholder="e.g., Call before delivery"')
    expect(content).toContain('placeholder="Enter coupon code"')
  })

  it('address manager contains standard generic placeholders and no personal sample data', () => {
    const filePath = path.join(rootDir, 'src', 'app', 'account', 'addresses', 'address-manager.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Must not contain personal names or real addresses
    expect(content).not.toContain('Aryan Sharma')
    expect(content).not.toContain('Flat 402, Skyline Residency, Linking Road')
    expect(content).not.toContain('Near Bandra Post Office')

    // Must contain standard placeholders in Add & Edit forms
    expect(content).toContain('placeholder="Enter your full name"')
    expect(content).toContain('placeholder="Enter 10-digit mobile number"')
    expect(content).toContain('placeholder="e.g., House/Flat no., street and area"')
    expect(content).toContain('placeholder="e.g., Near a school or main road"')
    expect(content).toContain('placeholder="Enter 6-digit PIN code"')
    expect(content).toContain('placeholder="Enter your city"')
    expect(content).toContain('<option value="">Select your state</option>')
  })

  it('saved addresses fallback does not inject dummy personal addresses', () => {
    const pagePath = path.join(rootDir, 'src', 'app', 'account', 'addresses', 'page.tsx')
    const pageContent = fs.readFileSync(pagePath, 'utf-8')
    expect(pageContent).not.toContain('Flat 402, Boom Street')
    expect(pageContent).toContain('addresses = []')

    const routePath = path.join(rootDir, 'src', 'app', 'api', 'addresses', 'route.ts')
    const routeContent = fs.readFileSync(routePath, 'utf-8')
    expect(routeContent).not.toContain('Flat 402, Boom Street')
    expect(routeContent).toContain('return []')
  })

  it('signup form contains clean standard placeholders and no personal sample data', () => {
    const filePath = path.join(rootDir, 'src', 'app', 'signup', 'signup-form.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    expect(content).not.toContain('Ashish Shukla')
    expect(content).not.toContain('name@example.com')
    expect(content).toContain('placeholder="Enter your full name"')
    expect(content).toContain('placeholder="you@example.com"')
    expect(content).toContain('placeholder="Enter your password"')
    expect(content).toContain('placeholder="Re-enter your password"')
  })

  it('login form contains clean standard placeholders and no personal sample data', () => {
    const filePath = path.join(rootDir, 'src', 'app', 'login', 'login-form.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    expect(content).not.toContain('name@example.com')
    expect(content).toContain('placeholder="you@example.com"')
    expect(content).toContain('placeholder="Enter your password"')
  })

  it('forgot password form contains clean standard placeholders', () => {
    const filePath = path.join(rootDir, 'src', 'app', 'forgot-password', 'page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    expect(content).not.toContain('name@example.com')
    expect(content).toContain('placeholder="you@example.com"')
    expect(content).toContain('placeholder="Enter your password"')
    expect(content).toContain('placeholder="Re-enter your password"')
  })

  it('contact form contains clean standard placeholders and no personal sample data', () => {
    const filePath = path.join(rootDir, 'src', 'app', 'contact', 'contact-client.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    expect(content).not.toContain('Rahul Verma')
    expect(content).not.toContain('name@example.com')
    expect(content).toContain('placeholder="Enter your full name"')
    expect(content).toContain('placeholder="you@example.com"')
    expect(content).toContain('placeholder="Describe how we can help you"')
  })

  it('profile forms contain clean standard placeholders', () => {
    const detailsPath = path.join(rootDir, 'src', 'components', 'account', 'profile-details-form.tsx')
    const detailsContent = fs.readFileSync(detailsPath, 'utf-8')
    expect(detailsContent).toContain('placeholder="Enter first name"')
    expect(detailsContent).toContain('placeholder="Enter last name"')

    const profilePath = path.join(rootDir, 'src', 'app', 'account', 'profile', 'profile-form.tsx')
    const profileContent = fs.readFileSync(profilePath, 'utf-8')
    expect(profileContent).toContain('placeholder="Enter your password"')
    expect(profileContent).toContain('placeholder="Re-enter your password"')
  })

  it('cart and product pincode inputs contain clean standard placeholders', () => {
    const cartPath = path.join(rootDir, 'src', 'app', 'cart', 'cart-view.tsx')
    const cartContent = fs.readFileSync(cartPath, 'utf-8')
    expect(cartContent).toContain('placeholder="Enter coupon code"')

    const pincodeCardPath = path.join(rootDir, 'src', 'components', 'product', 'delivery-exchange-card.tsx')
    const pincodeCardContent = fs.readFileSync(pincodeCardPath, 'utf-8')
    expect(pincodeCardContent).toContain('placeholder="Enter 6-digit PIN code"')
  })

  it('track order form contains clean generic input placeholder', () => {
    const trackPath = path.join(rootDir, 'src', 'app', 'track-order', 'track-order-client.tsx')
    const trackContent = fs.readFileSync(trackPath, 'utf-8')
    expect(trackContent).not.toContain('9876543210')
    expect(trackContent).not.toContain('yourname@gmail.com')
    expect(trackContent).toContain('placeholder="Enter 10-digit mobile number or you@example.com"')
  })

  it('return / refund inputs contain clean standard placeholders', () => {
    const ordersPath = path.join(rootDir, 'src', 'app', 'account', 'orders', '[id]', 'order-actions.tsx')
    const ordersContent = fs.readFileSync(ordersPath, 'utf-8')
    expect(ordersContent).toContain('placeholder="Enter account holder name"')
    expect(ordersContent).toContain('placeholder="Enter account number"')
    expect(ordersContent).toContain('placeholder="Enter IFSC code (e.g., HDFC0001234)"')
    expect(ordersContent).toContain('placeholder="Describe how we can help you"')
  })
})
