import {
  StoreShippingSettings,
  StoreExchangeSettings,
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_EXCHANGE_SETTINGS,
} from '@/types/settings'

export interface PincodeDeliveryResult {
  valid: boolean
  is_serviceable: boolean
  pincode: string
  message: string
  shipping_fee: number
  free_shipping_threshold: number
  cod_available: boolean
  cod_fee: number
  cod_message: string
  estimate_available: boolean
  estimated_delivery_min?: string
  estimated_delivery_max?: string
  estimated_delivery_formatted?: string
  estimate_explanation?: string
}

export interface ProductExchangeInfo {
  configured: boolean
  is_excluded: boolean
  window_days: number
  conditions: string
  fee_paise: number
  policy_url: string
  summary_heading: string
  summary_text: string
  link_label: string
}

/**
 * Validates 6-digit Indian Postal Identification Number (PIN)
 * Must be 6 digits, first digit between 1 and 9.
 */
export function validateIndianPinCode(pin: string): boolean {
  if (!pin || typeof pin !== 'string') return false
  return /^[1-9][0-9]{5}$/.test(pin.trim())
}

/**
 * Checks serviceability, real delivery timeline, shipping charges, and COD rules
 * for a 6-digit Indian PIN code against admin store settings.
 */
export function checkPincodeDelivery(
  pinCode: string,
  shippingSettings: StoreShippingSettings = DEFAULT_SHIPPING_SETTINGS
): PincodeDeliveryResult {
  const cleanPin = (pinCode || '').trim()

  if (!validateIndianPinCode(cleanPin)) {
    return {
      valid: false,
      is_serviceable: false,
      pincode: cleanPin,
      message: 'Please enter a valid 6-digit Indian PIN code.',
      shipping_fee: Math.round(shippingSettings.standard_shipping_paise / 100),
      free_shipping_threshold: Math.round(shippingSettings.free_shipping_threshold_paise / 100),
      cod_available: false,
      cod_fee: Math.round(shippingSettings.cod_fee_paise / 100),
      cod_message: 'COD availability unconfirmed.',
      estimate_available: false,
    }
  }

  // 1. Serviceability Check against configured rules
  const serviceableCodes = shippingSettings.serviceable_pin_codes || ['*']
  const isWildcardAllIndia = serviceableCodes.includes('*')
  const isServiceable =
    isWildcardAllIndia ||
    serviceableCodes.some((code) => cleanPin === code || cleanPin.startsWith(code))

  const standardShippingFee = Math.round(shippingSettings.standard_shipping_paise / 100)
  const freeShippingThreshold = Math.round(shippingSettings.free_shipping_threshold_paise / 100)
  const codFee = Math.round(shippingSettings.cod_fee_paise / 100)

  if (!isServiceable) {
    return {
      valid: true,
      is_serviceable: false,
      pincode: cleanPin,
      message: `Delivery is currently unavailable for PIN ${cleanPin}.`,
      shipping_fee: standardShippingFee,
      free_shipping_threshold: freeShippingThreshold,
      cod_available: false,
      cod_fee: codFee,
      cod_message: 'COD not available for this area.',
      estimate_available: false,
    }
  }

  // 2. COD Availability Check
  const excludedCodPins = shippingSettings.cod_excluded_pin_codes || []
  const isCodExcluded = excludedCodPins.includes(cleanPin)
  const isCodAvailable = Boolean(shippingSettings.cod_enabled && !isCodExcluded)

  const codMessage = isCodAvailable
    ? codFee > 0
      ? `Cash on Delivery (COD) available (₹${codFee} convenience fee).`
      : 'Cash on Delivery (COD) available with no extra fees.'
    : 'Prepaid orders only (Cards, UPI, NetBanking). COD is not enabled for this location.'

  // 3. Delivery Estimate (Backed by real configured processing and transit rules)
  // "If no delivery rules or integration exist, show “Delivery estimate currently unavailable.” Never fabricate availability or dates."
  if (
    !shippingSettings.delivery_rules_enabled ||
    !shippingSettings.processing_days_min ||
    !shippingSettings.transit_days_min
  ) {
    return {
      valid: true,
      is_serviceable: true,
      pincode: cleanPin,
      message: `PIN ${cleanPin} is serviceable!`,
      shipping_fee: standardShippingFee,
      free_shipping_threshold: freeShippingThreshold,
      cod_available: isCodAvailable,
      cod_fee: codFee,
      cod_message: codMessage,
      estimate_available: false,
    }
  }

  const now = new Date()
  const minTotalDays = shippingSettings.processing_days_min + shippingSettings.transit_days_min
  const maxTotalDays = Math.max(
    minTotalDays,
    shippingSettings.processing_days_max + shippingSettings.transit_days_max
  )

  const minDeliveryDate = new Date(now)
  minDeliveryDate.setDate(now.getDate() + minTotalDays)

  const maxDeliveryDate = new Date(now)
  maxDeliveryDate.setDate(now.getDate() + maxTotalDays)

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }

  const minFormatted = minDeliveryDate.toLocaleDateString('en-IN', dateOptions)
  const maxFormatted = maxDeliveryDate.toLocaleDateString('en-IN', dateOptions)
  const estimatedDeliveryRange = `${minFormatted} – ${maxFormatted}`

  const explanation = `Includes ${shippingSettings.processing_days_min}–${shippingSettings.processing_days_max} business days dispatch processing + ${shippingSettings.transit_days_min}–${shippingSettings.transit_days_max} days courier transit.`

  return {
    valid: true,
    is_serviceable: true,
    pincode: cleanPin,
    message: `PIN ${cleanPin} is serviceable.`,
    shipping_fee: standardShippingFee,
    free_shipping_threshold: freeShippingThreshold,
    cod_available: isCodAvailable,
    cod_fee: codFee,
    cod_message: codMessage,
    estimate_available: true,
    estimated_delivery_min: minDeliveryDate.toISOString(),
    estimated_delivery_max: maxDeliveryDate.toISOString(),
    estimated_delivery_formatted: estimatedDeliveryRange,
    estimate_explanation: explanation,
  }
}

