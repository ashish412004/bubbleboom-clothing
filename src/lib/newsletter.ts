import crypto from 'crypto'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import {
  sendNewsletterConfirmationEmail,
  sendNewsletterWelcomeEmail,
  sendNewsletterUnsubscribeEmail,
} from '@/lib/emails/resend'

export type SubscriberStatus = 'pending' | 'active' | 'unsubscribed'

export interface NewsletterSubscriber {
  id: string
  email: string
  status: SubscriberStatus
  confirmation_token: string | null
  token_expires_at: string | null
  confirmed_at: string | null
  unsubscribe_token: string | null
  unsubscribed_at: string | null
  last_sent_at: string | null
  consent_given: boolean
  source: string | null
  created_at: string
  updated_at: string | null
}

export interface SubscriberCounts {
  total: number
  active: number
  pending: number
  unsubscribed: number
}

// In-memory store for fallback in local dev or unit tests
const globalNewsletterStore = globalThis as unknown as {
  __bb_newsletter_subscribers?: Map<string, NewsletterSubscriber>
}

function getMemoryStore(): Map<string, NewsletterSubscriber> {
  if (!globalNewsletterStore.__bb_newsletter_subscribers) {
    globalNewsletterStore.__bb_newsletter_subscribers = new Map()
  }
  return globalNewsletterStore.__bb_newsletter_subscribers
}

export function _resetNewsletterStore() {
  getMemoryStore().clear()
}

export function validateEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const trimmed = email.trim()
  if (trimmed.length < 5 || trimmed.length > 254) return false
  // Standard RFC 5322 regex validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return emailRegex.test(trimmed)
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds cooldown
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours expiry

/**
 * Handle new subscription request or re-subscription attempt
 */
