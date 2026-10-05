import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import {
  StoreGeneralSettings,
  StoreShippingSettings,
  StoreExchangeSettings,
  StoreOrderSettings,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_EXCHANGE_SETTINGS,
  DEFAULT_ORDER_SETTINGS,
} from '@/types/settings'

export * from '@/types/settings'

export async function getStoreSettings<T = any>(key: 'general' | 'shipping' | 'orders' | 'exchange' | 'banners' | string): Promise<T> {
  if (!isSupabaseConfigured()) {
    if (key === 'general') return DEFAULT_GENERAL_SETTINGS as unknown as T
    if (key === 'shipping') return DEFAULT_SHIPPING_SETTINGS as unknown as T
    if (key === 'orders') return DEFAULT_ORDER_SETTINGS as unknown as T
    if (key === 'exchange') return DEFAULT_EXCHANGE_SETTINGS as unknown as T
    return {} as T
  }

  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (error || !data) {
      if (key === 'general') return DEFAULT_GENERAL_SETTINGS as unknown as T
      if (key === 'shipping') return DEFAULT_SHIPPING_SETTINGS as unknown as T
      if (key === 'orders') return DEFAULT_ORDER_SETTINGS as unknown as T
      if (key === 'exchange') return DEFAULT_EXCHANGE_SETTINGS as unknown as T
      return {} as T
    }

    // Merge defaults for missing properties if stored value is partial
    if (key === 'shipping') {
      return { ...DEFAULT_SHIPPING_SETTINGS, ...(data.value as Record<string, any>) } as unknown as T
    }
    if (key === 'exchange') {
      return { ...DEFAULT_EXCHANGE_SETTINGS, ...(data.value as Record<string, any>) } as unknown as T
    }

    return data.value as unknown as T
  } catch (err) {
    if (key === 'general') return DEFAULT_GENERAL_SETTINGS as unknown as T
    if (key === 'shipping') return DEFAULT_SHIPPING_SETTINGS as unknown as T
    if (key === 'orders') return DEFAULT_ORDER_SETTINGS as unknown as T
    if (key === 'exchange') return DEFAULT_EXCHANGE_SETTINGS as unknown as T
    return {} as T
  }
}

export async function updateStoreSettings(key: string, value: Record<string, any>, adminUserId?: string) {
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
