import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import {
  CustomerDirectoryEntry,
  CampaignAudienceType,
  MarketingConsentStatus,
} from './types'

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

  // Process Auth Users
  for (const user of authUsers) {
    const rawEmail = user.email
    if (!rawEmail || !rawEmail.includes('@')) continue
    const email = rawEmail.trim().toLowerCase()

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
      is_registered_customer: true,
      is_newsletter_subscriber: false,
      consent_status: 'not_opted_in',
      marketing_consent: false,
      marketing_consent_at: null,
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
    } else {
      emailMap.set(email, {
        id: prof.id,
        email,
        full_name: prof.full_name || null,
        created_at: prof.created_at || new Date().toISOString(),
        last_sign_in_at: null,
        provider: 'email',
        is_registered_customer: true,
        is_newsletter_subscriber: false,
        consent_status: hasConsent ? 'opted_in' : 'not_opted_in',
        marketing_consent: hasConsent,
        marketing_consent_at: prof.marketing_consent_at || null,
      })
    }
  }

  // Merge Newsletter Subscribers
  for (const sub of newsletterSubs) {
    const rawEmail = sub.email
    if (!rawEmail || !rawEmail.includes('@')) continue
    const email = rawEmail.trim().toLowerCase()

    const isActive = sub.is_active !== false && sub.status !== 'unsubscribed'
    const isUnsubscribed = sub.is_active === false || sub.status === 'unsubscribed' || Boolean(sub.unsubscribed_at)

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
        is_registered_customer: false,
        is_newsletter_subscriber: true,
        consent_status: status,
        marketing_consent: status === 'opted_in',
        marketing_consent_at: sub.subscribed_at || sub.created_at || null,
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
 * Returns strictly opted-in, deduplicated recipient addresses for a given audience filter.
 * Never includes unconfirmed, not_opted_in, or unsubscribed users.
 */
export async function getEligibleRecipients(
  audienceType: CampaignAudienceType
): Promise<{ email: string; name?: string }[]> {
  const { entries } = await getCustomerEmailDirectory()

  const eligible = entries.filter((entry) => {
    if (entry.consent_status !== 'opted_in') return false

    if (audienceType === 'all_opted_in') return true
    if (audienceType === 'newsletter_only') return entry.is_newsletter_subscriber
    if (audienceType === 'customers_opted_in') return entry.is_registered_customer

    return true
  })

  // Deduplicate by email just in case
  const seen = new Set<string>()
  const result: { email: string; name?: string }[] = []

  for (const item of eligible) {
    if (!seen.has(item.email)) {
      seen.add(item.email)
      result.push({
        email: item.email,
        name: item.full_name || undefined,
      })
    }
  }

  return result
}