export async function subscribeNewsletter({
  email,
  source = 'storefront_footer',
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app',
}: {
  email: string
  source?: string
  siteUrl?: string
}): Promise<{
  success: boolean
  message: string
  status?: SubscriberStatus
  alreadyActive?: boolean
  rateLimited?: boolean
  error?: string
  confirmationUrl?: string // exposed for tests/dev logging
}> {
  const normalizedEmail = (email || '').trim().toLowerCase()

  if (!validateEmailAddress(normalizedEmail)) {
    return {
      success: false,
      error: 'Please enter a valid email address.',
      message: 'Invalid email address provided.',
    }
  }

  const now = new Date(Date.now())

  // 1. If Supabase is configured, use service client with table
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()

      // Fetch existing record
      const { data: existing, error: fetchError } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (fetchError) {
        console.error('Error querying newsletter subscriber:', fetchError)
      }

      // Case A: Already active subscriber (supports both full schema 'status' and legacy 'is_active')
      const isAlreadyActive =
        existing &&
        (existing.status === 'active' ||
          (existing.status === undefined && existing.is_active === true))

      if (isAlreadyActive) {
        return {
          success: true,
          alreadyActive: true,
          status: 'active',
          message: "You're already subscribed to the Boom Squad!",
        }
      }

      // Check cooldown for pending or re-subscribing users
      if (existing && existing.last_sent_at) {
        const lastSentTime = new Date(existing.last_sent_at).getTime()
        if (now.getTime() - lastSentTime < RESEND_COOLDOWN_MS) {
          const remainingSecs = Math.ceil((RESEND_COOLDOWN_MS - (now.getTime() - lastSentTime)) / 1000)
          return {
            success: false,
            rateLimited: true,
            error: `Please wait ${remainingSecs} seconds before requesting another confirmation email.`,
            message: `Please wait ${remainingSecs} seconds before requesting another confirmation email.`,
          }
        }
      }

      const confirmationToken = generateSecureToken()
      const unsubscribeToken = existing?.unsubscribe_token || generateSecureToken()
      const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS).toISOString()
      const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmationToken}`

      // Attempt sending the confirmation email
      const emailResult = await sendNewsletterConfirmationEmail(normalizedEmail, confirmUrl)
      if (emailResult.error) {
        console.error('Newsletter confirmation email failed:', emailResult.error)
        return {
          success: false,
          error: 'Unable to send verification email. Please try again later.',
          message: 'Unable to send verification email. Please try again later.',
        }
      }

      // Save / update subscription record in Supabase
      const payload: any = {
        email: normalizedEmail,
        status: 'pending' as const,
        confirmation_token: confirmationToken,
        token_expires_at: expiresAt,
        unsubscribe_token: unsubscribeToken,
        last_sent_at: now.toISOString(),
        consent_given: true,
        source,
        updated_at: now.toISOString(),
        is_active: true,
      }

      let { error: upsertError } = await supabase
        .from('newsletter_subscribers')
        .upsert(payload, { onConflict: 'email' })

      // Fallback for database schema missing newer columns (e.g. status, consent_given)
      if (
        upsertError &&
        (upsertError.code === 'PGRST204' ||
          upsertError.message?.toLowerCase().includes('column') ||
          upsertError.message?.toLowerCase().includes('does not exist') ||
          upsertError.message?.toLowerCase().includes('schema cache'))
      ) {
        console.warn(
          'Falling back to live basic newsletter schema for Supabase (email, is_active, subscribed_at):',
          upsertError.message
        )
        const fallbackRes = await supabase
          .from('newsletter_subscribers')
          .upsert(
            {
              email: normalizedEmail,
              is_active: true,
              subscribed_at: now.toISOString(),
            },
            { onConflict: 'email' }
          )
        upsertError = fallbackRes.error

        if (!upsertError) {
          return {
            success: true,
            status: 'active',
            message: "Welcome to the Boom Squad! You're now subscribed.",
            confirmationUrl: confirmUrl,
          }
        }
      }

      if (upsertError) {
        console.error('Failed to persist newsletter subscriber:', upsertError)
        return {
          success: false,
          error: 'Failed to record subscription. Please try again.',
          message: 'Failed to record subscription. Please try again.',
        }
      }

      return {
        success: true,
        status: 'pending',
        message: 'Confirmation email sent! Please check your inbox to activate your subscription.',
        confirmationUrl: confirmUrl,
      }
    } catch (err: any) {
      console.error('Newsletter subscribe error with Supabase:', err)
      return {
        success: false,
        error: err.message || 'Internal server error',
        message: 'Subscription failed. Please try again later.',
      }
    }
  }

  // 2. Dev / in-memory fallback
  const store = getMemoryStore()
  const existing = store.get(normalizedEmail)

  if (existing && existing.status === 'active') {
    return {
      success: true,
      alreadyActive: true,
      status: 'active',
      message: "You're already subscribed to the Boom Squad!",
    }
  }

  if (existing && existing.last_sent_at) {
    const lastSentTime = new Date(existing.last_sent_at).getTime()
    if (now.getTime() - lastSentTime < RESEND_COOLDOWN_MS) {
      const remainingSecs = Math.ceil((RESEND_COOLDOWN_MS - (now.getTime() - lastSentTime)) / 1000)
      return {
        success: false,
        rateLimited: true,
        error: `Please wait ${remainingSecs} seconds before requesting another confirmation email.`,
        message: `Please wait ${remainingSecs} seconds before requesting another confirmation email.`,
      }
    }
  }

  const confirmationToken = generateSecureToken()
  const unsubscribeToken = existing?.unsubscribe_token || generateSecureToken()
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS).toISOString()
  const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmationToken}`

  const emailResult = await sendNewsletterConfirmationEmail(normalizedEmail, confirmUrl)
  if (emailResult.error) {
    return {
      success: false,
      error: 'Unable to send verification email. Please try again later.',
      message: 'Unable to send verification email. Please try again later.',
    }
  }

  const subscriberRecord: NewsletterSubscriber = {
    id: existing?.id || crypto.randomUUID(),
    email: normalizedEmail,
    status: 'pending',
    confirmation_token: confirmationToken,
    token_expires_at: expiresAt,
    confirmed_at: null,
    unsubscribe_token: unsubscribeToken,
    unsubscribed_at: null,
    last_sent_at: now.toISOString(),
    consent_given: true,
    source,
    created_at: existing?.created_at || now.toISOString(),
    updated_at: now.toISOString(),
  }

  store.set(normalizedEmail, subscriberRecord)

  return {
    success: true,
    status: 'pending',
    message: 'Confirmation email sent! Please check your inbox to activate your subscription.',
    confirmationUrl: confirmUrl,
  }
}

/**
 * Confirm a pending newsletter subscription via token
 */
