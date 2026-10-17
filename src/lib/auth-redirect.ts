/**
 * Centralized Smart Login Redirect System & Security Validation for BUBBLE BOOM.
 * 
 * Provides unified redirect resolution across Email/Password, Email OTP, Google OAuth,
 * guest actions, and registration flows while strictly preventing open-redirect vulnerabilities.
 */

export const AUTH_REDIRECT_COOKIE = 'bb_auth_redirect'

// Routes that must never be targeted as return paths to prevent infinite redirect loops
const FORBIDDEN_REDIRECT_PREFIXES = [
  '/login',
  '/signup',
  '/auth/callback',
  '/logout',
  '/api/auth',
]

/**
 * Validates a potential redirect return path against open redirect vulnerabilities,
 * malicious schemes, backslash bypasses, and redirect loops.
 *
 * @param rawPath The raw candidate path (usually from query param `?next=` or cookie)
 * @param fallback The fallback path if the candidate is invalid (defaults to '/')
 * @returns A guaranteed safe relative path starting with '/'
 */
export function getSafeAuthReturnPath(
  rawPath: string | null | undefined,
  fallback: string = '/'
): string {
  if (!rawPath || typeof rawPath !== 'string') {
    return fallback
  }

  const trimmed = rawPath.trim()

  // 1. Must be a relative path starting with a single '/'
  if (!trimmed.startsWith('/')) {
    return fallback
  }

  // 2. Reject protocol-relative URLs (e.g., //evil.com or ///evil.com)
  if (trimmed.startsWith('//')) {
    return fallback
  }

  // 3. Reject backslash bypasses (e.g., /\evil.com, /\\evil.com, or embedded \)
  if (trimmed.includes('\\')) {
    return fallback
  }

  // 4. Reject control characters, carriage returns, newlines, and null bytes
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback
  }

  // 5. Decode URL components to inspect for double-encoding bypasses (e.g., %2f%2f or %5c)
  try {
    const decoded = decodeURIComponent(trimmed)
    if (decoded.startsWith('//') || decoded.includes('\\')) {
      return fallback
    }
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1F\x7F]/.test(decoded)) {
      return fallback
    }
  } catch {
    // Malformed URI sequence
    return fallback
  }

  // 6. Reject dangerous pseudo-protocols even if prefixed with / (e.g., /javascript:, /data:)
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('/javascript:') ||
    lower.startsWith('/data:') ||
    lower.startsWith('/vbscript:')
  ) {
    return fallback
  }

  // 7. Prevent infinite redirect loops back to auth/callback endpoints
  // Extract path without query string or hash for prefix check
  const pathOnly = lower.split('?')[0].split('#')[0]
  for (const forbidden of FORBIDDEN_REDIRECT_PREFIXES) {
    if (pathOnly === forbidden || pathOnly.startsWith(`${forbidden}/`)) {
      return fallback
    }
  }

  return trimmed
}

/**
 * Builds the canonical login URL with a preserved safe return path.
 *
 * @param targetPath The destination the user intended to reach. If omitted in browser,
 *                   uses window.location.pathname + search.
 */
export function redirectToSignInWithReturnPath(targetPath?: string | null): string {
  let destination = targetPath

  if (!destination && typeof window !== 'undefined') {
    destination = window.location.pathname + window.location.search
  }

  const safePath = getSafeAuthReturnPath(destination, '/')

  if (safePath === '/') {
    return '/login'
  }

  return `/login?next=${encodeURIComponent(safePath)}`
}

/**
 * Sets a short-lived client cookie as an OAuth redirect backup in case
 * the OAuth provider or intermediate proxy strips URL query parameters.
 */
export function setAuthRedirectCookie(targetPath: string): void {
  if (typeof document === 'undefined') return
  const safe = getSafeAuthReturnPath(targetPath, '/')
  // 10-minute expiry, SameSite Lax for OAuth redirect compatibility
  document.cookie = `${AUTH_REDIRECT_COOKIE}=${encodeURIComponent(safe)}; path=/; max-age=600; SameSite=Lax`
}

/**
 * Clears the OAuth redirect backup cookie.
 */
export function clearAuthRedirectCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_REDIRECT_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}
