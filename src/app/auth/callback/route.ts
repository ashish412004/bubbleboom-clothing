import { createServerClientWithCookieCollector } from '@/lib/supabase/server'
import { mergeGuestCartIntoUserCart } from '@/lib/cart'
import { mergeGuestWishlistIntoUserWishlist } from '@/lib/wishlist'
import { getAppOrigin, getSafeRedirect } from '@/lib/origin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const oauthError = requestUrl.searchParams.get('error')
  const oauthErrorDesc = requestUrl.searchParams.get('error_description')

  // Resolve approved app origin (guaranteed non-localhost in production)
  const appOrigin = getAppOrigin(request)

  // Validate redirect to prevent open redirect vulnerabilities, default to homepage (/)
  const safeRedirect = getSafeRedirect(nextParam, '/')

  // 1. Handle incoming OAuth provider errors (e.g. user cancelled prompt)
  if (oauthError || oauthErrorDesc) {
    const errorMsg = oauthError === 'access_denied'
      ? 'Google sign in was cancelled. Please try again.'
      : (oauthErrorDesc || oauthError || 'Google authentication failed.')
    const loginUrl = new URL('/login', appOrigin)
    loginUrl.searchParams.set('error', errorMsg)
    if (safeRedirect !== '/') {
      loginUrl.searchParams.set('next', safeRedirect)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 2. Validate that authorization code is present
  if (!code) {
    const loginUrl = new URL('/login', appOrigin)
    loginUrl.searchParams.set('error', 'No authentication code was received.')
    if (safeRedirect !== '/') {
      loginUrl.searchParams.set('next', safeRedirect)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 3. Exchange authorization code for active session and collect session cookies
  const { client: supabase, cookiesToSetLater } = await createServerClientWithCookieCollector()
  const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !session?.user) {
    console.error('[auth/callback] Code exchange error:', exchangeError)
    const loginUrl = new URL('/login', appOrigin)
    loginUrl.searchParams.set(
      'error',
      exchangeError?.message || 'Authentication session could not be established. Please try again.'
    )
    if (safeRedirect !== '/') {
      loginUrl.searchParams.set('next', safeRedirect)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 4. Merge guest shopping bag & wishlist into newly authenticated account
  try {
    const cookieStore = await cookies()
    const guestSessionId =
      cookieStore.get('bb_session_id')?.value ||
      cookieStore.get('bubbleboom_guest_session')?.value

    if (guestSessionId) {
      await Promise.allSettled([
        mergeGuestCartIntoUserCart(session.user.id, guestSessionId),
        mergeGuestWishlistIntoUserWishlist(session.user.id, guestSessionId),
      ])
    }
  } catch (mergeErr) {
    console.warn('[auth/callback] Guest cart/wishlist merge warning:', mergeErr)
  }

  // 5. Construct redirect to final safe destination on the approved app origin
  const finalRedirectUrl = new URL(safeRedirect, appOrigin)
  const response = NextResponse.redirect(finalRedirectUrl)

  // 6. Explicitly persist all Supabase auth session cookies onto the redirect response
  cookiesToSetLater.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  // 7. Persist fast-lookup user session cookie for server components and header
  response.cookies.set('bb_auth_user', JSON.stringify({
    id: session.user.id,
    email: session.user.email,
    user_metadata: session.user.user_metadata || {},
  }), {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  })

  return response
}