export async function confirmNewsletterSubscription({
  token,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app',
}: {
  token: string
  siteUrl?: string
}): Promise<{
  success: boolean
  message: string
  expired?: boolean
  error?: string
  email?: string
}> {
  if (!token || typeof token !== 'string') {
    return {
      success: false,
      error: 'Invalid or missing confirmation link.',
      message: 'Invalid or missing confirmation link.',
    }
  }

  const trimmedToken = token.trim()
  const now = new Date(Date.now())

  // 1. Supabase execution
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: subscriber, error: fetchError } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('confirmation_token', trimmedToken)
        .maybeSingle()

      if (fetchError || !subscriber) {
        return {
          success: false,
          error: 'This confirmation link is invalid or has already been used.',
          message: 'Invalid confirmation token.',
        }
      }

      // Verify expiration
      if (subscriber.token_expires_at && new Date(subscriber.token_expires_at) < now) {
        return {
          success: false,
          expired: true,
          error: 'This confirmation link has expired. Please subscribe again on our website.',
          message: 'Confirmation link expired.',
        }
      }

      const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`

      // Activate subscriber & consume confirmation token
      let { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({
          status: 'active',
          is_active: true,
          confirmed_at: now.toISOString(),
          confirmation_token: null,
          token_expires_at: null,
          updated_at: now.toISOString(),
        })
        .eq('id', subscriber.id)

      if (
        updateError &&
        (updateError.code === 'PGRST204' ||
          updateError.message?.toLowerCase().includes('column') ||
          updateError.message?.toLowerCase().includes('does not exist'))
      ) {
        const legacyUpdate = await supabase
          .from('newsletter_subscribers')
          .update({ is_active: true })
          .eq('id', subscriber.id)
        updateError = legacyUpdate.error
      }

      if (updateError) {
        console.error('Error updating subscriber confirmation:', updateError)
        return {
          success: false,
          error: 'Could not complete confirmation. Please try again.',
          message: 'Database update failed.',
        }
      }

      // Fire welcome email asynchronously
      sendNewsletterWelcomeEmail(subscriber.email, unsubscribeUrl).catch((err) =>
        console.error('Non-fatal welcome email error:', err)
      )

      return {
        success: true,
        email: subscriber.email,
        message: "You're officially part of the Boom Squad! Subscription confirmed.",
      }
    } catch (err: any) {
      console.error('Confirmation error:', err)
      return {
        success: false,
        error: err.message || 'Server error',
        message: 'Confirmation failed.',
      }
    }
  }

  // 2. Dev / in-memory fallback
  const store = getMemoryStore()
  let matchedSubscriber: NewsletterSubscriber | null = null

  for (const sub of store.values()) {
    if (sub.confirmation_token === trimmedToken) {
      matchedSubscriber = sub
      break
    }
  }

  if (!matchedSubscriber) {
    return {
      success: false,
      error: 'This confirmation link is invalid or has already been used.',
      message: 'Invalid confirmation token.',
    }
  }

  if (matchedSubscriber.token_expires_at && new Date(matchedSubscriber.token_expires_at) < now) {
    return {
      success: false,
      expired: true,
      error: 'This confirmation link has expired. Please subscribe again on our website.',
      message: 'Confirmation link expired.',
    }
  }

  matchedSubscriber.status = 'active'
  matchedSubscriber.confirmed_at = now.toISOString()
  matchedSubscriber.confirmation_token = null
  matchedSubscriber.token_expires_at = null
  matchedSubscriber.updated_at = now.toISOString()
  store.set(matchedSubscriber.email, matchedSubscriber)

  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${matchedSubscriber.unsubscribe_token}`
  sendNewsletterWelcomeEmail(matchedSubscriber.email, unsubscribeUrl).catch((err) =>
    console.error('Non-fatal welcome email error in memory:', err)
  )

  return {
    success: true,
    email: matchedSubscriber.email,
    message: "You're officially part of the Boom Squad! Subscription confirmed.",
  }
}

/**
 * 1-click unsubscribe via secure persistent token (no login required)
 */
