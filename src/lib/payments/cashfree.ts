import crypto from 'crypto'

export interface CashfreeOrderRequest {
  order_id: string
  order_amount: number
  order_currency: string
  customer_details: {
    customer_id: string
    customer_name: string
    customer_email: string
    customer_phone: string
  }
  order_meta: {
    return_url: string
    notify_url: string
  }
}

export interface CashfreePaymentResponse {
  order_id: string
  payment_session_id: string
  cf_order_id: string
  order_token?: string
}

function cleanEnvValue(val?: string): string {
  if (!val) return ''
  let cleaned = val.trim()
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned
}

export function getCashfreeConfig() {
  let appId = cleanEnvValue(process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID)
  let secretKey = cleanEnvValue(process.env.CASHFREE_SECRET_KEY)

  // Guard against accidental swapped keys in environment variables
  if (appId.startsWith('cfsk_') && !secretKey.startsWith('cfsk_')) {
    console.warn('CASHFREE_APP_ID and CASHFREE_SECRET_KEY were swapped in environment configuration. Auto-recovering.')
    const temp = appId
    appId = secretKey
    secretKey = temp
  }

  // Detect whether keys are explicitly production keys
  const isKeyProd =
    secretKey.includes('_prod_') ||
    (!secretKey.includes('_test_') && !appId.toLowerCase().startsWith('test_') && appId.length > 0)

  const envVal = cleanEnvValue(
    process.env.NEXT_PUBLIC_CASHFREE_MODE ||
    process.env.CASHFREE_ENVIRONMENT
  ).toLowerCase()

  const isExplicitSandbox = envVal === 'sandbox'

  // If explicit sandbox is requested AND key is NOT a production key, use sandbox; otherwise default to production
  const isProduction =
    isExplicitSandbox && !secretKey.includes('_prod_')
      ? false
      : Boolean(isKeyProd || envVal === 'production' || true)

  let apiBaseUrl = cleanEnvValue(process.env.CASHFREE_API_URL)
  if (apiBaseUrl) {
    if (isProduction && apiBaseUrl.includes('sandbox.cashfree.com')) {
      console.warn('Overriding sandbox CASHFREE_API_URL to production endpoint because production credentials are in use.')
      apiBaseUrl = 'https://api.cashfree.com/pg'
    } else if (!isProduction && apiBaseUrl.includes('api.cashfree.com') && !apiBaseUrl.includes('sandbox')) {
      apiBaseUrl = 'https://sandbox.cashfree.com/pg'
    }
  } else {
    apiBaseUrl = isProduction ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
  }

  const mode: 'production' | 'sandbox' = isProduction ? 'production' : 'sandbox'
  return { appId, secretKey, isProduction, apiBaseUrl, mode }
}

