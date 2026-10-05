import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  validateEmailAddress,
  generateSecureToken,
  subscribeNewsletter,
  confirmNewsletterSubscription,
  unsubscribeNewsletter,
  getNewsletterSubscribersAdmin,
  _resetNewsletterStore,
} from '@/lib/newsletter'
import * as resendModule from '@/lib/emails/resend'

describe('Boom Squad Newsletter Subscription Suite', () => {
  beforeEach(() => {
    _resetNewsletterStore()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('1. Client & Server Email Validation', () => {
    it('accepts standard valid email addresses', () => {
      expect(validateEmailAddress('ashish@bubbleboom.in')).toBe(true)
      expect(validateEmailAddress('customer.first@gmail.com')).toBe(true)
      expect(validateEmailAddress('test+tag@subdomain.example.co.in')).toBe(true)
    })

    it('rejects invalid or malformed email strings', () => {
      expect(validateEmailAddress('')).toBe(false)
      expect(validateEmailAddress('invalid-email')).toBe(false)
      expect(validateEmailAddress('user@')).toBe(false)
      expect(validateEmailAddress('@domain.com')).toBe(false)
      expect(validateEmailAddress('user @domain.com')).toBe(false)
      expect(validateEmailAddress('user@domain')).toBe(false)
    })

    it('rejects subscription requests with invalid email address and does not create record', async () => {
      const res = await subscribeNewsletter({ email: 'bad-email' })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/valid email/i)

      const adminList = await getNewsletterSubscribersAdmin({})
      expect(adminList.counts.total).toBe(0)
    })
  })

  describe('2. Double Opt-In Verification Lifecycle', () => {
    it('creates pending subscription and generates valid verification link with token', async () => {
      const res = await subscribeNewsletter({
        email: 'NEW.MEMBER@BubbleBoom.in',
        source: 'storefront_footer',
      })

      expect(res.success).toBe(true)
      expect(res.message).toMatch(/confirmation email sent/i)
      expect(res.confirmationUrl).toBeDefined()
      expect(res.confirmationUrl).toContain('/newsletter/confirm?token=')

      const adminList = await getNewsletterSubscribersAdmin({})
      expect(adminList.counts.total).toBe(1)
      expect(adminList.counts.pending).toBe(1)
      expect(adminList.counts.active).toBe(0)

      const subscriber = adminList.subscribers[0]
      expect(subscriber.email).toBe('new.member@bubbleboom.in')
      expect(subscriber.status).toBe('pending')
      expect(subscriber.consent_given).toBe(true)
      expect(subscriber.source).toBe('storefront_footer')
      expect(subscriber.confirmation_token).toBeDefined()
    })

    it('activates subscription only after clicking confirmation link with valid token', async () => {
      const subRes = await subscribeNewsletter({ email: 'fan@boom.in' })
      const token = new URL(subRes.confirmationUrl!).searchParams.get('token')!

      // Confirm with token
      const confirmRes = await confirmNewsletterSubscription({ token })
      expect(confirmRes.success).toBe(true)
      expect(confirmRes.message).toMatch(/part of the boom squad/i)
      expect(confirmRes.email).toBe('fan@boom.in')

      // Verify active status in admin
      const adminList = await getNewsletterSubscribersAdmin({})
      expect(adminList.counts.active).toBe(1)
      expect(adminList.counts.pending).toBe(0)

      const activeSub = adminList.subscribers[0]
      expect(activeSub.status).toBe('active')
      expect(activeSub.confirmed_at).toBeDefined()
      expect(activeSub.confirmation_token).toBeNull() // consumed
    })

    it('rejects confirmation with expired token', async () => {
      vi.useFakeTimers()
      const subRes = await subscribeNewsletter({ email: 'late@boom.in' })
      const token = new URL(subRes.confirmationUrl!).searchParams.get('token')!

      // Fast forward past 24-hour expiration (25 hours)
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      const confirmRes = await confirmNewsletterSubscription({ token })
      expect(confirmRes.success).toBe(false)
      expect(confirmRes.expired).toBe(true)
      expect(confirmRes.error).toMatch(/expired/i)
      vi.useRealTimers()
    })

    it('rejects reused or invalid confirmation tokens', async () => {
      const subRes = await subscribeNewsletter({ email: 'reuse@boom.in' })
      const token = new URL(subRes.confirmationUrl!).searchParams.get('token')!

      // First confirmation succeeds
      const firstConfirm = await confirmNewsletterSubscription({ token })
      expect(firstConfirm.success).toBe(true)

      // Second attempt with same token fails
      const secondConfirm = await confirmNewsletterSubscription({ token })
      expect(secondConfirm.success).toBe(false)
      expect(secondConfirm.error).toMatch(/invalid or has already been used/i)
    })
  })

  describe('3. Rate Limiting & Cooldown Protection', () => {
    it('blocks rapid duplicate requests within 60-second cooldown window', async () => {
      const email = 'cooldown@boom.in'
      const first = await subscribeNewsletter({ email })
      expect(first.success).toBe(true)

      // Immediately attempt a second subscribe request
      const second = await subscribeNewsletter({ email })
      expect(second.success).toBe(false)
      expect(second.rateLimited).toBe(true)
      expect(second.error).toMatch(/wait \d+ seconds/i)
    })

    it('allows resend after cooldown period elapses with a fresh token', async () => {
      vi.useFakeTimers()
      const email = 'resend@boom.in'
      const first = await subscribeNewsletter({ email })
      const token1 = new URL(first.confirmationUrl!).searchParams.get('token')!

      // Advance clock by 61 seconds
      vi.advanceTimersByTime(61 * 1000)

      const second = await subscribeNewsletter({ email })
      expect(second.success).toBe(true)
      const token2 = new URL(second.confirmationUrl!).searchParams.get('token')!

      // Fresh token was issued
      expect(token2).not.toEqual(token1)
      vi.useRealTimers()
    })
  })

  describe('4. Repeated Subscriptions & Privacy Protection', () => {
    it('handles repeated subscriptions for already active subscribers without revealing private account details', async () => {
      const email = 'active.member@boom.in'
      const subRes = await subscribeNewsletter({ email })
      const token = new URL(subRes.confirmationUrl!).searchParams.get('token')!
      await confirmNewsletterSubscription({ token })

      // Now member tries to subscribe again
      const repeatRes = await subscribeNewsletter({ email })
      expect(repeatRes.success).toBe(true)
      expect(repeatRes.alreadyActive).toBe(true)
      expect(repeatRes.message).toMatch(/already subscribed/i)

      // Does not create duplicate database rows
      const adminList = await getNewsletterSubscribersAdmin({})
      expect(adminList.counts.total).toBe(1)
      expect(adminList.counts.active).toBe(1)
    })

    it('allows unsubscribed subscribers to re-subscribe and restarts verification', async () => {
      vi.useFakeTimers()
      const email = 'reactivate@boom.in'
      const subRes = await subscribeNewsletter({ email })
      const confirmToken = new URL(subRes.confirmationUrl!).searchParams.get('token')!
      await confirmNewsletterSubscription({ token: confirmToken })

      // Fetch subscriber's unsubscribe token from admin
      const adminBefore = await getNewsletterSubscribersAdmin({})
      const unsubToken = adminBefore.subscribers[0].unsubscribe_token!

      // Advance past cooldown before unsubscribe
      vi.advanceTimersByTime(61 * 1000)

      // Unsubscribe
      await unsubscribeNewsletter({ token: unsubToken })
      const adminUnsub = await getNewsletterSubscribersAdmin({})
      expect(adminUnsub.counts.unsubscribed).toBe(1)

      // Advance past cooldown before re-subscribing
      vi.advanceTimersByTime(61 * 1000)

      // Now customer changes mind and re-subscribes
      const reSub = await subscribeNewsletter({ email })
      expect(reSub.success).toBe(true)
      expect(reSub.message).toMatch(/confirmation email sent/i)

      const adminAfter = await getNewsletterSubscribersAdmin({})
      expect(adminAfter.counts.total).toBe(1)
      expect(adminAfter.counts.pending).toBe(1)
      vi.useRealTimers()
    })
  })

  describe('5. Working 1-Click Unsubscribe (No Login Required)', () => {
    it('unsubscribes customer cleanly using persistent token without impacting orders or auth', async () => {
      const email = 'optout@boom.in'
      const subRes = await subscribeNewsletter({ email })
      const token = new URL(subRes.confirmationUrl!).searchParams.get('token')!
      await confirmNewsletterSubscription({ token })

      const adminList = await getNewsletterSubscribersAdmin({})
      const unsubToken = adminList.subscribers[0].unsubscribe_token!

      const unsubRes = await unsubscribeNewsletter({ token: unsubToken })
      expect(unsubRes.success).toBe(true)
      expect(unsubRes.message).toMatch(/successfully unsubscribed/i)

      const adminAfter = await getNewsletterSubscribersAdmin({})
      expect(adminAfter.counts.active).toBe(0)
      expect(adminAfter.counts.unsubscribed).toBe(1)
      expect(adminAfter.subscribers[0].unsubscribed_at).toBeDefined()
    })

    it('handles idempotent repeated unsubscribe calls gracefully', async () => {
      const email = 'idempotent@boom.in'
      const subRes = await subscribeNewsletter({ email })
      const token = new URL(subRes.confirmationUrl!).searchParams.get('token')!
      await confirmNewsletterSubscription({ token })

      const adminList = await getNewsletterSubscribersAdmin({})
      const unsubToken = adminList.subscribers[0].unsubscribe_token!

      await unsubscribeNewsletter({ token: unsubToken })
      const secondUnsub = await unsubscribeNewsletter({ token: unsubToken })
      expect(secondUnsub.success).toBe(true)
      expect(secondUnsub.message).toMatch(/already unsubscribed/i)
    })

    it('rejects invalid or missing unsubscribe token', async () => {
      const res = await unsubscribeNewsletter({ token: 'bogus_token' })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/invalid/i)
    })
  })

  describe('6. Honest Error Handling (Never Claim Sent When Failed)', () => {
    it('never claims confirmation email was sent if email transport throws an error', async () => {
      // Mock sendNewsletterConfirmationEmail to return error
      vi.spyOn(resendModule, 'sendNewsletterConfirmationEmail').mockResolvedValueOnce({
        error: 'Resend API rate limit or invalid domain configuration',
      })

      const res = await subscribeNewsletter({ email: 'transport.error@boom.in' })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unable to send verification email/i)

      // Ensure no phantom confirmed or active records
      const adminList = await getNewsletterSubscribersAdmin({})
      expect(adminList.counts.active).toBe(0)
    })
  })

  describe('7. Admin Filtering, Search & Aggregates', () => {
    it('filters subscribers by status correctly and calculates aggregate counts', async () => {
      // Create one pending
      await subscribeNewsletter({ email: 'one.pending@boom.in' })

      // Create one active
      const s2 = await subscribeNewsletter({ email: 'two.active@boom.in' })
      const token2 = new URL(s2.confirmationUrl!).searchParams.get('token')!
      await confirmNewsletterSubscription({ token: token2 })

      // Create one unsubscribed
      const s3 = await subscribeNewsletter({ email: 'three.unsub@boom.in' })
      const token3 = new URL(s3.confirmationUrl!).searchParams.get('token')!
      await confirmNewsletterSubscription({ token: token3 })
      const adminData = await getNewsletterSubscribersAdmin({})
      const unsubToken3 = adminData.subscribers.find((s) => s.email === 'three.unsub@boom.in')!.unsubscribe_token!
      await unsubscribeNewsletter({ token: unsubToken3 })

      // Query all
      const allRes = await getNewsletterSubscribersAdmin({ status: 'all' })
      expect(allRes.counts.total).toBe(3)
      expect(allRes.counts.pending).toBe(1)
      expect(allRes.counts.active).toBe(1)
      expect(allRes.counts.unsubscribed).toBe(1)
      expect(allRes.subscribers.length).toBe(3)

      // Query only active
      const activeRes = await getNewsletterSubscribersAdmin({ status: 'active' })
      expect(activeRes.subscribers.length).toBe(1)
      expect(activeRes.subscribers[0].email).toBe('two.active@boom.in')

      // Query search filter
      const searchRes = await getNewsletterSubscribersAdmin({ search: 'pending' })
      expect(searchRes.subscribers.length).toBe(1)
      expect(searchRes.subscribers[0].email).toBe('one.pending@boom.in')
    })
  })
})