export async function unsubscribeNewsletter({
  token,
}: {
  token: string
}): Promise<{
  success: boolean
  message: string
  error?: string
  email?: string
}> {
  if (!token || typeof token !== 'string') {
    return {
      success: false,
      error: 'Invalid or missing unsubscribe link.',
      message: 'Missing unsubscribe token.',
    }
  }

  const trimmedToken = token.trim()
  const now = new Date(Date.now())

  // 1. Supabase execution
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: subscriber, error: fetchError } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('unsubscribe_token', trimmedToken)
        .maybeSingle()

      if (fetchError || !subscriber) {
        return {
          success: false,
          error: 'Unsubscribe token is invalid or does not match any subscription.',
          message: 'Subscriber not found.',
        }
      }

      if (subscriber.status === 'unsubscribed' || subscriber.is_active === false) {
        return {
          success: true,
          email: subscriber.email,
          message: 'You have already unsubscribed from promotional emails.',
        }
      }

      let { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({
          status: 'unsubscribed',
          is_active: false,
          unsubscribed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', subscriber.id)

      if (
        updateError &&
        (updateError.code === 'PGRST204' ||
          updateError.message?.toLowerCase().includes('column') ||
          updateError.message?.toLowerCase().includes('does not exist'))
      ) {
        const legacyUpdate = await supabase
          .from('newsletter_subscribers')
          .update({ is_active: false })
          .eq('id', subscriber.id)
        updateError = legacyUpdate.error
      }

      if (updateError) {
        console.error('Error updating unsubscribe status:', updateError)
        return {
          success: false,
          error: 'Failed to update subscription status. Please try again.',
          message: 'Database update failed.',
        }
      }

      return {
        success: true,
        email: subscriber.email,
        message: 'You have been successfully unsubscribed from the Boom Squad newsletter.',
      }
    } catch (err: any) {
      console.error('Unsubscribe error:', err)
      return {
        success: false,
        error: err.message || 'Server error',
        message: 'Unsubscribe failed.',
      }
    }
  }

  // 2. Dev / in-memory fallback
  const store = getMemoryStore()
  let matchedSubscriber: NewsletterSubscriber | null = null

  for (const sub of store.values()) {
    if (sub.unsubscribe_token === trimmedToken) {
      matchedSubscriber = sub
      break
    }
  }

  if (!matchedSubscriber) {
    return {
      success: false,
      error: 'Unsubscribe token is invalid or does not match any subscription.',
      message: 'Subscriber not found.',
    }
  }

  if (matchedSubscriber.status === 'unsubscribed') {
    return {
      success: true,
      email: matchedSubscriber.email,
      message: 'You have already unsubscribed from promotional emails.',
    }
  }

  matchedSubscriber.status = 'unsubscribed'
  matchedSubscriber.unsubscribed_at = now.toISOString()
  matchedSubscriber.updated_at = now.toISOString()
  store.set(matchedSubscriber.email, matchedSubscriber)

  return {
    success: true,
    email: matchedSubscriber.email,
    message: 'You have been successfully unsubscribed from the Boom Squad newsletter.',
  }
}

/**
 * Direct unsubscribe by email address (for authenticated users or fallback)
 */
export async function unsubscribeByEmail(email: string): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const normalizedEmail = (email || '').trim().toLowerCase()
  if (!validateEmailAddress(normalizedEmail)) {
    return { success: false, error: 'Invalid email address.', message: 'Invalid email address.' }
  }
  const now = new Date()

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      let { error: updateErr } = await supabase
        .from('newsletter_subscribers')
        .update({
          status: 'unsubscribed',
          is_active: false,
          unsubscribed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('email', normalizedEmail)

      if (
        updateErr &&
        (updateErr.code === 'PGRST204' ||
          updateErr.message?.toLowerCase().includes('column') ||
          updateErr.message?.toLowerCase().includes('does not exist'))
      ) {
        const legacyRes = await supabase
          .from('newsletter_subscribers')
          .update({ is_active: false })
          .eq('email', normalizedEmail)
        updateErr = legacyRes.error
      }

      if (updateErr) {
        return { success: false, error: 'Database update failed.', message: 'Database update failed.' }
      }
      return { success: true, message: 'You have been unsubscribed.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error unsubscribing.', message: err.message || 'Error unsubscribing.' }
    }
  }

  const store = getMemoryStore()
  const sub = store.get(normalizedEmail)
  if (sub) {
    sub.status = 'unsubscribed'
    sub.unsubscribed_at = now.toISOString()
    store.set(normalizedEmail, sub)
  }
  return { success: true, message: 'You have been unsubscribed.' }
}

/**
 * Admin: Retrieve subscriber list with status filters, search, and count aggregates
 */