export async function createCashfreeOrder(
  orderRequest: CashfreeOrderRequest
): Promise<CashfreePaymentResponse | { error: string }> {
  const { appId, secretKey, apiBaseUrl, mode } = getCashfreeConfig()

  if (!appId || !secretKey) {
    return {
      error:
        'Cashfree credentials not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in server environment variables.',
    }
  }

  if (
    appId.includes('your_') ||
    secretKey.includes('your_') ||
    appId === 'TEST_your_app_id' ||
    secretKey === 'TEST_your_secret_key'
  ) {
    return {
      error:
        'Cashfree credentials contain unconfigured placeholder values. Please provide your real Cashfree Merchant credentials.',
    }
  }

  try {
    const response = await fetch(`${apiBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify(orderRequest),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`Cashfree order creation error [HTTP ${response.status}]:`, data)
      if (response.status === 401) {
        return {
          error: `Authentication failed [HTTP 401]: Cashfree rejected the provided credentials on ${apiBaseUrl}. Ensure your CASHFREE_APP_ID and CASHFREE_SECRET_KEY on Vercel match the ${mode} environment.`,
        }
      }
      return {
        error: `${data.message || 'Failed to create Cashfree order'}${data.code ? ` (${data.code})` : ''}`,
      }
    }

    return {
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      cf_order_id: data.order_id,
      order_token: data.order_token,
    }
  } catch (error: any) {
    console.error('Cashfree API error:', error)
    return { error: error.message || 'Failed to connect to Cashfree' }
  }
}

/**
 * Verify Cashfree webhook signature using raw body and timestamp header.
 * Uses constant-time safe comparison and handles both hex and base64 formats.
 */
export async function verifyCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  const secretKey = process.env.CASHFREE_SECRET_KEY
  if (!secretKey || !signature || !timestamp) {
    return false
  }

  try {
    // Official Cashfree PG 2023-08-01 signature is HMAC-SHA256 of (timestamp + rawBody)
    const expectedHex = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('hex')

    const expectedBase64 = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('base64')

    const sigBuf = Buffer.from(signature)
    const hexBuf = Buffer.from(expectedHex)
    const b64Buf = Buffer.from(expectedBase64)

    if (sigBuf.length === hexBuf.length && crypto.timingSafeEqual(sigBuf, hexBuf)) {
      return true
    }
    if (sigBuf.length === b64Buf.length && crypto.timingSafeEqual(sigBuf, b64Buf)) {
      return true
    }

    // Also support fallback order of rawBody + timestamp if client configured legacy
    const fallbackHex = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody + timestamp)
      .digest('hex')

    const fbBuf = Buffer.from(fallbackHex)
    if (sigBuf.length === fbBuf.length && crypto.timingSafeEqual(sigBuf, fbBuf)) {
      return true
    }

    return false
  } catch (error) {
    console.error('Webhook signature verification error:', error)
    return false
  }
}

/**
 * Fetch verified authoritative payment status from Cashfree
 */
export async function getPaymentStatus(orderId: string) {
  const { appId, secretKey, apiBaseUrl } = getCashfreeConfig()

  if (!appId || !secretKey) {
    return { error: 'Cashfree credentials not configured' }
  }

  try {
    const response = await fetch(`${apiBaseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      cache: 'no-store',
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Cashfree order status error:', data)
      return { error: data.message || 'Failed to fetch order status' }
    }

    return {
      order_id: data.order_id,
      order_amount: data.order_amount,
      order_currency: data.order_currency,
      order_status: data.order_status,
      payment_session_id: data.payment_session_id,
      data,
    }
  } catch (error: any) {
    console.error('Cashfree API error:', error)
    return { error: error.message || 'Failed to connect to Cashfree' }
  }
}

/**
 * Fetch detailed payment attempts for a Cashfree order (returns cf_payment_id, payment methods, etc.)
 */
export async function getOrderPayments(orderId: string) {
  const { appId, secretKey, apiBaseUrl } = getCashfreeConfig()

  if (!appId || !secretKey) {
    return { error: 'Cashfree credentials not configured' }
  }

  try {
    const response = await fetch(`${apiBaseUrl}/orders/${orderId}/payments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      cache: 'no-store',
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.message || 'Failed to fetch payment attempts' }
    }

    return { payments: Array.isArray(data) ? data : [] }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch payment attempts' }
  }
}

export async function createCashfreeRefund(params: {
  order_id: string
  refund_id: string
  refund_amount: number
  refund_note?: string
}) {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const apiBaseUrl = process.env.CASHFREE_API_URL || 'https://sandbox.cashfree.com/pg'

  if (!appId || !secretKey) {
    return { error: 'Cashfree credentials not configured' }
  }

  try {
    const response = await fetch(`${apiBaseUrl}/orders/${params.order_id}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({
        refund_amount: params.refund_amount,
        refund_id: params.refund_id,
        refund_note: params.refund_note || 'Refund initiated from Bubble Boom',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Cashfree refund error:', data)
      return { error: data.message || 'Failed to process refund' }
    }

    return {
      refund_id: data.refund_id,
      cf_refund_id: data.cf_refund_id,
      refund_status: data.refund_status,
      refund_amount: data.refund_amount,
    }
  } catch (error: any) {
    console.error('Cashfree API error:', error)
    return { error: error.message || 'Failed to connect to Cashfree' }
  }
}

export const refundPayment = createCashfreeRefund
