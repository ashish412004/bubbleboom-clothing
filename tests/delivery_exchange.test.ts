import { describe, it, expect } from 'vitest'
import {
  validateIndianPinCode,
  checkPincodeDelivery,
  getProductExchangeSummary,
} from '@/lib/delivery'
import {
  StoreShippingSettings,
  StoreExchangeSettings,
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_EXCHANGE_SETTINGS,
} from '@/lib/settings'

describe('Delivery & Exchange Product Specification Suite', () => {
  describe('1. 6-Digit Indian PIN Code Validation', () => {
    it('accepts valid 6-digit Indian PIN codes', () => {
      expect(validateIndianPinCode('110001')).toBe(true) // Delhi
      expect(validateIndianPinCode('400001')).toBe(true) // Mumbai
      expect(validateIndianPinCode('560001')).toBe(true) // Bengaluru
      expect(validateIndianPinCode('700001')).toBe(true) // Kolkata
      expect(validateIndianPinCode('600001')).toBe(true) // Chennai
      expect(validateIndianPinCode('500001')).toBe(true) // Hyderabad
    })

    it('rejects invalid PIN codes with letters, symbols, or wrong length', () => {
      expect(validateIndianPinCode('')).toBe(false)
      expect(validateIndianPinCode('12345')).toBe(false)
      expect(validateIndianPinCode('1234567')).toBe(false)
      expect(validateIndianPinCode('012345')).toBe(false) // Leading zero not valid in India
      expect(validateIndianPinCode('11000A')).toBe(false)
      expect(validateIndianPinCode('400 01')).toBe(false)
      expect(validateIndianPinCode('ABCDEF')).toBe(false)
    })

    it('returns validation error response for invalid PIN input', () => {
      const result = checkPincodeDelivery('invalid')
      expect(result.valid).toBe(false)
      expect(result.message).toMatch(/valid 6-digit Indian PIN/i)
      expect(result.is_serviceable).toBe(false)
    })
  })

  describe('2. Serviceability & Courier Delivery Rules', () => {
    it('services all India when wildcard * is configured', () => {
      const settings: StoreShippingSettings = {
        ...DEFAULT_SHIPPING_SETTINGS,
        serviceable_pin_codes: ['*'],
      }
      const res = checkPincodeDelivery('110001', settings)
      expect(res.valid).toBe(true)
      expect(res.is_serviceable).toBe(true)
      expect(res.message).toMatch(/serviceable/i)
    })

    it('flags unserviceable pincodes when specific PIN list is configured', () => {
      const settings: StoreShippingSettings = {
        ...DEFAULT_SHIPPING_SETTINGS,
        serviceable_pin_codes: ['110', '400'], // Only Delhi and Mumbai prefixes
      }
      const serviceableRes = checkPincodeDelivery('110001', settings)
      expect(serviceableRes.is_serviceable).toBe(true)

      const unserviceableRes = checkPincodeDelivery('560001', settings)
      expect(unserviceableRes.valid).toBe(true)
      expect(unserviceableRes.is_serviceable).toBe(false)
      expect(unserviceableRes.message).toMatch(/unavailable for PIN 560001/i)
    })
  })

  describe('3. Real Data-Backed Estimated Delivery Dates', () => {
    it('calculates estimated delivery date range including dispatch processing + courier transit', () => {
      const settings: StoreShippingSettings = {
        ...DEFAULT_SHIPPING_SETTINGS,
        delivery_rules_enabled: true,
        processing_days_min: 1,
        processing_days_max: 2,
        transit_days_min: 2,
        transit_days_max: 4,
      }

      const res = checkPincodeDelivery('110001', settings)
      expect(res.estimate_available).toBe(true)
      expect(res.estimated_delivery_formatted).toBeDefined()
      expect(res.estimated_delivery_formatted).toContain('–')
      expect(res.estimated_delivery_min).toBeDefined()
      expect(res.estimated_delivery_max).toBeDefined()
      expect(res.estimate_explanation).toMatch(/includes 1–2 business days dispatch processing \+ 2–4 days courier transit/i)
    })

    it('shows delivery estimate currently unavailable when rules are disabled or missing real data', () => {
      const disabledSettings: StoreShippingSettings = {
        ...DEFAULT_SHIPPING_SETTINGS,
        delivery_rules_enabled: false,
      }

      const res = checkPincodeDelivery('110001', disabledSettings)
      expect(res.is_serviceable).toBe(true)
      expect(res.estimate_available).toBe(false)
      expect(res.estimated_delivery_formatted).toBeUndefined()
    })
  })

  describe('4. Checkout Shipping Rule Consistency', () => {
    it('maintains exact parity with store shipping fees and free delivery threshold', () => {
      const customSettings: StoreShippingSettings = {
        ...DEFAULT_SHIPPING_SETTINGS,
        free_shipping_threshold_paise: 200000, // ₹2,000
        standard_shipping_paise: 15000,        // ₹150
      }

      const res = checkPincodeDelivery('400001', customSettings)
      expect(res.free_shipping_threshold).toBe(2000)
      expect(res.shipping_fee).toBe(150)
    })
  })

  describe('5. COD Availability Per PIN Code & Store Setting', () => {
    it('confirms COD availability when enabled storewide and not excluded for PIN', () => {
      const settings: StoreShippingSettings = {
        ...DEFAULT_SHIPPING_SETTINGS,
        cod_enabled: true,
        cod_fee_paise: 5000, // ₹50
        cod_excluded_pin_codes: ['190001'],
      }

      const normalPin = checkPincodeDelivery('110001', settings)
      expect(normalPin.cod_available).toBe(true)
      expect(normalPin.cod_fee).toBe(50)
      expect(normalPin.cod_message).toMatch(/Cash on Delivery \(COD\) available/i)

      const excludedPin = checkPincodeDelivery('190001', settings)
      expect(excludedPin.cod_available).toBe(false)
      expect(excludedPin.cod_message).toMatch(/Prepaid orders only/i)
    })

    it('disables COD for all pincodes when storewide cod_enabled is false', () => {
      const settings: StoreShippingSettings = {
        ...DEFAULT_SHIPPING_SETTINGS,
        cod_enabled: false,
      }

      const res = checkPincodeDelivery('110001', settings)
      expect(res.cod_available).toBe(false)
      expect(res.cod_message).toMatch(/Prepaid orders only/i)
    })
  })

  describe('6. Exchange Policy Summary & Product Exclusions', () => {
    it('presents configured exchange summary with window, condition, fee, and policy link', () => {
      const settings: StoreExchangeSettings = {
        ...DEFAULT_EXCHANGE_SETTINGS,
        policy_configured: true,
        exchange_window_days: 7,
        item_conditions: 'Unworn with original tags attached',
        applicable_fee_paise: 0,
        policy_page_url: '/returns-refunds',
      }

      const product = { id: 'prod_tee_001', tags: ['streetwear', 'tee'] }
      const exchangeInfo = getProductExchangeSummary(product, settings)

      expect(exchangeInfo.configured).toBe(true)
      expect(exchangeInfo.is_excluded).toBe(false)
      expect(exchangeInfo.window_days).toBe(7)
      expect(exchangeInfo.summary_heading).toMatch(/7-Day Easy Exchange/i)
      expect(exchangeInfo.summary_text).toMatch(/Free size exchange/i)
      expect(exchangeInfo.policy_url).toBe('/returns-refunds')
    })

    it('flags unconfigured exchange policy and provides only fallback policy link without inventing promises', () => {
      const unconfiguredSettings: StoreExchangeSettings = {
        ...DEFAULT_EXCHANGE_SETTINGS,
        policy_configured: false,
      }

      const product = { id: 'prod_tee_002', tags: ['tee'] }
      const exchangeInfo = getProductExchangeSummary(product, unconfiguredSettings)

      expect(exchangeInfo.configured).toBe(false)
      expect(exchangeInfo.summary_heading).toBe('Exchange & Returns')
      expect(exchangeInfo.summary_text).toMatch(/review our official policy/i)
      expect(exchangeInfo.summary_text).not.toMatch(/7-day/i)
      expect(exchangeInfo.summary_text).not.toMatch(/free/i)
      expect(exchangeInfo.policy_url).toBe('/returns-refunds')
    })

    it('supports product-specific exclusions via tags or product ID', () => {
      const settings: StoreExchangeSettings = {
        ...DEFAULT_EXCHANGE_SETTINGS,
        policy_configured: true,
        excluded_tags: ['final-sale', 'non-exchangeable'],
        excluded_product_ids: ['prod_archive_099'],
      }

      // 1. Tag exclusion
      const finalSaleProduct = { id: 'prod_tee_003', tags: ['final-sale', 'oversized'] }
      const tagExclusion = getProductExchangeSummary(finalSaleProduct, settings)
      expect(tagExclusion.is_excluded).toBe(true)
      expect(tagExclusion.summary_text).toMatch(/Final Sale/i)

      // 2. ID exclusion
      const idExcludedProduct = { id: 'prod_archive_099', tags: ['hoodie'] }
      const idExclusion = getProductExchangeSummary(idExcludedProduct, settings)
      expect(idExclusion.is_excluded).toBe(true)
      expect(idExclusion.summary_text).toMatch(/not eligible for standard size exchanges/i)

      // 3. Normal product is eligible
      const normalProduct = { id: 'prod_tee_004', tags: ['hoodie', 'new-drop'] }
      const normalRes = getProductExchangeSummary(normalProduct, settings)
      expect(normalRes.is_excluded).toBe(false)
    })
  })
})
