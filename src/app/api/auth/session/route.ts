import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  createServerClient,
  createServerClientWithCookieCollector,
  createServiceClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'
import { mergeGuestCartIntoUserCart } from '@/lib/cart'
import { mergeGuestWishlistIntoUserWishlist } from '@/lib/wishlist'

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
  const cookieStore = await cookies()

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user) {
        return NextResponse.json({ user })
      }
    } catch {
      // fallback to cookie
    }
  }

  const rawAuth = cookieStore.get('bb_auth_user')?.value
  if (rawAuth) {
    try {
      const user = JSON.parse(rawAuth)
      return NextResponse.json({ user })
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ user: null })
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
          const { client: supabase, cookiesToSetLater } = await createServerClientWithCookieCollector()
          await supabase.auth.signOut()
          cookiesToSetLater.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
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

    const { client: supabase, cookiesToSetLater } = await createServerClientWithCookieCollector()
    const serviceClient = await createServiceClient()

    const applySupabaseCookies = (res: NextResponse) => {
      cookiesToSetLater.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options)
      })
    }

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

      const response = NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
      })
      applySupabaseCookies(response)
      return response
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
      applySupabaseCookies(response)

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
      const cleanEmail = (email || '').trim().toLowerCase()

      if (!cleanPassword || cleanPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 })
      }

      // Step 4.1: Resolve authenticated user from session, cookie, or email lookup
      let user = (await supabase.auth.getUser()).data.user
      if (!user) {
        const rawAuth = cookieStore.get('bb_auth_user')?.value
        if (rawAuth) {
          try {
            const parsed = JSON.parse(rawAuth)
            if (parsed.id) {
              const { data: adminUser } = await serviceClient.auth.admin.getUserById(parsed.id)
              user = adminUser?.user || null
            }
          } catch {
            // ignore
          }
        }
      }

      if (!user && cleanEmail) {
        try {
          const { data: { users } } = await serviceClient.auth.admin.listUsers()
          user = users?.find((u) => u.email?.toLowerCase() === cleanEmail) || null
        } catch {
          // ignore
        }
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Verification session expired. Please restart the email verification process.' },
          { status: 401 }
        )
      }

      const finalName = cleanName || user.user_metadata?.full_name || 'Member'

      // Step 4.2: Update password and metadata securely via Supabase Admin API
      const { data: updatedAdmin, error: updateError } = await serviceClient.auth.admin.updateUserById(
        user.id,
        {
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            ...(user.user_metadata || {}),
            full_name: finalName,
            onboarding_completed: true,
          },
        }
      )

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      let activeUser = updatedAdmin.user
      let activeSession = null

      // Step 4.3: Establish/refresh valid Supabase session
      const userEmail = user.email || cleanEmail
      if (userEmail) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: cleanPassword,
        })
        if (signInData?.session) {
          activeSession = signInData.session
          activeUser = signInData.user
        }
      }

      // Step 4.4: Upsert profile securely with role 'customer' (Never grant admin access via registration)
      try {
        await serviceClient.from('profiles').upsert({
          id: user.id,
          email: userEmail || '',
          full_name: finalName,
          role: 'customer',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      } catch (profErr) {
        console.error('Profile upsert warning:', profErr)
      }

      // Step 4.5: Merge guest cart and guest wishlist into user's account
      const guestSessionId =
        cookieStore.get('bb_session_id')?.value ||
        cookieStore.get('bubbleboom_guest_session')?.value

      if (guestSessionId && user.id) {
        try {
          await Promise.allSettled([
            mergeGuestCartIntoUserCart(user.id, guestSessionId),
            mergeGuestWishlistIntoUserWishlist(user.id, guestSessionId),
          ])
        } catch (mergeErr) {
          console.warn('Guest cart/wishlist merge warning:', mergeErr)
        }
      }

      const response = NextResponse.json({
        success: true,
        user: activeUser,
        session: activeSession,
      })
      applySupabaseCookies(response)

      response.cookies.set('bb_auth_user', JSON.stringify({
        id: user.id,
        email: userEmail,
        user_metadata: {
          ...(activeUser?.user_metadata || user.user_metadata || {}),
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

      const response = NextResponse.json({
        success: true,
        message: `A 6-digit login code has been sent to ${cleanEmail}. Please check your inbox.`,
      })
      applySupabaseCookies(response)
      return response
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

      // Merge guest cart & wishlist
      const guestSessionId =
        cookieStore.get('bb_session_id')?.value ||
        cookieStore.get('bubbleboom_guest_session')?.value

      if (guestSessionId && data.user.id) {
        try {
          await Promise.allSettled([
            mergeGuestCartIntoUserCart(data.user.id, guestSessionId),
            mergeGuestWishlistIntoUserWishlist(data.user.id, guestSessionId),
          ])
        } catch {}
      }

      const response = NextResponse.json({ success: true, user: data.user, session: data.session })
      applySupabaseCookies(response)

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

      // Merge guest cart & wishlist
      const guestSessionId =
        cookieStore.get('bb_session_id')?.value ||
        cookieStore.get('bubbleboom_guest_session')?.value

      if (guestSessionId && data.user.id) {
        try {
          await Promise.allSettled([
            mergeGuestCartIntoUserCart(data.user.id, guestSessionId),
            mergeGuestWishlistIntoUserWishlist(data.user.id, guestSessionId),
          ])
        } catch {}
      }

      const response = NextResponse.json({ success: true, user: data.user, session: data.session })
      applySupabaseCookies(response)

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

      const response = NextResponse.json({
        success: true,
        message: `A 6-digit recovery code has been sent to ${cleanEmail}. Please check your inbox.`,
      })
      applySupabaseCookies(response)
      return response
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

      const response = NextResponse.json({ success: true, verified: true })
      applySupabaseCookies(response)
      return response
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

      const response = NextResponse.json({
        success: true,
        message: 'Password updated successfully. Please sign in with your new password.',
      })
      applySupabaseCookies(response)
      return response
    }

    return NextResponse.json({ error: 'Unknown authentication action requested.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 })
  }
}
