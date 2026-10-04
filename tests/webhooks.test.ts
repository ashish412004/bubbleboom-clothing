import { describe, it, expect } from 'vitest'

describe('Webhook Idempotency & Out-of-Order Handling', () => {
  type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

  interface OrderState {
    order_id: string
    payment_status: PaymentStatus
    fulfilled: boolean
    processedEvents: Set<string>
  }

  function handleIncomingWebhookEvent(
    state: OrderState,
    event: { event_id: string; type: string; status: 'SUCCESS' | 'FAILED' }
  ): { ignored: boolean; reason?: string } {
    // 1. Idempotency Check: Duplicate event detection
    if (state.processedEvents.has(event.event_id)) {
      return { ignored: true, reason: 'Duplicate event already processed.' }
    }

    state.processedEvents.add(event.event_id)

    // 2. Out-of-Order Check:
    // If order is already in terminal successful 'paid' state, do NOT let a delayed FAILED event overwrite it.
    if (state.payment_status === 'paid' && event.status === 'FAILED') {
      return {
        ignored: true,
        reason: 'Out-of-order failed event ignored: order is already marked paid.',
      }
    }

    if (event.status === 'SUCCESS') {
      state.payment_status = 'paid'
      state.fulfilled = true
    } else if (event.status === 'FAILED') {
      state.payment_status = 'failed'
    }

    return { ignored: false }
  }

  it('rejects duplicate webhook events with identical event_id', () => {
    const orderState: OrderState = {
      order_id: 'BB-20261004-1001',
      payment_status: 'pending',
      fulfilled: false,
      processedEvents: new Set<string>(),
    }

    const event = {
      event_id: 'evt_cf_success_9999',
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      status: 'SUCCESS' as const,
    }

    // First arrival
    const firstAttempt = handleIncomingWebhookEvent(orderState, event)
    expect(firstAttempt.ignored).toBe(false)
    expect(orderState.payment_status).toBe('paid')
    expect(orderState.fulfilled).toBe(true)

    // Second arrival of the same webhook from Cashfree retry
    const secondAttempt = handleIncomingWebhookEvent(orderState, event)
    expect(secondAttempt.ignored).toBe(true)
    expect(secondAttempt.reason).toContain('Duplicate event already processed')
  })

  it('protects paid order from being overwritten by an out-of-order failed webhook', () => {
    const orderState: OrderState = {
      order_id: 'BB-20261004-1002',
      payment_status: 'pending',
      fulfilled: false,
      processedEvents: new Set<string>(),
    }

    // Success webhook arrives first
    handleIncomingWebhookEvent(orderState, {
      event_id: 'evt_cf_success_1',
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      status: 'SUCCESS',
    })
    expect(orderState.payment_status).toBe('paid')

    // Stale failure webhook from an earlier attempt arrives delayed
    const delayedFailed = handleIncomingWebhookEvent(orderState, {
      event_id: 'evt_cf_failed_prior_attempt',
      type: 'PAYMENT_FAILED_WEBHOOK',
      status: 'FAILED',
    })

    expect(delayedFailed.ignored).toBe(true)
    expect(delayedFailed.reason).toContain('Out-of-order failed event ignored')
    // Payment status must REMAIN 'paid'
    expect(orderState.payment_status).toBe('paid')
    expect(orderState.fulfilled).toBe(true)
  })
})
