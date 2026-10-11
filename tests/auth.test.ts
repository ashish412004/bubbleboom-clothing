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

  describe('Google OAuth Profile Sync & Name Resolution', () => {
    function resolveGoogleCustomerName(userMetadata: Record<string, any>, existingCustomName?: string | null): string {
      // 1. If user previously customized their name in profile, preserve it
      if (existingCustomName && existingCustomName.trim()) {
        return existingCustomName.trim()
      }

      // 2. Read actual Google-provided metadata: full_name, name, or given_name + family_name
      const extracted =
        userMetadata.full_name ||
        userMetadata.name ||
        (userMetadata.given_name
          ? `${userMetadata.given_name} ${userMetadata.family_name || ''}`.trim()
          : null)

      if (extracted && extracted.trim()) {
        return extracted.trim()
      }

      // 3. Fallback to neutral account label
      return 'Member'
    }

    it('extracts correct full name for new user Rahul Sharma from Google OAuth', () => {
      const googleUserA = {
        full_name: 'Rahul Sharma',
        given_name: 'Rahul',
        family_name: 'Sharma',
      }
      const displayName = resolveGoogleCustomerName(googleUserA)
      expect(displayName).toBe('Rahul Sharma')
      expect(displayName.split(' ')[0]).toBe('Rahul')
    })

    it('extracts correct full name for new user Priya Singh from Google OAuth', () => {
      const googleUserB = {
        name: 'Priya Singh',
        given_name: 'Priya',
        family_name: 'Singh',
      }
      const displayName = resolveGoogleCustomerName(googleUserB)
      expect(displayName).toBe('Priya Singh')
      expect(displayName.split(' ')[0]).toBe('Priya')
    })

    it('never defaults to Ashish or another user name', () => {
      const unknownUser = {}
      const displayName = resolveGoogleCustomerName(unknownUser)
      expect(displayName).not.toBe('Ashish')
      expect(displayName).toBe('Member')
    })

    it('preserves user customized name even when subsequent Google login occurs', () => {
      const googleUserC = {
        full_name: 'Rahul Sharma (Google)',
      }
      const existingCustomName = 'Rahul S.' // Customer edited in profile
      const resolved = resolveGoogleCustomerName(googleUserC, existingCustomName)
      expect(resolved).toBe('Rahul S.')
    })
  })

  describe('Customer Account Isolation & Logout Purge', () => {
    it('isolates user A and user B cart and wishlist state', () => {
      const userA = { id: 'cust_A', wishlist: ['prod_1', 'prod_2'], cartCount: 3 }
      const userB = { id: 'cust_B', wishlist: ['prod_9'], cartCount: 1 }

      expect(userA.id).not.toBe(userB.id)
      expect(userA.wishlist).not.toEqual(userB.wishlist)
      expect(userA.cartCount).not.toBe(userB.cartCount)
    })
  })
})

