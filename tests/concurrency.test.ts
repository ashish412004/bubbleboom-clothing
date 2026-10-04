import { describe, it, expect } from 'vitest'

describe('Inventory Reservations, Expiry & Concurrency for Final Unit', () => {
  class InventoryTracker {
    private stockOnHand: number
    private reservations: Map<string, { quantity: number; expiresAt: number; status: 'active' | 'released' | 'confirmed' }>

    constructor(initialStock: number) {
      this.stockOnHand = initialStock
      this.reservations = new Map()
    }

    private getActiveReservedQuantity(): number {
      const now = Date.now()
      let total = 0
      for (const res of this.reservations.values()) {
        if (res.status === 'active' && res.expiresAt > now) {
          total += res.quantity
        }
      }
      return total
    }

    public getAvailableStock(): number {
      return Math.max(0, this.stockOnHand - this.getActiveReservedQuantity())
    }

    public reserveStock(orderId: string, quantity: number, holdMinutes: number = 15): { success: boolean; error?: string } {
      const available = this.getAvailableStock()
      if (available < quantity) {
        return {
          success: false,
          error: `Insufficient stock available. Only ${available} left.`,
        }
      }

      this.reservations.set(orderId, {
        quantity,
        expiresAt: Date.now() + holdMinutes * 60 * 1000,
        status: 'active',
      })

      return { success: true }
    }

    public releaseReservation(orderId: string) {
      const res = this.reservations.get(orderId)
      if (res && res.status === 'active') {
        res.status = 'released'
      }
    }

    public expireReservationManually(orderId: string) {
      const res = this.reservations.get(orderId)
      if (res) {
        res.expiresAt = Date.now() - 1000 // In the past
      }
    }

    public confirmReservation(orderId: string) {
      const res = this.reservations.get(orderId)
      if (res && res.status === 'active') {
        res.status = 'confirmed'
        this.stockOnHand -= res.quantity
      }
    }
  }

  it('prevents overselling when two competing checkouts target the last remaining item', () => {
    // Exactly 1 unit remaining in inventory
    const inventory = new InventoryTracker(1)
    expect(inventory.getAvailableStock()).toBe(1)

    // Customer A reserves the final item
    const customerA = inventory.reserveStock('ORDER_A', 1)
    expect(customerA.success).toBe(true)
    expect(inventory.getAvailableStock()).toBe(0)

    // Customer B attempts checkout concurrently for the same variant
    const customerB = inventory.reserveStock('ORDER_B', 1)
    expect(customerB.success).toBe(false)
    expect(customerB.error).toContain('Insufficient stock available')
  })

  it('restores stock availability when an active reservation expires or is abandoned', () => {
    const inventory = new InventoryTracker(1)

    // Customer A starts checkout
    inventory.reserveStock('ORDER_A', 1)
    expect(inventory.getAvailableStock()).toBe(0)

    // Customer A abandons cart or 15-minute checkout window lapses
    inventory.expireReservationManually('ORDER_A')

    // Stock must be available again
    expect(inventory.getAvailableStock()).toBe(1)

    // Customer B can now successfully reserve and complete purchase
    const customerB = inventory.reserveStock('ORDER_B', 1)
    expect(customerB.success).toBe(true)
    expect(inventory.getAvailableStock()).toBe(0)
  })

  it('deducts physical stock on hand when payment succeeds and reservation is confirmed', () => {
    const inventory = new InventoryTracker(5)

    inventory.reserveStock('ORDER_PAID', 2)
    expect(inventory.getAvailableStock()).toBe(3)

    // Payment succeeds -> confirm reservation as completed sale
    inventory.confirmReservation('ORDER_PAID')

    // Stock on hand should now be 3, and 3 available
    expect(inventory.getAvailableStock()).toBe(3)
  })
})
