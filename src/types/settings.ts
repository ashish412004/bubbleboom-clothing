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
  // Delivery timing & estimate configuration
  delivery_rules_enabled: boolean
  processing_days_min: number
  processing_days_max: number
  transit_days_min: number
  transit_days_max: number
  cod_excluded_pin_codes: string[]
}

export interface StoreExchangeSettings {
  policy_configured: boolean
  exchange_window_days: number
  item_conditions: string
  applicable_fee_paise: number
  excluded_categories: string[]
  excluded_product_ids: string[]
  excluded_tags: string[]
  policy_page_url: string
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
  support_email: 'bubbleboomstore2026@gmail.com',
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
  delivery_rules_enabled: true,
  processing_days_min: 1,
  processing_days_max: 2,
  transit_days_min: 2,
  transit_days_max: 4,
  cod_excluded_pin_codes: [],
}

export const DEFAULT_EXCHANGE_SETTINGS: StoreExchangeSettings = {
  policy_configured: true,
  exchange_window_days: 7,
  item_conditions: 'Unworn, unwashed, and undamaged with original tags intact',
  applicable_fee_paise: 0, // Free exchange
  excluded_categories: [],
  excluded_product_ids: [],
  excluded_tags: ['final-sale', 'non-exchangeable', 'archive-sale'],
  policy_page_url: '/returns-refunds',
}

export const DEFAULT_ORDER_SETTINGS: StoreOrderSettings = {
  reservation_hold_minutes: 15,
  return_window_days: 7,
  cancellation_allowed_states: ['pending', 'confirmed'],
  return_allowed_states: ['delivered'],
}