export async function getNewsletterSubscribersAdmin({
  status = 'all',
  search = '',
  limit = 50,
  offset = 0,
}: {
  status?: 'all' | SubscriberStatus
  search?: string
  limit?: number
  offset?: number
}): Promise<{
  subscribers: NewsletterSubscriber[]
  counts: SubscriberCounts
  totalFiltered: number
}> {
  // 1. Supabase execution
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()

      let query = supabase.from('newsletter_subscribers').select('*')

      if (search.trim()) {
        query = query.ilike('email', `%${search.trim().toLowerCase()}%`)
      }

      const { data: allRows, error } = await query

      if (error) {
        console.error('Error fetching subscribers in admin:', error)
        return {
          subscribers: [],
          counts: { total: 0, active: 0, pending: 0, unsubscribed: 0 },
          totalFiltered: 0,
        }
      }

      const normalized: NewsletterSubscriber[] = (allRows || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        status: row.status || (row.is_active === false ? 'unsubscribed' : 'active'),
        confirmation_token: row.confirmation_token || null,
        token_expires_at: row.token_expires_at || null,
        confirmed_at: row.confirmed_at || null,
        unsubscribe_token: row.unsubscribe_token || null,
        unsubscribed_at: row.unsubscribed_at || null,
        last_sent_at: row.last_sent_at || null,
        consent_given: row.consent_given ?? true,
        source: row.source || 'storefront_footer',
        created_at: row.created_at || row.subscribed_at || new Date().toISOString(),
        updated_at: row.updated_at || null,
      }))

      const counts: SubscriberCounts = {
        total: normalized.length,
        active: normalized.filter((s) => s.status === 'active').length,
        pending: normalized.filter((s) => s.status === 'pending').length,
        unsubscribed: normalized.filter((s) => s.status === 'unsubscribed').length,
      }

      let filtered = normalized

      if (status !== 'all') {
        filtered = filtered.filter((s) => s.status === status)
      }

      filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      const paginated = filtered.slice(offset, offset + limit)

      return {
        subscribers: paginated,
        counts,
        totalFiltered: filtered.length,
      }
    } catch (err) {
      console.error('Admin subscribers query error:', err)
      return {
        subscribers: [],
        counts: { total: 0, active: 0, pending: 0, unsubscribed: 0 },
        totalFiltered: 0,
      }
    }
  }

  // 2. Dev / in-memory fallback
  const store = getMemoryStore()
  const allSubscribers = Array.from(store.values())

  const counts: SubscriberCounts = {
    total: allSubscribers.length,
    active: allSubscribers.filter((s) => s.status === 'active').length,
    pending: allSubscribers.filter((s) => s.status === 'pending').length,
    unsubscribed: allSubscribers.filter((s) => s.status === 'unsubscribed').length,
  }

  let filtered = allSubscribers

  if (status !== 'all') {
    filtered = filtered.filter((s) => s.status === status)
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter((s) => s.email.toLowerCase().includes(q))
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const paginated = filtered.slice(offset, offset + limit)

  return {
    subscribers: paginated,
    counts,
    totalFiltered: filtered.length,
  }
}

/**
 * Get subscriber record by normalized email
 */
export async function getSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
  const normalizedEmail = (email || '').trim().toLowerCase()
  if (!validateEmailAddress(normalizedEmail)) return null

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (error) {
        console.error('Error fetching subscriber by email:', error)
        return null
      }
      if (!data) return null

      return {
        id: data.id,
        email: data.email,
        status: data.status || (data.is_active === false ? 'unsubscribed' : 'active'),
        confirmation_token: data.confirmation_token || null,
        token_expires_at: data.token_expires_at || null,
        confirmed_at: data.confirmed_at || null,
        unsubscribe_token: data.unsubscribe_token || null,
        unsubscribed_at: data.unsubscribed_at || null,
        last_sent_at: data.last_sent_at || null,
        consent_given: data.consent_given ?? true,
        source: data.source || 'storefront_footer',
        created_at: data.created_at || data.subscribed_at || new Date().toISOString(),
        updated_at: data.updated_at || null,
      }
    } catch (err) {
      console.error('Database query error in getSubscriberByEmail:', err)
      return null
    }
  }

  const store = getMemoryStore()
  return store.get(normalizedEmail) || null
}

/**
 * Send an unsubscribe confirmation link to an email address (safe for guest visitors)
 */
