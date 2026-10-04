import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export interface StoreGeneralSettings {
  brand_name: string
  tagline: string
  hero_title: string
  hero_description: string
  hero_cta_primary: string
  hero_cta_secondary: string
  brand_statement: string
  support_email: string
  support_phone: string
  currency: string
  country: string
  announcement_text?: string
  announcement_link?: string
  announcement_active?: boolean
}

export interface StoreShippingSettings {
  free_shipping_threshold_paise: number
  standard_shipping_paise: number
  express_shipping_paise: number
  serviceable_pin_codes: string[]
  cod_enabled: boolean
  cod_fee_paise: number
  max_cod_amount_paise: number
}

export interface StoreOrderSettings {
  reservation_hold_minutes: number
  return_window_days: number
  cancellation_allowed_states: string[]
  return_allowed_states: string[]
}

export const DEFAULT_GENERAL_SETTINGS: StoreGeneralSettings = {
  brand_name: 'BUBBLE BOOM',
  tagline: 'WEAR THE BOOM',
  hero_title: 'WEAR THE BOOM.',
  hero_description: 'Every style. Every mood. Make it yours.',
  hero_cta_primary: 'SHOP NOW',
  hero_cta_secondary: 'EXPLORE COLLECTIONS',
  brand_statement: 'YOUR STYLE. YOUR RULES.',
  support_email: 'support@bubbleboom.in',
  support_phone: '+91 98765 43210',
  currency: 'INR',
  country: 'India',
  announcement_text: 'FREE SHIPPING ON ALL ORDERS ABOVE ₹1,499 | NEW DROPS EVERY FRIDAY',
  announcement_link: '/shop',
  announcement_active: true,
}

export const DEFAULT_SHIPPING_SETTINGS: StoreShippingSettings = {
  free_shipping_threshold_paise: 149900, // ₹1,499 in paise
  standard_shipping_paise: 9900,         // ₹99 in paise
  express_shipping_paise: 19900,        // ₹199 in paise
  serviceable_pin_codes: ['*'],         // All India or configured PINs
  cod_enabled: true,
  cod_fee_paise: 5000,                  // ₹50 in paise
  max_cod_amount_paise: 500000,         // ₹5,000 maximum for COD
}

export const DEFAULT_ORDER_SETTINGS: StoreOrderSettings = {
  reservation_hold_minutes: 15,
  return_window_days: 7,
  cancellation_allowed_states: ['pending', 'confirmed'],
  return_allowed_states: ['delivered'],
}

export async function getStoreSettings<T = any>(key: 'general' | 'shipping' | 'orders' | 'banners' | string): Promise<T> {
  if (!isSupabaseConfigured()) {
    if (key === 'general') return DEFAULT_GENERAL_SETTINGS as unknown as T
    if (key === 'shipping') return DEFAULT_SHIPPING_SETTINGS as unknown as T
    if (key === 'orders') return DEFAULT_ORDER_SETTINGS as unknown as T
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
      return {} as T
    }

    return data.value as unknown as T
  } catch (err) {
    if (key === 'general') return DEFAULT_GENERAL_SETTINGS as unknown as T
    if (key === 'shipping') return DEFAULT_SHIPPING_SETTINGS as unknown as T
    if (key === 'orders') return DEFAULT_ORDER_SETTINGS as unknown as T
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
