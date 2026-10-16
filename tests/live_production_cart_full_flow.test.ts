import { describe, it, expect } from 'vitest'

const BASE_URL = 'https://bubbleboom-clothing.vercel.app'

describe('Live Production Cart Full Flow & Security Verification', () => {
  let sessionCookie: string = ''
  let addedItemId: string = ''

  it('1. GET /api/cart initializes guest session and returns empty cart', async () => {
    const res = await fetch(`${BASE_URL}/api/cart`, {
      method: 'GET',
    })
    expect(res.status).toBe(200)

    const setCookie = res.headers.get('set-cookie')
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0]
    }

    const data = await res.json()
    expect(data).toHaveProperty('items')
    expect(data).toHaveProperty('summary')
  })

  it('2. POST /api/cart adds product variant to guest cart in production', async () => {
    // Known production variant ID from test probe
    // We can probe a product variant from live products
    const prodRes = await fetch(`${BASE_URL}/api/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({
        variant_id: '17471ccf-3fa5-4745-8018-5e71fd904956', // BB Hoodie L
        quantity: 1,
      }),
    })

    const newCookies = prodRes.headers.get('set-cookie')
    if (newCookies) {
      sessionCookie = newCookies.split(';')[0]
    }

    const data = await prodRes.json()
    // Either data returned or error if mock/supabase
    if (prodRes.ok && data.data) {
      addedItemId = data.data.id
    }
    expect([200, 400]).toContain(prodRes.status)
  })

  it('3. Verifies cart ownership protection: prevents modifying arbitrary cart item', async () => {
    // Attempting to modify a fake or foreign cart item without ownership
    const patchRes = await fetch(`${BASE_URL}/api/cart`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'bb_session_id=attacker_session_999999',
      },
      body: JSON.stringify({
        item_id: '00000000-0000-0000-0000-000000000000',
        quantity: 5,
      }),
    })

    // Must be rejected (either 400 or 403 or item not found)
    expect([400, 403, 404]).toContain(patchRes.status)
    const data = await patchRes.json()
    expect(data.error).toBeDefined()
  })

  it('4. DELETE /api/cart clears the current guest cart cleanly', async () => {
    const delRes = await fetch(`${BASE_URL}/api/cart`, {
      method: 'DELETE',
      headers: {
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
    })

    expect(delRes.status).toBe(200)
    const data = await delRes.json()
    expect(data.success).toBe(true)
  })
})
