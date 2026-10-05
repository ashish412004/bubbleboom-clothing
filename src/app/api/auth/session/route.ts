import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatOtpError(error: any): { error: string; status: number } {
  const msg = error?.message || 'Authentication error'
  if (msg.toLowerCase().includes('error sending magic link') || msg.toLowerCase().includes('error sending')) {
    return {
      error: 'Email delivery failed: Custom SMTP is required in Supabase Dashboard (Authentication -> Email -> SMTP Settings) to deliver real verification emails.',
      status: 502,
    }
  }
  return { error: msg, status: error?.status || 400 }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ user: null })
  }

  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ user: null })
    }
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, full_name, otp } = body
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase is not configured. Please verify environment credentials.' },
        { status: 503 }
      )
    }

    const supabase = await createServerClient()
    const serviceClient = await createServiceClient()

    // 2. SEND SIGNUP OTP
    if (action === 'send-signup-otp') {
      const cleanEmail = (email || '').trim().toLowerCase()
      const cleanName = (full_name || '').trim()

      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      }

      if (!cleanName) {
        return NextResponse.json({ error: 'Please provide your full name.' }, { status: 400 })
      }

      // Check if user already exists with an established account
      try {
        const { data: { users } } = await serviceClient.auth.admin.listUsers()
        const existingUser = users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail && u.email_confirmed_at
        )

        if (existingUser) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please sign in or use Forgot Password.' },
            { status: 409 }
          )
        }
      } catch (checkErr) {
        // Continue if admin list fails
      }

      // Send real email OTP via Supabase Auth
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: cleanName,
            onboarding_completed: false,
          },
        },
      })

      if (otpError) {
        const formatted = formatOtpError(otpError)
        return NextResponse.json({ error: formatted.error }, { status: formatted.status })
      }

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
      })
    }

    // 3. VERIFY SIGNUP OTP
    if (action === 'verify-signup-otp') {
      const cleanEmail = (email || '').trim().toLowerCase()
      const cleanOtp = (otp || '').trim()

      if (!cleanEmail || !cleanOtp || cleanOtp.length < 6 || cleanOtp.length > 8) {
        return NextResponse.json({ error: 'Please enter the verification code sent to your email.' }, { status: 400 })
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'email',
      })

      if (verifyError || !data.user) {
        return NextResponse.json(
          { error: verifyError?.message || 'Invalid or expired OTP code. Please request a new one.' },
          { status: 400 }
        )
      }

      const response = NextResponse.json({ success: true, user: data.user, session: data.session })
      response.cookies.set('bb_auth_user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata || {},
      }), {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      })

      return response
    }

    // 4. COMPLETE SIGNUP PASSWORD
    if (action === 'complete-signup-password') {
      const cleanPassword = (password || '').trim()
      const cleanName = (full_name || '').trim()

      if (!cleanPassword || cleanPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 })
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Session expired. Please restart the verification process.' },
          { status: 401 }
        )
      }

      const finalName = cleanName || user.user_metadata?.full_name || 'Member'

      // Update password and complete onboarding flag in Supabase Auth
      const { data: updated, error: updateError } = await supabase.auth.updateUser({
        password: cleanPassword,
        data: {
          full_name: finalName,
          onboarding_completed: true,
        },
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      // Upsert profile securely with role 'customer'
      try {
        await serviceClient.from('profiles').upsert({
          id: user.id,
          email: user.email || '',
          full_name: finalName,
          role: 'customer',
        })
      } catch (profErr) {
        console.error('Profile upsert warning:', profErr)
      }

      const response = NextResponse.json({ success: true, user: updated.user })
      response.cookies.set('bb_auth_user', JSON.stringify({
        id: user.id,
        email: user.email,
        user_metadata: {
          ...user.user_metadata,
          full_name: finalName,
          onboarding_completed: true,
        },
      }), {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      })

      return response
    }

    // 5. SEND LOGIN OTP (email only, no automatic account creation)
    if (action === 'send-login-otp') {
      const cleanEmail = (email || '').trim().toLowerCase()

      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false, // Strict: disable automatic account creation during login
        },
      })

      if (otpError) {
        if (
          otpError.message.toLowerCase().includes('not allowed') ||
          otpError.status === 422 ||
          (otpError as any).code === 'otp_disabled'
        ) {
          return NextResponse.json(
            { error: 'No account found with this email. Please create an account first.' },
            { status: 404 }
          )
        }
        const formatted = formatOtpError(otpError)
        return NextResponse.json({ error: formatted.error }, { status: formatted.status })
      }

      return NextResponse.json({
        success: true,
        message: `A 6-digit login code has been sent to ${cleanEmail}. Please check your inbox.`,
      })
    }

    // 6. VERIFY LOGIN OTP
    if (action === 'verify-login-otp') {
      const cleanEmail = (email || '').trim().toLowerCase()
      const cleanOtp = (otp || '').trim()

      if (!cleanEmail || !cleanOtp || cleanOtp.length < 6 || cleanOtp.length > 8) {
        return NextResponse.json({ error: 'Please enter the verification code sent to your email.' }, { status: 400 })
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'email',
      })

      if (verifyError || !data.user) {
        return NextResponse.json(
          { error: verifyError?.message || 'Invalid or expired OTP code.' },
          { status: 400 }
        )
      }

      const response = NextResponse.json({ success: true, user: data.user, session: data.session })
      response.cookies.set('bb_auth_user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata || {},
      }), {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      })

      return response
    }

    // 7. LOGIN WITH PASSWORD
    if (action === 'login' || action === 'login-password') {
      const cleanEmail = (email || '').trim().toLowerCase()
      const cleanPassword = (password || '').trim()

      if (!cleanEmail || !cleanPassword) {
        return NextResponse.json({ error: 'Please enter both your email and password.' }, { status: 400 })
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      })

      if (authError || !data.user) {
        return NextResponse.json({ error: 'Invalid email address or password.' }, { status: 401 })
      }

      const response = NextResponse.json({ success: true, user: data.user, session: data.session })
      response.cookies.set('bb_auth_user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata || {},
      }), {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      })

      return response
    }

    // 8. SEND FORGOT PASSWORD OTP
    if (action === 'send-forgot-password-otp') {
      const cleanEmail = (email || '').trim().toLowerCase()

      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false,
        },
      })

      if (otpError) {
        if (
          otpError.message.toLowerCase().includes('not allowed') ||
          otpError.status === 422 ||
          (otpError as any).code === 'otp_disabled'
        ) {
          return NextResponse.json(
            { error: 'No account registered with this email address.' },
            { status: 404 }
          )
        }
        const formatted = formatOtpError(otpError)
        return NextResponse.json({ error: formatted.error }, { status: formatted.status })
      }

      return NextResponse.json({
        success: true,
        message: `A 6-digit recovery code has been sent to ${cleanEmail}. Please check your inbox.`,
      })
    }

    // 9. VERIFY FORGOT PASSWORD OTP
    if (action === 'verify-forgot-password-otp') {
      const cleanEmail = (email || '').trim().toLowerCase()
      const cleanOtp = (otp || '').trim()

      if (!cleanEmail || !cleanOtp || cleanOtp.length < 6 || cleanOtp.length > 8) {
        return NextResponse.json({ error: 'Please enter the verification code.' }, { status: 400 })
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'email',
      })

      if (verifyError || !data.user) {
        return NextResponse.json(
          { error: verifyError?.message || 'Invalid or expired OTP code.' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, verified: true })
    }

    // 10. RESET PASSWORD (using active OTP-verified session)
    if (action === 'reset-password') {
      const cleanPassword = (password || '').trim()

      if (!cleanPassword || cleanPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 })
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Verification session expired. Please request a new recovery code.' },
          { status: 401 }
        )
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: cleanPassword,
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully. Please sign in with your new password.',
      })
    }

    return NextResponse.json({ error: 'Unknown authentication action requested.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 })
  }
}
