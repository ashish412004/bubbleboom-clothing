import { describe, it, expect } from 'vitest'

describe('Refund Ceilings & Financial Restraints', () => {
  function validateRefundCeiling(
    capturedAmountPaise: number,
    existingRefundsPaise: number,
    newRefundPaise: number
  ): { allowed: boolean; remainingPaise: number; error?: string } {
    if (newRefundPaise <= 0) {
      return {
        allowed: false,
        remainingPaise: Math.max(0, capturedAmountPaise - existingRefundsPaise),
        error: 'Refund amount must be greater than zero.',
      }
    }

    const totalProposed = existingRefundsPaise + newRefundPaise
    if (totalProposed > capturedAmountPaise) {
      return {
        allowed: false,
        remainingPaise: Math.max(0, capturedAmountPaise - existingRefundsPaise),
        error: `Cumulative refunds (${totalProposed / 100}) exceed captured order amount (${capturedAmountPaise / 100}).`,
      }
    }

    return {
      allowed: true,
      remainingPaise: capturedAmountPaise - totalProposed,
    }
  }

  it('allows full refund matching captured order total', () => {
    // Order total = ₹2,499 (249900 paise)
    const result = validateRefundCeiling(249900, 0, 249900)
    expect(result.allowed).toBe(true)
    expect(result.remainingPaise).toBe(0)
  })

  it('allows sequential partial refunds up to captured ceiling', () => {
    // Order total = ₹3,000 (300000 paise)
    // First refund: ₹1,000
    const res1 = validateRefundCeiling(300000, 0, 100000)
    expect(res1.allowed).toBe(true)
    expect(res1.remainingPaise).toBe(200000)

    // Second refund: ₹1,500 (Cumulative: ₹2,500)
    const res2 = validateRefundCeiling(300000, 100000, 150000)
    expect(res2.allowed).toBe(true)
    expect(res2.remainingPaise).toBe(50000)

    // Final refund of remaining ₹500
    const res3 = validateRefundCeiling(300000, 250000, 50000)
    expect(res3.allowed).toBe(true)
    expect(res3.remainingPaise).toBe(0)
  })

  it('strictly rejects any refund that pushes cumulative refunds over captured total', () => {
    // Order total = ₹2,000 (200000 paise)
    // Already refunded: ₹1,500 (150000 paise)
    // Attempting new refund of ₹600 (60000 paise) -> total ₹2,100 > ₹2,000
    const result = validateRefundCeiling(200000, 150000, 60000)
    expect(result.allowed).toBe(false)
    expect(result.remainingPaise).toBe(50000) // ₹500 left
    expect(result.error).toContain('exceed captured order amount')
  })

  it('rejects zero or negative refund attempts', () => {
    const resZero = validateRefundCeiling(200000, 0, 0)
    expect(resZero.allowed).toBe(false)

    const resNegative = validateRefundCeiling(200000, 0, -5000)
    expect(resNegative.allowed).toBe(false)
  })
})
