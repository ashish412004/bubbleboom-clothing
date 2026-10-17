/**
 * Resolves the approved application origin for OAuth redirects and public URLs.
 * Strictly eliminates accidental localhost fallbacks in production environments.
 */
export const PRODUCTION_ORIGIN = 'https://bubbleboom-clothing.vercel.app'

export function getAppOrigin(request?: Request): string {
  // 1. If Request object is provided (server runtime / route handler)
  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

    if (forwardedHost) {
      if (process.env.NODE_ENV === 'development') {
        return `${forwardedProto}://${forwardedHost}`
      }
      if (!forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
        return `${forwardedProto}://${forwardedHost}`
      }
    }

    const host = request.headers.get('host')
    if (host) {
      if (process.env.NODE_ENV === 'development') {
        const proto = request.headers.get('x-forwarded-proto') || 'http'
        return `${proto}://${host}`
      }
      if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        return `https://${host}`
      }
    }
  }

  // 2. Browser runtime: use the current window's origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    const locOrigin = window.location.origin
    const isValidHttp =
      typeof locOrigin === 'string' &&
      (locOrigin.startsWith('http://') || locOrigin.startsWith('https://'))

    if (isValidHttp) {
      if (process.env.NODE_ENV === 'development') {
        return locOrigin
      }
      if (!locOrigin.includes('localhost') && !locOrigin.includes('127.0.0.1')) {
        return locOrigin
      }
    }
  }

  // 3. Explicit NEXT_PUBLIC_SITE_URL environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl && typeof siteUrl === 'string') {
    const cleaned = siteUrl.replace(/\/+$/, '')
    const isValid = cleaned.startsWith('http://') || cleaned.startsWith('https://')
    if (isValid) {
      if (process.env.NODE_ENV === 'development') {
        return cleaned
      }
      if (!cleaned.includes('localhost') && !cleaned.includes('127.0.0.1')) {
        return cleaned
      }
    }
  }

  // 4. Vercel deployment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 5. Localhost only when explicitly in local development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  // 6. Safe production default
  return PRODUCTION_ORIGIN
}


import { getSafeAuthReturnPath } from './auth-redirect'

export { getSafeAuthReturnPath }

/**
 * Validates a redirect target path to prevent open redirect vulnerabilities.
 * Delegates to centralized getSafeAuthReturnPath.
 */
export function getSafeRedirect(nextParam: string | null | undefined, fallback: string = '/'): string {
  return getSafeAuthReturnPath(nextParam, fallback)
}

