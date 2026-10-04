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

export async function createCashfreeOrder(
  orderRequest: CashfreeOrderRequest
): Promise<CashfreePaymentResponse | { error: string }> {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const apiBaseUrl = process.env.CASHFREE_API_URL || 'https://sandbox.cashfree.com/pg'

  if (!appId || !secretKey) {
    return { error: 'Cashfree credentials not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.' }
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
      console.error('Cashfree order creation error:', data)
      return { error: data.message || 'Failed to create Cashfree order' }
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
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const apiBaseUrl = process.env.CASHFREE_API_URL || 'https://sandbox.cashfree.com/pg'

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
    }
  } catch (error: any) {
    console.error('Cashfree API error:', error)
    return { error: error.message || 'Failed to connect to Cashfree' }
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
