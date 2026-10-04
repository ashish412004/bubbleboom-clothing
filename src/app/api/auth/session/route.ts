import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'

export async function GET() {
  const cookieStore = await cookies()
  const rawAuth = cookieStore.get('bb_auth_user')?.value

  if (rawAuth) {
    try {
      const user = JSON.parse(rawAuth)
      return NextResponse.json({ user })
    } catch {
      // invalid cookie
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        return NextResponse.json({ user })
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ user: null })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, full_name } = body
    const cookieStore = await cookies()

    if (action === 'logout') {
      const response = NextResponse.json({ success: true })
      response.cookies.delete('bb_auth_user')

      if (isSupabaseConfigured()) {
        try {
          const supabase = await createServerClient()
          await supabase.auth.signOut()
        } catch {
          // ignore
        }
      }

      return response
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    // If live Supabase is configured, use official Supabase Auth
    if (isSupabaseConfigured()) {
      const supabase = await createServerClient()
      if (action === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: full_name || email.split('@')[0] },
          },
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ success: true, user: data.user })
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ success: true, user: data.user })
      }
    }

    // Local / Offline / Dev Mode User Authentication
    const normalizedEmail = email.trim().toLowerCase()
    const displayName = full_name?.trim() || normalizedEmail.split('@')[0]
    const userId = `usr_${Buffer.from(normalizedEmail).toString('hex').slice(0, 12)}`

    const user = {
      id: userId,
      email: normalizedEmail,
      user_metadata: {
        full_name: displayName,
      },
      created_at: new Date().toISOString(),
    }

    const response = NextResponse.json({ success: true, user })
    response.cookies.set('bb_auth_user', JSON.stringify(user), {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 })
  }
}
