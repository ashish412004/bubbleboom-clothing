import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  getSafeAuthReturnPath,
  redirectToSignInWithReturnPath,
  AUTH_REDIRECT_COOKIE,
} from '@/lib/auth-redirect'
import { getSafeRedirect } from '@/lib/origin'

describe('BUBBLE BOOM – Global Smart Login Redirect System', () => {
  describe('1. Centralized Safe Return Path Utility (getSafeAuthReturnPath)', () => {
    it('accepts legitimate internal paths with and without query parameters', () => {
      expect(getSafeAuthReturnPath('/account')).toBe('/account')
      expect(getSafeAuthReturnPath('/account/orders')).toBe('/account/orders')
      expect(getSafeAuthReturnPath('/account/orders/ORD-12345')).toBe('/account/orders/ORD-12345')
      expect(getSafeAuthReturnPath('/account/addresses?action=add')).toBe('/account/addresses?action=add')
      expect(getSafeAuthReturnPath('/account/saved-drops')).toBe('/account/saved-drops')
      expect(getSafeAuthReturnPath('/wishlist')).toBe('/wishlist')
      expect(getSafeAuthReturnPath('/checkout')).toBe('/checkout')
      expect(getSafeAuthReturnPath('/checkout?variant_id=v-123&quantity=2')).toBe(
        '/checkout?variant_id=v-123&quantity=2'
      )
      expect(getSafeAuthReturnPath('/products/oversized-black-tee?action=wishlist')).toBe(
        '/products/oversized-black-tee?action=wishlist'
      )
    })

    it('rejects external protocols and domains', () => {
      expect(getSafeAuthReturnPath('https://evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('http://phishing.site/steal')).toBe('/')
      expect(getSafeAuthReturnPath('ftp://files.com')).toBe('/')
    })

    it('rejects protocol-relative URLs', () => {
      expect(getSafeAuthReturnPath('//evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('///evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('////evil.com/path')).toBe('/')
    })

    it('rejects backslash bypasses and backslash injections', () => {
      expect(getSafeAuthReturnPath('/\\evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('/\\/evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('\\evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('/path\\traversal')).toBe('/')
    })

    it('rejects percent-encoded bypasses (%2f%2f and %5c)', () => {
      expect(getSafeAuthReturnPath('/%2f/evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('/%5c/evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('/%5cevil.com')).toBe('/')
    })

    it('rejects control characters, newlines, and null bytes', () => {
      expect(getSafeAuthReturnPath('/\x00evil')).toBe('/')
      expect(getSafeAuthReturnPath('/\r\nLocation: evil.com')).toBe('/')
      expect(getSafeAuthReturnPath('/account\x08')).toBe('/')
    })

    it('rejects dangerous pseudo-protocols like javascript: and data:', () => {
      expect(getSafeAuthReturnPath('javascript:alert(1)')).toBe('/')
      expect(getSafeAuthReturnPath('/javascript:alert(1)')).toBe('/')
      expect(getSafeAuthReturnPath('/data:text/html,evil')).toBe('/')
      expect(getSafeAuthReturnPath('/vbscript:msgbox(1)')).toBe('/')
    })

    it('prevents redirect loops back to auth endpoints', () => {
      expect(getSafeAuthReturnPath('/login')).toBe('/')
      expect(getSafeAuthReturnPath('/login?next=/checkout')).toBe('/')
      expect(getSafeAuthReturnPath('/signup')).toBe('/')
      expect(getSafeAuthReturnPath('/signup?next=/wishlist')).toBe('/')
      expect(getSafeAuthReturnPath('/auth/callback')).toBe('/')
      expect(getSafeAuthReturnPath('/auth/callback?code=abc')).toBe('/')
      expect(getSafeAuthReturnPath('/logout')).toBe('/')
      expect(getSafeAuthReturnPath('/api/auth/session')).toBe('/')
    })

    it('returns custom fallback when provided for invalid inputs', () => {
      expect(getSafeAuthReturnPath(null, '/shop')).toBe('/shop')
      expect(getSafeAuthReturnPath(undefined, '/shop')).toBe('/shop')
      expect(getSafeAuthReturnPath('', '/shop')).toBe('/shop')
      expect(getSafeAuthReturnPath('https://attacker.com', '/shop')).toBe('/shop')
    })

    it('delegates getSafeRedirect from origin.ts to getSafeAuthReturnPath for backward compatibility', () => {
      expect(getSafeRedirect('/account')).toBe('/account')
      expect(getSafeRedirect('https://evil.com')).toBe('/')
      expect(getSafeRedirect('//evil.com')).toBe('/')
    })
  })

  describe('2. Canonical Sign In URL Builder (redirectToSignInWithReturnPath)', () => {
    it('constructs /login when target is root or empty', () => {
      expect(redirectToSignInWithReturnPath('/')).toBe('/login')
      expect(redirectToSignInWithReturnPath('')).toBe('/login')
      expect(redirectToSignInWithReturnPath(null)).toBe('/login')
    })

    it('constructs encoded /login?next=... for protected destinations', () => {
      expect(redirectToSignInWithReturnPath('/checkout')).toBe('/login?next=%2Fcheckout')
      expect(redirectToSignInWithReturnPath('/account/saved-drops')).toBe(
        '/login?next=%2Faccount%2Fsaved-drops'
      )
      expect(redirectToSignInWithReturnPath('/checkout?variant_id=123')).toBe(
        '/login?next=%2Fcheckout%3Fvariant_id%3D123'
      )
    })

    it('falls back to /login when an external or unsafe URL is supplied', () => {
      expect(redirectToSignInWithReturnPath('https://evil.com')).toBe('/login')
      expect(redirectToSignInWithReturnPath('//evil.com')).toBe('/login')
    })
  })

  describe('3. OAuth Redirect Cookie Constant', () => {
    it('defines bb_auth_redirect cookie name', () => {
      expect(AUTH_REDIRECT_COOKIE).toBe('bb_auth_redirect')
    })
  })

  describe('4. Middleware Architecture and Full Path Preservation', () => {
    const middlewareFile = fs.readFileSync(
      path.join(process.cwd(), 'src', 'middleware.ts'),
      'utf-8'
    )

    it('imports getSafeAuthReturnPath in middleware.ts', () => {
      expect(middlewareFile).toContain("import { getSafeAuthReturnPath } from '@/lib/auth-redirect'")
    })

    it('preserves full path and search params on unauthenticated redirects to /account/*', () => {
      expect(middlewareFile).toContain("pathname + (request.nextUrl.search || '')")
      expect(middlewareFile).toContain("NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(fullTarget), request.url))")
    })

    it('redirects already-authenticated users to their safe intended destination from /login and /signup', () => {
      expect(middlewareFile).toContain("const nextParam = request.nextUrl.searchParams.get('next')")
      expect(middlewareFile).toContain("const target = getSafeAuthReturnPath(nextParam, '/')")
      expect(middlewareFile).toContain("return NextResponse.redirect(new URL(target, request.url))")
    })
  })

  describe('5. OAuth Callback Route Handling (src/app/auth/callback/route.ts)', () => {
    const callbackFile = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'auth', 'callback', 'route.ts'),
      'utf-8'
    )

    it('imports getSafeAuthReturnPath and AUTH_REDIRECT_COOKIE', () => {
      expect(callbackFile).toContain('getSafeAuthReturnPath')
      expect(callbackFile).toContain('AUTH_REDIRECT_COOKIE')
    })

    it('checks both query param and backup cookie for intended destination', () => {
      expect(callbackFile).toContain("cookieStore.get(AUTH_REDIRECT_COOKIE)?.value")
      expect(callbackFile).toContain("getSafeAuthReturnPath(nextParam || cookieNext, '/')")
    })

    it('clears the short-lived OAuth redirect backup cookie on response', () => {
      expect(callbackFile).toContain("response.cookies.set(AUTH_REDIRECT_COOKIE, '', {")
      expect(callbackFile).toContain("maxAge: 0")
    })

    it('preserves nextParam during OAuth failure or code exchange errors', () => {
      expect(callbackFile).toContain("loginUrl.searchParams.set('next', safeRedirect)")
    })
  })

  describe('6. Wishlist Smart Redirect and Single-Action Execution', () => {
    const wishlistPageFile = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'wishlist', 'page.tsx'),
      'utf-8'
    )
    const productCardFile = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'product', 'product-card.tsx'),
      'utf-8'
    )
    const productInteractiveFile = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'products', '[slug]', 'product-interactive.tsx'),
      'utf-8'
    )

    it('redirects unauthenticated /wishlist requests to /login?next=/wishlist', () => {
      expect(wishlistPageFile).toContain("if (!user)")
      expect(wishlistPageFile).toContain("redirect('/login?next=/wishlist')")
      expect(wishlistPageFile).toContain("redirect('/account/saved-drops')")
    })

    it('product card redirects unauthenticated wishlist clicks to login preserving context', () => {
      expect(productCardFile).toContain("if (!authUser)")
      expect(productCardFile).toContain("action=wishlist&productId=")
      expect(productCardFile).toContain("router.push(`/login?next=")
    })

    it('product card auto-resumes wishlist addition once upon return and cleans URL', () => {
      expect(productCardFile).toContain("action === 'wishlist' && targetProductId === product.id")
      expect(productCardFile).toContain("toggleWishlistStore(product.id)")
      expect(productCardFile).toContain("window.history.replaceState")
      expect(productCardFile).toContain("url.searchParams.delete('action')")
    })

    it('product detail page redirects unauthenticated wishlist clicks with selected color context', () => {
      expect(productInteractiveFile).toContain("if (!authUser)")
      expect(productInteractiveFile).toContain("action=wishlist&color=")
      expect(productInteractiveFile).toContain("router.push(`/login?next=")
    })

    it('product detail page auto-resumes wishlist addition and clears URL query parameters', () => {
      expect(productInteractiveFile).toContain("action === 'wishlist' && authUser")
      expect(productInteractiveFile).toContain("toggleWishlistStore(product.id, targetVariantId || undefined)")
      expect(productInteractiveFile).toContain("window.history.replaceState")
    })
  })

  describe('7. Header and Mobile Sidebar Smart Redirect Links', () => {
    const headerFile = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'header', 'header.tsx'),
      'utf-8'
    )

    it('links desktop and mobile account icon to /login?next=/account when unauthenticated', () => {
      expect(headerFile).toContain("href={mounted && authUser ? '/account' : '/login?next=/account'}")
    })

    it('routes wishlist navigation to /wishlist which handles smart auth redirect', () => {
      expect(headerFile).toContain('href="/wishlist"')
    })


    it('preserves clean MY ACCOUNT label without user name in mobile sidebar', () => {
      expect(headerFile).toContain("<span>MY ACCOUNT</span>")
      expect(headerFile).not.toMatch(/<span>\s*\{\s*mounted\s*&&\s*authUser\s*\?\s*`MY ACCOUNT/i)
    })

    it('clears auth redirect cookie on sign out to prevent stale redirect', () => {
      expect(headerFile).toContain("clearAuthRedirectCookie()")
    })
  })

  describe('8. Checkout Redirection and Mutation Safety', () => {
    const checkoutPageFile = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'checkout', 'page.tsx'),
      'utf-8'
    )

    it('redirects unauthenticated checkout attempts to /login?next=/checkout preserving buy-now parameters', () => {
      expect(checkoutPageFile).toContain("if (!user)")
      expect(checkoutPageFile).toContain("redirect('/login?next=/checkout')")
      expect(checkoutPageFile).toContain("redirect(`/login?next=${encodeURIComponent(returnUrl)}`)")
    })

    it('requires explicit customer confirmation on checkout instead of auto-placing orders', () => {
      const checkoutFormFile = fs.readFileSync(
        path.join(process.cwd(), 'src', 'app', 'checkout', 'checkout-form.tsx'),
        'utf-8'
      )
      // Must require user submit action (e.g. handleSubmit)
      expect(checkoutFormFile).toContain("onSubmit={handleSubmit}")
    })
  })

})
