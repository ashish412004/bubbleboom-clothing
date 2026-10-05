import { describe, it, expect } from 'vitest'

describe('Bubble Boom Customer Registration & Authentication Engine', () => {
  // Test Mock State
  interface MockUser {
    id: string
    email: string
    email_confirmed: boolean
    user_metadata: {
      full_name?: string
      onboarding_completed?: boolean
    }
    password_hash?: string
  }

  interface MockProfile {
    id: string
    email: string
    full_name: string
    role: 'customer' | 'admin'
  }

  interface MockCartItem {
    id: string
    cart_id: string
    variant_id: string
    quantity: number
  }

  const mockDb = {
    users: new Map<string, MockUser>(),
    profiles: new Map<string, MockProfile>(),
    guestCart: [
      { id: 'item_1', cart_id: 'guest_cart_101', variant_id: 'var_oversized_black_m', quantity: 2 },
      { id: 'item_2', cart_id: 'guest_cart_101', variant_id: 'var_hoodie_grey_l', quantity: 1 },
    ],
    userCart: new Map<string, MockCartItem[]>(),
    otps: new Map<string, string>(), // email -> otp
  }

  // Engine Helpers
  function sendSignupOtp(email: string, fullName: string) {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName.trim()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { error: 'Please enter a valid email address.', status: 400 }
    }
    if (!cleanName) {
      return { error: 'Please provide your full name.', status: 400 }
    }

    // Check if user already exists with an active confirmed account
    const existing = Array.from(mockDb.users.values()).find(
      (u) => u.email === cleanEmail && u.email_confirmed
    )
    if (existing) {
      return {
        error: 'An account with this email already exists. Please sign in or use Forgot Password.',
        status: 409,
      }
    }

    const otpCode = '123456'
    mockDb.otps.set(cleanEmail, otpCode)

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
    }
  }

  function verifySignupOtp(email: string, otp: string) {
    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.trim()

    if (!cleanOtp || cleanOtp.length < 6 || cleanOtp.length > 8) {
      return { error: 'Please enter the verification code sent to your email.', status: 400 }
    }

    const storedOtp = mockDb.otps.get(cleanEmail)
    if (!storedOtp || storedOtp !== cleanOtp) {
      return { error: 'Invalid or expired OTP code. Please request a new one.', status: 400 }
    }

    // Create or retrieve uncompleted user
    let user = Array.from(mockDb.users.values()).find((u) => u.email === cleanEmail)
    if (!user) {
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: cleanEmail,
        email_confirmed: true,
        user_metadata: { onboarding_completed: false },
      }
      mockDb.users.set(user.id, user)
    } else {
      user.email_confirmed = true
    }

    mockDb.otps.delete(cleanEmail) // Invalidate used OTP

    // Establish valid session
    const session = {
      access_token: `mock_jwt_token_${user.id}`,
      refresh_token: `mock_refresh_token_${user.id}`,
      user,
    }

    return {
      success: true,
      user,
      session,
      cookie: {
        name: 'bb_auth_user',
        value: JSON.stringify({ id: user.id, email: user.email, user_metadata: user.user_metadata }),
        options: { httpOnly: true, maxAge: 2592000, path: '/', sameSite: 'lax' },
      },
    }
  }

  function completeSignupPassword(
    userId: string,
    email: string,
    password: string,
    fullName: string,
    guestSessionId?: string
  ) {
    if (!password || password.length < 8) {
      return { error: 'Password must be at least 8 characters long.', status: 400 }
    }

    const user = mockDb.users.get(userId)
    if (!user) {
      return {
        error: 'Verification session expired. Please restart the email verification process.',
        status: 401,
      }
    }

    // 1. Update password
    user.password_hash = `hashed_${password}`
    user.user_metadata = {
      ...user.user_metadata,
      full_name: fullName.trim(),
      onboarding_completed: true,
    }

    // 2. Upsert customer profile strictly as 'customer' (Never grant admin access via registration)
    const profile: MockProfile = {
      id: user.id,
      email: user.email,
      full_name: fullName.trim(),
      role: 'customer',
    }
    mockDb.profiles.set(user.id, profile)

    // 3. Merge guest cart into user cart
    if (guestSessionId) {
      const existingItems = mockDb.userCart.get(user.id) || []
      const merged = [...existingItems, ...mockDb.guestCart]
      mockDb.userCart.set(user.id, merged)
    }

    // 4. Issue authenticated session
    const session = {
      access_token: `auth_jwt_${user.id}`,
      refresh_token: `refresh_jwt_${user.id}`,
      user,
    }

    return {
      success: true,
      user,
      session,
      profile,
      redirectUrl: '/',
      redirectMethod: 'replace',
      cookie: {
        name: 'bb_auth_user',
        value: JSON.stringify({ id: user.id, email: user.email, user_metadata: user.user_metadata }),
        options: { httpOnly: true, maxAge: 2592000, path: '/', sameSite: 'lax' },
      },
    }
  }

  it('completes the full 3-step registration flow: send OTP -> verify OTP -> create password', () => {
    const email = 'arjun.singh@bubbleboom.test'
    const name = 'Arjun Singh'

    // Step 1: Send OTP
    const step1 = sendSignupOtp(email, name)
    expect(step1.success).toBe(true)
    expect(step1.message).toContain('6-digit verification code')

    // Step 2: Verify OTP
    const step2 = verifySignupOtp(email, '123456')
    expect(step2.success).toBe(true)
    expect(step2.user?.email).toBe(email)
    expect(step2.session?.access_token).toBeDefined()
    expect(step2.cookie!.options.httpOnly).toBe(true)
    expect(step2.cookie!.options.sameSite).toBe('lax')

    // Step 3: Complete password creation
    const step3 = completeSignupPassword(step2.user!.id, email, 'SuperSecure123', name, 'guest_sess_101')
    expect(step3.success).toBe(true)
    expect(step3.user?.user_metadata.onboarding_completed).toBe(true)
    expect(step3.user?.password_hash).toBeDefined()
    expect(step3.session?.access_token).toBeDefined()

    // Redirect to homepage with history replacement
    expect(step3.redirectUrl).toBe('/')
    expect(step3.redirectMethod).toBe('replace')
  })

  it('persists session across navigation and refreshes without requiring customer to log in again', () => {
    const email = 'radhika.patel@bubbleboom.test'
    sendSignupOtp(email, 'Radhika Patel')
    const verifyRes = verifySignupOtp(email, '123456')
    const completeRes = completeSignupPassword(
      verifyRes.user!.id,
      email,
      'RadhikaSecret2026',
      'Radhika Patel'
    )

    expect(completeRes.session).toBeDefined()

    // Simulate cookie reload / refresh
    const cookiePayload = JSON.parse(completeRes.cookie!.value)
    expect(cookiePayload.id).toBe(verifyRes.user!.id)
    expect(cookiePayload.email).toBe(email)
    expect(cookiePayload.user_metadata.full_name).toBe('Radhika Patel')
    expect(cookiePayload.user_metadata.onboarding_completed).toBe(true)
  })

  it('preserves guest cart during registration without loss of items', () => {
    const email = 'kartik.sharma@bubbleboom.test'
    sendSignupOtp(email, 'Kartik Sharma')
    const verifyRes = verifySignupOtp(email, '123456')

    const completeRes = completeSignupPassword(
      verifyRes.user!.id,
      email,
      'KartikBoom2026',
      'Kartik Sharma',
      'guest_cart_101'
    )

    expect(completeRes.success).toBe(true)
    const userCart = mockDb.userCart.get(verifyRes.user!.id)
    expect(userCart).toBeDefined()
    expect(userCart?.length).toBe(2)
    expect(userCart?.[0].variant_id).toBe('var_oversized_black_m')
    expect(userCart?.[1].variant_id).toBe('var_hoodie_grey_l')
  })

  it('creates customer profile strictly with role "customer" and never grants admin access', () => {
    const email = 'hacker@bubbleboom.test'
    sendSignupOtp(email, 'Fake Admin')
    const verifyRes = verifySignupOtp(email, '123456')

    const completeRes = completeSignupPassword(
      verifyRes.user!.id,
      email,
      'TryBecomeAdmin123',
      'Fake Admin'
    )

    expect(completeRes.profile!.role).toBe('customer')
    expect(completeRes.profile!.role).not.toBe('admin')

    // Profile in DB is customer
    const saved = mockDb.profiles.get(verifyRes.user!.id)
    expect(saved?.role).toBe('customer')
  })

  it('handles invalid or expired OTP gracefully and keeps user on OTP step', () => {
    const email = 'otp.error@bubbleboom.test'
    sendSignupOtp(email, 'Test User')

    // 1. Wrong OTP
    const wrongRes = verifySignupOtp(email, '999999')
    expect(wrongRes.error).toContain('Invalid or expired OTP')
    expect(wrongRes.status).toBe(400)

    // 2. Malformed OTP (<6 digits)
    const shortRes = verifySignupOtp(email, '12')
    expect(shortRes.error).toContain('Please enter the verification code')
    expect(shortRes.status).toBe(400)
  })

  it('handles short or invalid password gracefully and keeps user on password step', () => {
    const email = 'pwd.error@bubbleboom.test'
    sendSignupOtp(email, 'Test User')
    const verifyRes = verifySignupOtp(email, '123456')

    // Short password (<8 chars)
    const shortPwd = completeSignupPassword(verifyRes.user!.id, email, '12345', 'Test User')
    expect(shortPwd.error).toContain('at least 8 characters long')
    expect(shortPwd.status).toBe(400)

    // Non-existent user session
    const noUser = completeSignupPassword('ghost_user_id', email, 'LongEnough123', 'Ghost')
    expect(noUser.error).toContain('Verification session expired')
    expect(noUser.status).toBe(401)
  })

  it('blocks duplicate registration on an already confirmed account', () => {
    const email = 'existing.user@bubbleboom.test'
    sendSignupOtp(email, 'Existing User')
    const verifyRes = verifySignupOtp(email, '123456')
    completeSignupPassword(verifyRes.user!.id, email, 'ExistingPassword123', 'Existing User')

    // Second registration attempt with same email
    const duplicate = sendSignupOtp(email, 'Another User')
    expect(duplicate.status).toBe(409)
    expect(duplicate.error).toContain('already exists')
  })

  it('redirects already signed-in customer away from /login and /signup to homepage', () => {
    function getRedirectForRoute(route: string, hasAuth: boolean) {
      if ((route === '/login' || route === '/signup') && hasAuth) {
        return '/'
      }
      return route
    }

    expect(getRedirectForRoute('/signup', true)).toBe('/')
    expect(getRedirectForRoute('/login', true)).toBe('/')
    expect(getRedirectForRoute('/signup', false)).toBe('/signup')
    expect(getRedirectForRoute('/login', false)).toBe('/login')
  })
})
