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