export async function requestUnsubscribeEmail({
  email,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app',
}: {
  email: string
  siteUrl?: string
}): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const normalizedEmail = (email || '').trim().toLowerCase()
  if (!validateEmailAddress(normalizedEmail)) {
    return {
      success: false,
      error: 'Please enter a valid email address.',
      message: 'Invalid email address provided.',
    }
  }

  const subscriber = await getSubscriberByEmail(normalizedEmail)

  // Avoid leaking email existence: return ambiguous success message even if not found
  if (!subscriber) {
    return {
      success: true,
      message: 'If this email is subscribed, an unsubscribe link has been sent to your inbox.',
    }
  }

  if (subscriber.status === 'unsubscribed') {
    return {
      success: true,
      message: 'This email is already unsubscribed from our newsletter.',
    }
  }

  const unsubscribeToken = subscriber.unsubscribe_token || generateSecureToken()
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`

  // Ensure unsubscribe token exists in DB if it was newly generated
  if (!subscriber.unsubscribe_token && isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      await supabase
        .from('newsletter_subscribers')
        .update({ unsubscribe_token: unsubscribeToken })
        .eq('id', subscriber.id)
    } catch {
      // ignore
    }
  }

  const emailRes = await sendNewsletterUnsubscribeEmail(normalizedEmail, unsubscribeUrl)
  if (emailRes.error) {
    return {
      success: false,
      error: 'Unable to send unsubscribe link right now. Please try again later.',
      message: 'Unable to send unsubscribe link right now.',
    }
  }

  return {
    success: true,
    message: 'We have sent an unsubscribe confirmation link to your email.',
  }
}

/**
 * Admin action: Resend double opt-in confirmation email for a pending subscriber
 */
export async function resendConfirmationEmailAdmin({
  subscriberId,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app',
}: {
  subscriberId: string
  siteUrl?: string
}): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  if (!subscriberId) {
    return { success: false, error: 'Subscriber ID is required.', message: 'Subscriber ID is required.' }
  }

  const now = new Date()

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: subscriber, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('id', subscriberId)
        .maybeSingle()

      if (error || !subscriber) {
        return { success: false, error: 'Subscriber not found.', message: 'Subscriber not found.' }
      }

      if (subscriber.status !== 'pending') {
        const msg = `Subscriber status is '${subscriber.status}', cannot resend pending verification.`
        return {
          success: false,
          error: msg,
          message: msg,
        }
      }

      const confirmationToken = generateSecureToken()
      const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS).toISOString()
      const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmationToken}`

      const emailResult = await sendNewsletterConfirmationEmail(subscriber.email, confirmUrl)
      if (emailResult.error) {
        return {
          success: false,
          error: 'Failed to send confirmation email via SMTP.',
          message: 'Failed to send confirmation email via SMTP.',
        }
      }

      await supabase
        .from('newsletter_subscribers')
        .update({
          confirmation_token: confirmationToken,
          token_expires_at: expiresAt,
          last_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', subscriber.id)

      return {
        success: true,
        message: `Confirmation email re-sent successfully to ${subscriber.email}.`,
      }
    } catch (err: any) {
      const msg = err.message || 'Database error'
      return { success: false, error: msg, message: msg }
    }
  }

  // Memory store fallback
  const store = getMemoryStore()
  let subscriber: NewsletterSubscriber | null = null
  for (const s of store.values()) {
    if (s.id === subscriberId) {
      subscriber = s
      break
    }
  }

  if (!subscriber) {
    return { success: false, error: 'Subscriber not found.', message: 'Subscriber not found.' }
  }

  if (subscriber.status !== 'pending') {
    const msg = `Subscriber status is '${subscriber.status}', cannot resend pending verification.`
    return {
      success: false,
      error: msg,
      message: msg,
    }
  }

  const confirmationToken = generateSecureToken()
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS).toISOString()
  const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmationToken}`

  const emailResult = await sendNewsletterConfirmationEmail(subscriber.email, confirmUrl)
  if (emailResult.error) {
    return {
      success: false,
      error: 'Failed to send confirmation email via SMTP.',
      message: 'Failed to send confirmation email via SMTP.',
    }
  }

  subscriber.confirmation_token = confirmationToken
  subscriber.token_expires_at = expiresAt
  subscriber.last_sent_at = now.toISOString()
  subscriber.updated_at = now.toISOString()
  store.set(subscriber.email, subscriber)

  return {
    success: true,
    message: `Confirmation email re-sent successfully to ${subscriber.email}.`,
  }
}
