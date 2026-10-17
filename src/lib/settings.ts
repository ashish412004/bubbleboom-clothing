import { createClient as createServerClient, createServiceClient, createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import {
  StoreGeneralSettings,
  StoreShippingSettings,
  StoreExchangeSettings,
  StoreOrderSettings,
  StoreNotificationSettings,
  StoreSocialSettings,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_EXCHANGE_SETTINGS,
  DEFAULT_ORDER_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SOCIAL_SETTINGS,
} from '@/types/settings'

export * from '@/types/settings'

const settingsCache = new Map<string, { value: any; timestamp: number }>()
const SETTINGS_TTL_MS = 60 * 1000

export function clearStoreSettingsCache(key?: string) {
  if (key) {
    settingsCache.delete(key)
  } else {
    settingsCache.clear()
  }
}

export async function getStoreSettings<T = any>(key: 'general' | 'shipping' | 'orders' | 'exchange' | 'banners' | string): Promise<T> {
  const cached = settingsCache.get(key)
  if (cached && Date.now() - cached.timestamp < SETTINGS_TTL_MS) {
    return cached.value as T
  }

  if (!isSupabaseConfigured()) {
    let fallback: any = {}
    if (key === 'general') fallback = DEFAULT_GENERAL_SETTINGS
    else if (key === 'shipping') fallback = DEFAULT_SHIPPING_SETTINGS
    else if (key === 'orders') fallback = DEFAULT_ORDER_SETTINGS
    else if (key === 'exchange') fallback = DEFAULT_EXCHANGE_SETTINGS
    else if (key === 'notifications' || key === 'email_notifications') fallback = DEFAULT_NOTIFICATION_SETTINGS
    else if (key === 'social') fallback = DEFAULT_SOCIAL_SETTINGS
    settingsCache.set(key, { value: fallback, timestamp: Date.now() })
    return fallback as unknown as T
  }

  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (error || !data) {
      let fallback: any = {}
      if (key === 'general') fallback = DEFAULT_GENERAL_SETTINGS
      else if (key === 'shipping') fallback = DEFAULT_SHIPPING_SETTINGS
      else if (key === 'orders') fallback = DEFAULT_ORDER_SETTINGS
      else if (key === 'exchange') fallback = DEFAULT_EXCHANGE_SETTINGS
      else if (key === 'notifications' || key === 'email_notifications') fallback = DEFAULT_NOTIFICATION_SETTINGS
      else if (key === 'social') fallback = DEFAULT_SOCIAL_SETTINGS
      settingsCache.set(key, { value: fallback, timestamp: Date.now() })
      return fallback as unknown as T
    }

    let finalVal: any = data.value
    // Merge defaults for missing properties if stored value is partial
    if (key === 'shipping') {
      finalVal = { ...DEFAULT_SHIPPING_SETTINGS, ...(data.value as Record<string, any>) }
    } else if (key === 'exchange') {
      finalVal = { ...DEFAULT_EXCHANGE_SETTINGS, ...(data.value as Record<string, any>) }
    } else if (key === 'notifications' || key === 'email_notifications') {
      finalVal = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.value as Record<string, any>) }
    } else if (key === 'social') {
      finalVal = { ...DEFAULT_SOCIAL_SETTINGS, ...(data.value as Record<string, any>) }
    }

    settingsCache.set(key, { value: finalVal, timestamp: Date.now() })
    return finalVal as unknown as T
  } catch (err) {
    let fallback: any = {}
    if (key === 'general') fallback = DEFAULT_GENERAL_SETTINGS
    else if (key === 'shipping') fallback = DEFAULT_SHIPPING_SETTINGS
    else if (key === 'orders') fallback = DEFAULT_ORDER_SETTINGS
    else if (key === 'exchange') fallback = DEFAULT_EXCHANGE_SETTINGS
    else if (key === 'notifications' || key === 'email_notifications') fallback = DEFAULT_NOTIFICATION_SETTINGS
    else if (key === 'social') fallback = DEFAULT_SOCIAL_SETTINGS
    return fallback as unknown as T
  }
}

export async function updateStoreSettings(key: string, value: Record<string, any>, adminUserId?: string) {
  clearStoreSettingsCache(key)

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('store_settings')
    .upsert({
      key,
      value: value as any,
      updated_at: new Date().toISOString(),
      updated_by: adminUserId || null,
    })
    .select()
    .single()

  if (error) {
    console.error(`Error updating store settings [${key}]:`, error)
    return { error: error.message }
  }

  return { data }
}

export async function getSocialSettings(): Promise<StoreSocialSettings> {
  return getStoreSettings<StoreSocialSettings>('social')
}

export * from '@/lib/whatsapp'

