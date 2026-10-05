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
    const { action, email, password, full_name, identifier, otp, phone } = body
    const cookieStore = await cookies()

    // 1. LOGOUT
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

    // 2. SEND OTP (Email or Phone)
    if (action === 'send-otp') {
      const target = (identifier || email || phone || '').trim()
      if (!target) {
        return NextResponse.json({ error: 'Please enter a valid Gmail address or mobile number.' }, { status: 400 })
      }

      const isEmail = target.includes('@')

      if (isSupabaseConfigured()) {
        const supabase = await createServerClient()
        if (isEmail) {
          const { error } = await supabase.auth.signInWithOtp({
            email: target.toLowerCase(),
            options: {
              shouldCreateUser: true,
            },
          })
          if (error) {
            console.error('Supabase OTP send error:', error.message)
            if (process.env.NODE_ENV !== 'production') {
              return NextResponse.json({
                success: true,
                type: 'email',
                message: `Supabase mailer error (${error.message}). Dev Mode active: Enter OTP "123456" to verify and continue!`,
              })
            }
            return NextResponse.json({
              error: `Email sending failed (${error.message}). Please ensure SMTP is configured in Supabase or switch to "Password" tab.`,
            }, { status: 400 })
          }
          return NextResponse.json({
            success: true,
            type: 'email',
            message: `OTP has been sent to ${target}. Please check your inbox / spam folder.`,
          })
        } else {
          // Phone number: ensure +91 prefix for India
          const cleanPhone = target.replace(/\D/g, '')
          const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : (cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+${cleanPhone}`)

          const { error } = await supabase.auth.signInWithOtp({
            phone: formattedPhone,
            options: {
              shouldCreateUser: true,
            },
          })
          if (error) {
            if (error.message.includes('phone provider') || error.message.includes('Unsupported')) {
              return NextResponse.json({
                error: 'SMS service is not activated on Supabase yet. Please use your Email / Gmail address for instant OTP verification.',
              }, { status: 400 })
            }
            return NextResponse.json({ error: error.message }, { status: 400 })
          }
          return NextResponse.json({
            success: true,
            type: 'phone',
            message: `OTP sent to ${formattedPhone}`,
          })
        }
      } else {
        // Dev fallback mode
        return NextResponse.json({
          success: true,
          type: isEmail ? 'email' : 'phone',
          message: 'Development Mode: Use OTP "123456" to verify.',
        })
      }
    }

    // 3. VERIFY OTP
    if (action === 'verify-otp') {
      const target = (identifier || email || phone || '').trim()
      const token = (otp || '').trim()

      if (!target || !token) {
        return NextResponse.json({ error: 'Please provide both the email/phone and the 6-digit OTP code.' }, { status: 400 })
      }

      const isEmail = target.includes('@')

      if (isSupabaseConfigured()) {
        const supabase = await createServerClient()
        let result: any = null

        if (isEmail) {
          result = await supabase.auth.verifyOtp({
            email: target.toLowerCase(),
            token,
            type: 'email',
          })
        } else {
          const cleanPhone = target.replace(/\D/g, '')
          const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : (cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+${cleanPhone}`)
          result = await supabase.auth.verifyOtp({
            phone: formattedPhone,
            token,
            type: 'sms',
          })
        }

        if (result.error) {
          if (process.env.NODE_ENV !== 'production' && token === '123456') {
            const fallbackUser = {
              id: `usr_${Buffer.from(target).toString('hex').slice(0, 12)}`,
              email: target.toLowerCase(),
              user_metadata: { full_name: target.split('@')[0] },
            }
            const response = NextResponse.json({ success: true, user: fallbackUser })
            response.cookies.set('bb_auth_user', JSON.stringify(fallbackUser), {
              path: '/',
              httpOnly: true,
              maxAge: 60 * 60 * 24 * 30,
              sameSite: 'lax',
            })
            return response
          }
          return NextResponse.json({ error: result.error.message || 'Invalid or expired OTP code.' }, { status: 400 })
        }

        const user = result.data.user
        const response = NextResponse.json({ success: true, user })
        if (user) {
          response.cookies.set('bb_auth_user', JSON.stringify({
            id: user.id,
            email: user.email,
            phone: user.phone,
            user_metadata: user.user_metadata || {},
          }), {
            path: '/',
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
          })
        }
        return response
      } else {
        // Dev fallback mode
        if (token !== '123456') {
          return NextResponse.json({ error: 'Invalid OTP code. In dev mode use 123456' }, { status: 400 })
        }
        const user = {
          id: `usr_otp_${Date.now()}`,
          email: isEmail ? target : `${target}@phone.user`,
          user_metadata: { full_name: full_name || 'Bubble Boom Member' },
          created_at: new Date().toISOString(),
        }
        const response = NextResponse.json({ success: true, user })
        response.cookies.set('bb_auth_user', JSON.stringify(user), {
          path: '/',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30,
          sameSite: 'lax',
        })
        return response
      }
    }

    // 4. PASSWORD LOGIN / SIGNUP
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    if (isSupabaseConfigured()) {
      const supabase = await createServerClient()
      if (action === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase(),
          password,
          options: {
            data: { full_name: full_name || email.split('@')[0] },
          },
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        const response = NextResponse.json({ success: true, user: data.user })
        if (data.user) {
          response.cookies.set('bb_auth_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata,
          }), {
            path: '/',
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 30,
            sameSite: 'lax',
          })
        }
        return response
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        const response = NextResponse.json({ success: true, user: data.user })
        if (data.user) {
          response.cookies.set('bb_auth_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata,
          }), {
            path: '/',
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 30,
            sameSite: 'lax',
          })
        }
        return response
      }
    }

    // Offline / Dev Fallback
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
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 })
  }
}
