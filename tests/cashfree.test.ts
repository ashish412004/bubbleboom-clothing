import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import { verifyCashfreeWebhook } from '@/lib/payments/cashfree'

describe('Cashfree Webhook Signature Verification & Timing Attack Prevention', () => {
  const secretKey = 'test_secret_key_1234567890'
  const rawBody = JSON.stringify({
    data: {
      order: { order_id: 'BB-20261004-9999', order_amount: 1499.0 },
      payment: { payment_status: 'SUCCESS', cf_payment_id: '12345' },
    },
    event_time: '2026-10-04T12:00:00Z',
    type: 'PAYMENT_SUCCESS_WEBHOOK',
  })
  const timestamp = '1728043200'

  beforeEach(() => {
    process.env.CASHFREE_SECRET_KEY = secretKey
  })

  afterEach(() => {
    delete process.env.CASHFREE_SECRET_KEY
  })

  it('successfully verifies genuine signature generated with Cashfree secret key (Hex)', async () => {
    const validSignatureHex = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('hex')

    const isValid = await verifyCashfreeWebhook(rawBody, validSignatureHex, timestamp)
    expect(isValid).toBe(true)
  })

  it('successfully verifies genuine signature in Base64 encoding', async () => {
    const validSignatureB64 = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('base64')

    const isValid = await verifyCashfreeWebhook(rawBody, validSignatureB64, timestamp)
    expect(isValid).toBe(true)
  })

  it('strictly rejects webhook when request body has been tampered with', async () => {
    const validSignature = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('hex')

    // Tampered body with altered payment amount
    const tamperedBody = JSON.stringify({
      data: {
        order: { order_id: 'BB-20261004-9999', order_amount: 1.0 }, // Malicious reduction
        payment: { payment_status: 'SUCCESS', cf_payment_id: '12345' },
      },
      event_time: '2026-10-04T12:00:00Z',
      type: 'PAYMENT_SUCCESS_WEBHOOK',
    })

    const isValid = await verifyCashfreeWebhook(tamperedBody, validSignature, timestamp)
    expect(isValid).toBe(false)
  })

  it('strictly rejects webhook when timestamp has been altered or replayed', async () => {
    const validSignature = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('hex')

    const replayedTimestamp = '1728043999'

    const isValid = await verifyCashfreeWebhook(rawBody, validSignature, replayedTimestamp)
    expect(isValid).toBe(false)
  })

  it('handles arbitrary length malicious signatures without throwing timingSafeEqual length error', async () => {
    // In node: crypto.timingSafeEqual throws if buffer lengths differ.
    // Our implementation guards lengths and returns false safely.
    const resShort = await verifyCashfreeWebhook(rawBody, 'short_sig', timestamp)
    expect(resShort).toBe(false)

    const resLong = await verifyCashfreeWebhook(
      rawBody,
      'extremely_long_bogus_signature_that_exceeds_64_bytes_by_far_to_test_buffer_length_boundary_overflow',
      timestamp
    )
    expect(resLong).toBe(false)
  })
})

describe('Cashfree Configuration & Credential Sanitization', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('strips surrounding quotes and whitespace from environment variables', async () => {
    const { getCashfreeConfig } = await import('@/lib/payments/cashfree')
    process.env.CASHFREE_APP_ID = '  "APP_MOCK_TEST_ID_12345"  '
    process.env.CASHFREE_SECRET_KEY = "  'cfsk_ma_prod_MOCK_TEST_SECRET_ABC_123'  "
    process.env.NEXT_PUBLIC_CASHFREE_MODE = '  production  '

    const config = getCashfreeConfig()
    expect(config.appId).toBe('APP_MOCK_TEST_ID_12345')
    expect(config.secretKey).toBe('cfsk_ma_prod_MOCK_TEST_SECRET_ABC_123')
    expect(config.isProduction).toBe(true)
    expect(config.apiBaseUrl).toBe('https://api.cashfree.com/pg')
  })

  it('detects swapped CASHFREE_APP_ID and CASHFREE_SECRET_KEY and auto-recovers', async () => {
    const { getCashfreeConfig } = await import('@/lib/payments/cashfree')
    process.env.CASHFREE_APP_ID = 'cfsk_ma_prod_MOCK_TEST_SECRET_ABC_123' // Swapped!
    process.env.CASHFREE_SECRET_KEY = 'APP_MOCK_TEST_ID_12345'

    const config = getCashfreeConfig()
    expect(config.appId).toBe('APP_MOCK_TEST_ID_12345')
    expect(config.secretKey).toBe('cfsk_ma_prod_MOCK_TEST_SECRET_ABC_123')
  })

  it('prevents sending production keys to sandbox endpoint even if sandbox URL is configured', async () => {
    const { getCashfreeConfig } = await import('@/lib/payments/cashfree')
    process.env.CASHFREE_APP_ID = 'APP_MOCK_TEST_ID_12345'
    process.env.CASHFREE_SECRET_KEY = 'cfsk_ma_prod_MOCK_TEST_SECRET_ABC_123'
    process.env.CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg' // Mistakenly sandbox

    const config = getCashfreeConfig()
    expect(config.isProduction).toBe(true)
    expect(config.apiBaseUrl).toBe('https://api.cashfree.com/pg')
  })

  it('fails fast when credentials contain unconfigured placeholder values', async () => {
    const { createCashfreeOrder } = await import('@/lib/payments/cashfree')
    process.env.CASHFREE_APP_ID = 'your_cashfree_app_id'
    process.env.CASHFREE_SECRET_KEY = 'your_cashfree_secret_key'

    const res = await createCashfreeOrder({
      order_id: 'BB-TEST-001',
      order_amount: 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: 'c1',
        customer_name: 'Test',
        customer_email: 'test@example.com',
        customer_phone: '9876543210',
      },
      order_meta: {
        return_url: 'http://localhost/return',
        notify_url: 'http://localhost/notify',
      },
    })

    expect('error' in res).toBe(true)
    if ('error' in res) {
      expect(res.error).toContain('placeholder')
    }
  })
})
