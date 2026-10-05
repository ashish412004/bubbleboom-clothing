import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
    // If Supabase not configured, still check bb_auth_user cookie for redirects
    const hasAuthCookie = Boolean(request.cookies.get('bb_auth_user')?.value)
    if (
      (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') &&
      hasAuthCookie
    ) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hasAuth = Boolean(user || request.cookies.get('bb_auth_user')?.value)

  // Redirect already signed-in customer away from /login and /signup to homepage
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup'
  ) {
    if (hasAuth) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // In local dev mode, allow easy admin preview
    if (process.env.NODE_ENV !== 'production') {
      return response
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login?next=/admin', request.url))
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdminUser = profile?.role === 'admin' || (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL)

    if (!isAdminUser) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect account routes
  if (request.nextUrl.pathname.startsWith('/account')) {
    if (!hasAuth) {
      return NextResponse.redirect(new URL('/login?next=/account', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/login', '/signup'],
}
