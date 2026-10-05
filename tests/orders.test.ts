import { describe, it, expect } from 'vitest'
import {
  validateIndianPhone,
  validateIndianPinCode,
  isValidOrderStatusTransition,
  OrderStatus,
} from '@/lib/orders'

describe('Order Rules, Indian Address Verification & State Machine', () => {
  describe('Indian Phone Number Validation', () => {
    it('accepts standard 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
      expect(validateIndianPhone('9876543210')).toBe(true)
      expect(validateIndianPhone('8123456789')).toBe(true)
      expect(validateIndianPhone('7000012345')).toBe(true)
      expect(validateIndianPhone('6234567890')).toBe(true)
    })

    it('accepts numbers prefixed with +91 or 91', () => {
      expect(validateIndianPhone('+919876543210')).toBe(true)
      expect(validateIndianPhone('919876543210')).toBe(true)
      expect(validateIndianPhone('+91 98765 43210')).toBe(true)
    })

    it('rejects invalid numbers, non-Indian prefixes, or landline prefixes', () => {
      expect(validateIndianPhone('1234567890')).toBe(false) // Starts with 1
      expect(validateIndianPhone('5876543210')).toBe(false) // Starts with 5
      expect(validateIndianPhone('987654321')).toBe(false)  // 9 digits
      expect(validateIndianPhone('987654321000')).toBe(false) // 12 digits not 91
      expect(validateIndianPhone('abcd123456')).toBe(false)
    })
  })

  describe('Indian PIN Code Validation', () => {
    it('accepts valid 6-digit postal PIN codes not starting with 0', () => {
      expect(validateIndianPinCode('400001')).toBe(true) // Mumbai
      expect(validateIndianPinCode('110001')).toBe(true) // Delhi
      expect(validateIndianPinCode('560001')).toBe(true) // Bengaluru
      expect(validateIndianPinCode('700001')).toBe(true) // Kolkata
    })

    it('rejects invalid PIN codes starting with 0 or with incorrect length', () => {
      expect(validateIndianPinCode('011001')).toBe(false) // Starts with 0
      expect(validateIndianPinCode('40001')).toBe(false)  // 5 digits
      expect(validateIndianPinCode('4000001')).toBe(false) // 7 digits
      expect(validateIndianPinCode('400 01')).toBe(false)
      expect(validateIndianPinCode('ABCDEF')).toBe(false)
    })
  })

  describe('Fulfillment State Machine Transitions', () => {
    it('allows valid forward fulfillment steps', () => {
      expect(isValidOrderStatusTransition('pending', 'confirmed')).toBe(true)
      expect(isValidOrderStatusTransition('confirmed', 'packed')).toBe(true)
      expect(isValidOrderStatusTransition('packed', 'shipped')).toBe(true)
      expect(isValidOrderStatusTransition('shipped', 'out_for_delivery')).toBe(true)
      expect(isValidOrderStatusTransition('out_for_delivery', 'delivered')).toBe(true)
      expect(isValidOrderStatusTransition('delivered', 'return_requested')).toBe(true)
    })

    it('allows cancellation only before shipment', () => {
      expect(isValidOrderStatusTransition('pending', 'cancelled')).toBe(true)
      expect(isValidOrderStatusTransition('confirmed', 'cancelled')).toBe(true)
      expect(isValidOrderStatusTransition('packed', 'cancelled')).toBe(true)

      // Once shipped, order CANNOT be cancelled (must go through delivery & return)
      expect(isValidOrderStatusTransition('shipped', 'cancelled')).toBe(false)
      expect(isValidOrderStatusTransition('out_for_delivery', 'cancelled')).toBe(false)
      expect(isValidOrderStatusTransition('delivered', 'cancelled')).toBe(false)
    })

    it('strictly prohibits skipping steps or illegal backward jumps', () => {
      expect(isValidOrderStatusTransition('pending', 'delivered')).toBe(false) // Cannot skip
      expect(isValidOrderStatusTransition('shipped', 'confirmed')).toBe(false) // Cannot rewind
      expect(isValidOrderStatusTransition('delivered', 'pending')).toBe(false)
      expect(isValidOrderStatusTransition('cancelled', 'confirmed')).toBe(false) // Terminal
      expect(isValidOrderStatusTransition('refunded', 'delivered')).toBe(false)  // Terminal
    })
  })

  describe('Order Identifier Resolution', () => {
    it('distinguishes UUID format from customer-facing Order Number', () => {
      const isUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const validUuid = '7937e508-36d1-4ce3-a771-a035dec93e89'
      const customerOrderNum = 'BB-20261005-4774'

      expect(isUuidRegex.test(validUuid)).toBe(true)
      expect(isUuidRegex.test(customerOrderNum)).toBe(false)
    })
  })
})