/**
 * Returns authoritative exchange policy details for a given product
 */
export function getProductExchangeSummary(
  product: {
    id: string
    tags?: string[] | null
    category_id?: string | null
  },
  exchangeSettings: StoreExchangeSettings = DEFAULT_EXCHANGE_SETTINGS
): ProductExchangeInfo {
  const policyUrl = exchangeSettings.policy_page_url || '/returns-refunds'

  // If policy is not configured, do not invent promises: show fallback link
  if (!exchangeSettings.policy_configured) {
    return {
      configured: false,
      is_excluded: false,
      window_days: 0,
      conditions: '',
      fee_paise: 0,
      policy_url: policyUrl,
      summary_heading: 'Exchange & Returns',
      summary_text: 'For exchange eligibility, inspection procedures, and terms, please review our official policy.',
      link_label: 'View Exchange Policy',
    }
  }

  // Check product-specific exclusions
  const tags = (product.tags || []).map((t) => t.toLowerCase())
  const excludedTags = (exchangeSettings.excluded_tags || []).map((t) => t.toLowerCase())
  const hasExcludedTag = tags.some((t) => excludedTags.includes(t))

  const excludedIds = exchangeSettings.excluded_product_ids || []
  const isExcludedId = excludedIds.includes(product.id)

  const isExcluded = hasExcludedTag || isExcludedId

  if (isExcluded) {
    return {
      configured: true,
      is_excluded: true,
      window_days: 0,
      conditions: 'Final Sale / Archive Drop item',
      fee_paise: exchangeSettings.applicable_fee_paise || 0,
      policy_url: policyUrl,
      summary_heading: 'Exchange Policy',
      summary_text: 'This item is marked Final Sale or Archive Exclusive and is not eligible for standard size exchanges or returns.',
      link_label: 'View Exchange Policy',
    }
  }

  const windowDays = exchangeSettings.exchange_window_days || 7
  const feePaise = exchangeSettings.applicable_fee_paise || 0
  const feeText = feePaise === 0 ? 'Free size exchange' : `₹${Math.round(feePaise / 100)} reverse pickup fee`

  return {
    configured: true,
    is_excluded: false,
    window_days: windowDays,
    conditions: exchangeSettings.item_conditions || 'Unworn, unwashed, and undamaged with original tags intact',
    fee_paise: feePaise,
    policy_url: policyUrl,
    summary_heading: `${windowDays}-Day Easy Exchange`,
    summary_text: `${windowDays} days from delivery. ${feeText}. Items must be unworn with original tags attached.`,
    link_label: 'View Exchange Policy',
  }
}
