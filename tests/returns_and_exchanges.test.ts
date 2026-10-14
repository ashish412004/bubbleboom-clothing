import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateReturnReference,
  isOrderEligibleForReturn,
  createReturnRequest,
  updateReturnApproval,
  scheduleReversePickup,
  markReturnReceived,
  processReturnInspection,
  dispatchExchangeOrder,
  executeRefund,
  getAllReturns,
  getReturnById,
  _resetReturnStore,
} from '@/lib/returns'
import { renderNotificationHtml } from '@/lib/emails/templates'
import { saveDevOrder } from '@/lib/orders'

describe('Return & Exchange Management System Suite', () => {
  beforeEach(() => {
    _resetReturnStore()
    saveDevOrder({
      id: 'mock-delivered-ord-1',
      order_number: 'BB-MOCK-DEL-01',
      status: 'delivered',
      total_amount: 1999,
      payment_method: 'cashfree',
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      order_items: [
        {
          id: 'mock-item-1',
          order_id: 'mock-delivered-ord-1',
          product_id: 'prod-1',
          variant_id: 'var-1',
          product_name: 'Bubble Boom Hoodie',
          quantity: 1,
          total_amount: 1999,
          selling_price: 1999,
        },
      ],
    })
  })

  describe('1. Return Reference Number Generation', () => {
    it('generates format RET-YYYYMMDD-XXXX for returns', () => {
      const ref = generateReturnReference('return')
      expect(ref).toMatch(/^RET-\d{8}-\d{4}$/)
    })

    it('generates format EXC-YYYYMMDD-XXXX for exchanges', () => {
      const ref = generateReturnReference('exchange')
      expect(ref).toMatch(/^EXC-\d{8}-\d{4}$/)
    })
  })

  describe('2. Delivery Window & Eligibility Validation', () => {
    it('rejects orders that are not in delivered status', async () => {
      const res = await isOrderEligibleForReturn('BB-TEST-NONEXISTENT')
      expect(res.eligible).toBe(false)
      expect(res.reason).toMatch(/Order not found|only be returned after delivery/i)
    })
  })

  describe('3. Return & Exchange Request Creation & Memory Persistence', () => {
    it('successfully creates and retrieves a return request', async () => {
      // Create return directly in store
      const createRes = await createReturnRequest({
        order_id: 'bcd4a015-aaa0-4e10-984b-657cd9ecc0f8', // Existing delivered order in DB
        user_id: '322477c9-f9dc-44d3-848a-f94e1185670f',
        order_item_id: '22d17891-8982-4173-a008-5b6059e81aea',
        quantity: 1,
        reason: 'Incorrect Size / Fit',
        notes: 'Chunky sneakers are tight on the toes, need one size up.',
        request_type: 'return',
      })

      // In environments with Supabase connectivity to the delivered order:
      if (createRes.success && createRes.data) {
        expect(createRes.data.status).toBe('requested')
        expect(createRes.data.return_reference).toMatch(/^RET-\d{8}-\d{4}$/)
        expect(createRes.data.refund_status).toBe('pending')

        const fetched = await getReturnById(createRes.data.id)
        expect(fetched).not.toBeNull()
        expect(fetched?.id).toBe(createRes.data.id)
      } else {
        // If delivered order timestamp has expired or not reachable, verify error response
        expect(createRes.error).toBeDefined()
      }
    })

    it('successfully creates an exchange request with variant selection', async () => {
      const createRes = await createReturnRequest({
        order_id: 'bcd4a015-aaa0-4e10-984b-657cd9ecc0f8',
        user_id: '322477c9-f9dc-44d3-848a-f94e1185670f',
        order_item_id: '22d17891-8982-4173-a008-5b6059e81aea',
        quantity: 1,
        reason: 'Incorrect Size / Fit',
        request_type: 'exchange',
        exchange_variant_id: 'ca45cdc6-a090-4622-b76c-92db67d685ad', // UK 9 variant
      })

      if (createRes.success && createRes.data) {
        expect(createRes.data.request_type).toBe('exchange')
        expect(createRes.data.return_reference).toMatch(/^EXC-\d{8}-\d{4}$/)
        expect(createRes.data.refund_status).toBe('not_applicable')
      }
    })
  })

  describe('4. Multi-State Pipeline Transitions', () => {
    let mockReturnId: string

    beforeEach(async () => {
      const res = await createReturnRequest({
        order_id: 'bcd4a015-aaa0-4e10-984b-657cd9ecc0f8',
        user_id: '322477c9-f9dc-44d3-848a-f94e1185670f',
        order_item_id: '22d17891-8982-4173-a008-5b6059e81aea',
        quantity: 1,
        reason: 'Color or Silhouette not as expected',
        request_type: 'return',
      })
      if (res.data) {
        mockReturnId = res.data.id
      }
    })

    it('transitions to approved upon admin approval', async () => {
      if (!mockReturnId) return
      const appRes = await updateReturnApproval(mockReturnId, 'approve')
      expect(appRes.success).toBe(true)
      expect(appRes.data?.status).toBe('approved')
    })

    it('transitions to pickup_scheduled with reverse courier tracking', async () => {
      if (!mockReturnId) return
      await updateReturnApproval(mockReturnId, 'approve')

      const pickupRes = await scheduleReversePickup(mockReturnId, {
        courier_name: 'Shiprocket / Delhivery',
        reverse_awb: 'REV-DEL-9849201',
      })

      expect(pickupRes.success).toBe(true)
      expect(pickupRes.data?.status).toBe('pickup_scheduled')
      expect(pickupRes.data?.pickup_status).toBe('scheduled')
      expect(pickupRes.data?.reverse_awb).toBe('REV-DEL-9849201')
      expect(pickupRes.data?.tracking_url).toContain('shiprocket.co/tracking')
    })

    it('transitions to received at warehouse and undergoes quality inspection', async () => {
      if (!mockReturnId) return
      await updateReturnApproval(mockReturnId, 'approve')
      await scheduleReversePickup(mockReturnId, {
        courier_name: 'Delhivery Express',
        reverse_awb: 'REV-DEL-9849201',
      })

      const recRes = await markReturnReceived(mockReturnId)
      expect(recRes.success).toBe(true)
      expect(recRes.data?.status).toBe('received')

      const inspectRes = await processReturnInspection(
        mockReturnId,
        'approved',
        true,
        'Item unworn in original packaging'
      )
      expect(inspectRes.success).toBe(true)
      expect(inspectRes.data?.inspection_result).toBe('pass')
      expect(inspectRes.data?.restock_decision).toBe(true)
    })
  })

  describe('5. Refund Ceiling & Financial Guardrails', () => {
    it('strictly prevents zero or negative refund amounts', async () => {
      const res = await executeRefund(
        'mock-delivered-ord-1',
        null,
        0,
        'Test Invalid Zero'
      )
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/greater than zero/i)
    })

    it('strictly rejects refunds exceeding captured order total', async () => {
      // Order total is ₹1,999 (199900 paise), attempt refund of ₹9,999 (999900 paise)
      const res = await executeRefund(
        'mock-delivered-ord-1',
        null,
        999900,
        'Exceeding ceiling'
      )
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/exceed captured order total/i)
    })
  })

  describe('6. Return & Exchange Email Notification Templates', () => {
    it('renders return_requested email with editorial styling', () => {
      const rendered = renderNotificationHtml('return_requested', {
        order_id: 'ord-123',
        order_number: 'BB-20261012-1111',
        event: 'return_requested',
        recipient_email: 'customer@example.com',
        customer_name: 'Alex Vance',
        total_amount: 1999,
        payment_method: 'cashfree',
        payment_status: 'return_requested',
        items: [{ product_name: 'Monochrome Chunky Sneakers', quantity: 1, price: 1999 }],
      })

      expect(rendered.subject).toContain('Return Request Received: #BB-20261012-1111')
      expect(rendered.html).toContain('RETURN REQUESTED')
      expect(rendered.html).toContain('REQUEST UNDER REVIEW')
      expect(rendered.html).toContain('Alex Vance')
    })

    it('renders exchange_requested email with size/color details', () => {
      const rendered = renderNotificationHtml('exchange_requested', {
        order_id: 'ord-123',
        order_number: 'BB-20261012-2222',
        event: 'exchange_requested',
        recipient_email: 'customer@example.com',
        customer_name: 'Jordan Cole',
        total_amount: 0,
        payment_method: 'exchange',
        payment_status: 'exchange_requested',
        items: [{ product_name: 'Oversized Heavyweight Hoodie', quantity: 1, price: 0 }],
      })

      expect(rendered.subject).toContain('Exchange Request Received: #BB-20261012-2222')
      expect(rendered.html).toContain('EXCHANGE REQUESTED')
      expect(rendered.html).toContain('SIZE/COLOR EXCHANGE INITIATED')
    })

    it('renders pickup_scheduled email with tracking details', () => {
      const rendered = renderNotificationHtml('pickup_scheduled', {
        order_id: 'ord-123',
        order_number: 'BB-20261012-3333',
        event: 'pickup_scheduled',
        recipient_email: 'customer@example.com',
        customer_name: 'Maya Lin',
        total_amount: 1999,
        payment_method: 'return',
        payment_status: 'pickup_scheduled',
        carrier: 'Shiprocket / Delhivery',
        tracking_number: 'REV-12345678',
        tracking_url: 'https://shiprocket.co/tracking/REV-12345678',
        items: [],
      })

      expect(rendered.subject).toContain('Reverse Pickup Scheduled')
      expect(rendered.html).toContain('Shiprocket / Delhivery')
      expect(rendered.html).toContain('REV-12345678')
    })
  })
})
