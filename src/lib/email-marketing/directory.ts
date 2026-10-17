import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import {
  CustomerDirectoryEntry,
  CampaignAudienceType,
  MarketingConsentStatus,
  AudienceBreakdown,
} from './types'

function determineAuthMethodLabel(user: any): string {
  const identities = user.identities || []
  const hasGoogle =
    identities.some((i: any) => i.provider === 'google') ||
    user.app_metadata?.provider === 'google'
  const hasEmail =
    identities.some((i: any) => i.provider === 'email') ||
    user.app_metadata?.provider === 'email'

  if (hasGoogle && hasEmail) return 'Google + Password'
  if (hasGoogle) return 'Google OAuth'
  if (hasEmail) {
    if (user.user_metadata?.onboarding_completed) return 'Email & Password'
    return 'Email OTP / Password'
  }
  return user.app_metadata?.provider || 'Email'
}

export async function getCustomerEmailDirectory(): Promise<{
  entries: CustomerDirectoryEntry[]
  totalCustomers: number
  totalSubscribers: number
  optedInCount: number
  unsubscribedCount: number
  notOptedInCount: number
}> {
  if (!isSupabaseConfigured()) {
    return {
      entries: [],
      totalCustomers: 0,
      totalSubscribers: 0,
      optedInCount: 0,
      unsubscribedCount: 0,
      notOptedInCount: 0,
    }
  }

  const serviceClient = await createServiceClient()
  const emailMap = new Map<string, CustomerDirectoryEntry>()

  // 1. Fetch Supabase Auth users
  let authUsers: any[] = []
  try {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (!error && data?.users) {
      authUsers = data.users
    }
  } catch (err) {
    console.warn('[Directory] Failed to list auth users:', err)
  }

  // 2. Fetch Customer Profiles
  let profiles: any[] = []
  try {
    const { data, error } = await serviceClient.from('profiles').select('*')
    if (!error && data) {
      profiles = data
    }
  } catch (err) {
    console.warn('[Directory] Failed to query profiles:', err)
  }

  // 3. Fetch Newsletter Subscribers
  let newsletterSubs: any[] = []
  try {
    const { data, error } = await serviceClient.from('newsletter_subscribers').select('*')
    if (!error && data) {
      newsletterSubs = data
    }
  } catch (err) {
    console.warn('[Directory] Failed to query newsletter_subscribers:', err)
  }

  // 4. Fetch Order counts per user (optional, for VIP identification)
  const orderCounts = new Map<string, number>()
  try {
    const { data: orders } = await serviceClient.from('orders').select('user_id')
    if (orders) {
      for (const ord of orders) {
        if (ord.user_id) {
          orderCounts.set(ord.user_id, (orderCounts.get(ord.user_id) || 0) + 1)
        }
      }
    }
  } catch {}

  // Process Auth Users
  for (const user of authUsers) {
    const rawEmail = user.email
    if (!rawEmail || !rawEmail.includes('@')) continue
    const email = rawEmail.trim().toLowerCase()

    const authMethodLabel = determineAuthMethodLabel(user)
    const provider =
      user.app_metadata?.provider ||
      (user.identities && user.identities[0]?.provider) ||
      'email'

    emailMap.set(email, {
      id: user.id,
      email,
      full_name: user.user_metadata?.full_name || null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      provider,
      auth_method_label: authMethodLabel,
      is_registered_customer: true,
      is_newsletter_subscriber: false,
      consent_status: 'not_opted_in',
      marketing_consent: false,
      marketing_consent_at: null,
      orders_count: orderCounts.get(user.id) || 0,
    })
  }

  // Merge Profiles
  for (const prof of profiles) {
    const rawEmail = prof.email
    if (!rawEmail || !rawEmail.includes('@')) continue
    const email = rawEmail.trim().toLowerCase()

    const existing = emailMap.get(email)
    const hasConsent = Boolean(prof.marketing_consent)

    if (existing) {
      existing.full_name = prof.full_name || existing.full_name
      existing.marketing_consent = hasConsent
      existing.marketing_consent_at = prof.marketing_consent_at || null
      if (hasConsent) {
        existing.consent_status = 'opted_in'
      }
      if (!existing.orders_count && prof.id) {
        existing.orders_count = orderCounts.get(prof.id) || 0
      }
    } else {
      emailMap.set(email, {
        id: prof.id,
        email,
        full_name: prof.full_name || null,
        created_at: prof.created_at || new Date().toISOString(),
        last_sign_in_at: null,
        provider: 'email',
        auth_method_label: 'Email & Password',
        is_registered_customer: true,
        is_newsletter_subscriber: false,
        consent_status: hasConsent ? 'opted_in' : 'not_opted_in',
        marketing_consent: hasConsent,
        marketing_consent_at: prof.marketing_consent_at || null,
        orders_count: orderCounts.get(prof.id) || 0,
      })
    }
  }

  // Merge Newsletter Subscribers
  for (const sub of newsletterSubs) {
    const rawEmail = sub.email
    if (!rawEmail || !rawEmail.includes('@')) continue
    const email = rawEmail.trim().toLowerCase()

    const isActive = sub.is_active !== false && sub.status !== 'unsubscribed'
    const isUnsubscribed =
      sub.is_active === false || sub.status === 'unsubscribed' || Boolean(sub.unsubscribed_at)

    const existing = emailMap.get(email)
    if (existing) {
      existing.is_newsletter_subscriber = true
      if (isUnsubscribed) {
        existing.consent_status = 'unsubscribed'
        existing.marketing_consent = false
      } else if (isActive) {
        existing.consent_status = 'opted_in'
        existing.marketing_consent = true
      }
    } else {
      let status: MarketingConsentStatus = 'not_opted_in'
      if (isUnsubscribed) status = 'unsubscribed'
      else if (isActive) status = 'opted_in'

      emailMap.set(email, {
        id: sub.id,
        email,
        full_name: null,
        created_at: sub.subscribed_at || sub.created_at || new Date().toISOString(),
        last_sign_in_at: null,
        provider: 'newsletter',
        auth_method_label: 'Newsletter Opt-In',
        is_registered_customer: false,
        is_newsletter_subscriber: true,
        consent_status: status,
        marketing_consent: status === 'opted_in',
        marketing_consent_at: sub.subscribed_at || sub.created_at || null,
        orders_count: 0,
      })
    }
  }

  const entries = Array.from(emailMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalCustomers = entries.filter((e) => e.is_registered_customer).length
  const totalSubscribers = entries.filter((e) => e.is_newsletter_subscriber).length
  const optedInCount = entries.filter((e) => e.consent_status === 'opted_in').length
  const unsubscribedCount = entries.filter((e) => e.consent_status === 'unsubscribed').length
  const notOptedInCount = entries.filter((e) => e.consent_status === 'not_opted_in').length

  return {
    entries,
    totalCustomers,
    totalSubscribers,
    optedInCount,
    unsubscribedCount,
    notOptedInCount,
  }
}

/**
 * Calculates audience breakdown with strict marketing consent enforcement.
 * Even if the Admin selects 'All Registered Customers', promotional emails are strictly
 * filtered to marketing-eligible contacts, and clear exclusion metrics are provided.
 */
export async function getAudienceBreakdown(
  audienceType: CampaignAudienceType,
  specificEmails: string[] = []
): Promise<AudienceBreakdown> {
  const { entries } = await getCustomerEmailDirectory()

  let pool: CustomerDirectoryEntry[] = []

  if (audienceType === 'all_registered' || audienceType === 'marketing_eligible_registered') {
    pool = entries.filter((e) => e.is_registered_customer)
  } else if (audienceType === 'specific_customers') {
    const specificSet = new Set(specificEmails.map((e) => e.trim().toLowerCase()))
    pool = entries.filter((e) => specificSet.has(e.email))
  } else if (audienceType === 'newsletter_only') {
    pool = entries.filter((e) => e.is_newsletter_subscriber)
  } else {
    // 'existing_opted_in' or 'all_opted_in'
    pool = entries
  }

  const eligibleRecipients: { email: string; name?: string }[] = []
  let noConsentCount = 0
  let unsubscribedCount = 0
  let otherExcluded = 0

  const seen = new Set<string>()

  for (const contact of pool) {
    if (contact.consent_status === 'opted_in') {
      if (!seen.has(contact.email)) {
        seen.add(contact.email)
        eligibleRecipients.push({
          email: contact.email,
          name: contact.full_name || undefined,
        })
      }
    } else if (contact.consent_status === 'unsubscribed') {
      unsubscribedCount++
    } else if (contact.consent_status === 'not_opted_in') {
      noConsentCount++
    } else {
      otherExcluded++
    }
  }

  const totalCount = pool.length
  const eligibleCount = eligibleRecipients.length
  const excludedCount = totalCount - eligibleCount

  return {
    audienceType,
    totalCount,
    eligibleCount,
    excludedCount,
    eligibleRecipients,
    exclusionReasons: {
      no_consent: noConsentCount,
      unsubscribed: unsubscribedCount,
      other: otherExcluded,
    },
  }
}

/**
 * Returns strictly opted-in, deduplicated recipient addresses for a given audience filter.
 */
export async function getEligibleRecipients(
  audienceType: CampaignAudienceType,
  specificEmails: string[] = []
): Promise<{ email: string; name?: string }[]> {
  const breakdown = await getAudienceBreakdown(audienceType, specificEmails)
  return breakdown.eligibleRecipients
}
