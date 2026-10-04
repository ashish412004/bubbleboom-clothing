import { createClient as createServerClient } from '@/lib/supabase/server'
import { mergeGuestCartIntoUserCart } from '@/lib/cart'
import { mergeGuestWishlistIntoUserWishlist } from '@/lib/wishlist'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')

  // Validate redirect to prevent open redirect vulnerabilities
  let safeRedirect = '/account'
  if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
    safeRedirect = nextParam
  }

  if (code) {
    const supabase = await createServerClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session?.user) {
      const cookieStore = await cookies()
      const guestSessionId = cookieStore.get('bubbleboom_guest_session')?.value

      if (guestSessionId) {
        // Automatically merge guest cart & wishlist into authenticated user
        await Promise.allSettled([
          mergeGuestCartIntoUserCart(session.user.id, guestSessionId),
          mergeGuestWishlistIntoUserWishlist(session.user.id, guestSessionId),
        ])
      }
    }
  }

  return NextResponse.redirect(new URL(safeRedirect, requestUrl.origin))
}
