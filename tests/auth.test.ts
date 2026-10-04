import { describe, it, expect } from 'vitest'

describe('Customer Ownership, Admin RBAC & Secure Guest Access', () => {
  interface OrderRecord {
    id: string
    order_number: string
    user_id: string | null
    guest_email: string | null
    guest_phone: string | null
  }

  function canAccessOrder(
    order: OrderRecord,
    requester: { userId?: string; isAdmin: boolean; verifier?: string }
  ): boolean {
    // 1. Admin can access all orders
    if (requester.isAdmin) return true

    // 2. Authenticated customer ownership check
    if (order.user_id && requester.userId) {
      return order.user_id === requester.userId
    }

    // 3. Guest order verification: requires order verifier matching phone or email
    if (requester.verifier) {
      const cleanVerifier = requester.verifier.trim().toLowerCase()
      const cleanPhone = requester.verifier.replace(/\D/g, '')

      const matchesEmail =
        cleanVerifier.includes('@') &&
        order.guest_email?.toLowerCase() === cleanVerifier

      const matchesPhone =
        cleanPhone.length >= 10 &&
        order.guest_phone &&
        order.guest_phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10))

      return Boolean(matchesEmail || matchesPhone)
    }

    return false
  }

  const customerOrder: OrderRecord = {
    id: 'ord_123',
    order_number: 'BB-20261004-1001',
    user_id: 'user_cust_A',
    guest_email: null,
    guest_phone: '9876543210',
  }

  const guestOrder: OrderRecord = {
    id: 'ord_456',
    order_number: 'BB-20261004-1002',
    user_id: null,
    guest_email: 'aryan@example.com',
    guest_phone: '9123456789',
  }

  it('allows owner customer to view their own order', () => {
    const allowed = canAccessOrder(customerOrder, {
      userId: 'user_cust_A',
      isAdmin: false,
    })
    expect(allowed).toBe(true)
  })

  it('strictly blocks customer B from accessing customer A order', () => {
    const allowed = canAccessOrder(customerOrder, {
      userId: 'user_cust_B', // Different customer
      isAdmin: false,
    })
    expect(allowed).toBe(false)
  })

  it('allows admin user to inspect any order', () => {
    const allowedCust = canAccessOrder(customerOrder, {
      userId: 'admin_user',
      isAdmin: true,
    })
    expect(allowedCust).toBe(true)

    const allowedGuest = canAccessOrder(guestOrder, {
      userId: 'admin_user',
      isAdmin: true,
    })
    expect(allowedGuest).toBe(true)
  })

  it('blocks unauthenticated public access without matching email/phone verifier', () => {
    // Only guessing the order number without verifier
    const allowed = canAccessOrder(guestOrder, {
      isAdmin: false,
    })
    expect(allowed).toBe(false)

    // With wrong verifier
    const allowedWrong = canAccessOrder(guestOrder, {
      isAdmin: false,
      verifier: 'stranger@gmail.com',
    })
    expect(allowedWrong).toBe(false)
  })

  it('grants guest order access only when matching verified phone or email is supplied', () => {
    const allowedByEmail = canAccessOrder(guestOrder, {
      isAdmin: false,
      verifier: 'aryan@example.com',
    })
    expect(allowedByEmail).toBe(true)

    const allowedByPhone = canAccessOrder(guestOrder, {
      isAdmin: false,
      verifier: '9123456789',
    })
    expect(allowedByPhone).toBe(true)
  })
})
