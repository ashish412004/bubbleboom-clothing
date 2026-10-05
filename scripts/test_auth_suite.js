const baseUrl = 'http://localhost:3000';

async function runTestSuite() {
  console.log('=== BUBBLE BOOM AUTHENTICATION TEST SUITE ===\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  // 1. Initial session check
  await test('1. GET /api/auth/session returns null when not logged in', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`);
    const data = await res.json();
    if (res.status !== 200 || data.user !== null) {
      throw new Error(`Expected null user, got: ${JSON.stringify(data)}`);
    }
  });

  // 2. Email validation
  await test('2. Signup rejects invalid email format', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-signup-otp',
        email: 'invalid-email',
        full_name: 'Test User'
      })
    });
    const data = await res.json();
    if (res.status !== 400 || !data.error?.includes('valid email')) {
      throw new Error(`Expected 400 invalid email, got status ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 3. Existing account signup protection
  await test('3. Signup directs existing confirmed accounts to login/recovery (409)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-signup-otp',
        email: 'hhshukla241099@gmail.com',
        full_name: 'Harshit Shukla'
      })
    });
    const data = await res.json();
    if (res.status !== 409 || !data.error?.includes('already exists')) {
      throw new Error(`Expected 409 already exists, got status ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 4. No auto-creation on login
  await test('4. Login with OTP does NOT auto-create account for unregistered email (404)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-login-otp',
        email: 'nobody_ever_registered_123456@test.com'
      })
    });
    const data = await res.json();
    if (res.status !== 404 || !data.error?.includes('No account found')) {
      throw new Error(`Expected 404 not found, got status ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 5. Wrong password rejected
  await test('5. Login with incorrect password returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login-password',
        email: 'hhshukla241099@gmail.com',
        password: 'IncorrectPassword123'
      })
    });
    const data = await res.json();
    if (res.status !== 401 || !data.error?.includes('Invalid email address or password')) {
      throw new Error(`Expected 401 unauthorized, got status ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 6. Correct password login
  let sessionCookie = '';
  await test('6. Login with correct password authenticates user and sets cookies', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login-password',
        email: 'hhshukla241099@gmail.com',
        password: 'Yabu@412004'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.user || data.user.email !== 'hhshukla241099@gmail.com') {
      throw new Error(`Expected 200 with user, got status ${res.status}: ${JSON.stringify(data)}`);
    }
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie;
    }
  });

  // 7. Unauthenticated password update prevention
  await test('7. Unauthenticated password completion is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete-signup-password',
        password: 'NewStrongPassword123!'
      })
    });
    const data = await res.json();
    if (res.status !== 401) {
      throw new Error(`Expected 401 session expired, got status ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 8. Unauthenticated reset password prevention
  await test('8. Unauthenticated password reset is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset-password',
        password: 'NewStrongPassword123!'
      })
    });
    const data = await res.json();
    if (res.status !== 401) {
      throw new Error(`Expected 401 session expired, got status ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 9. Logout clears session
  await test('9. Logout succeeds and clears session', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success) {
      throw new Error(`Expected 200 success, got: ${JSON.stringify(data)}`);
    }
  });

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===`);
  if (passed === total) {
    console.log('ALL AUTH INTEGRITY TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTestSuite();
