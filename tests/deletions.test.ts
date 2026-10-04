import { describe, it, expect, beforeEach } from 'vitest'
import { deleteProduct, getProducts, getAdminProducts, getDeletedProductIds } from '@/lib/products'
import { deleteCategory, getCategories, getDeletedCategoryIds } from '@/lib/categories'
import { deleteCollection, getCollections, getDeletedCollectionIds } from '@/lib/collections'
import { cancelOrder, deleteOrder, getDevOrders, saveDevOrder } from '@/lib/orders'

describe('Admin & Store Deletion Logic & Persistence', () => {
  describe('Product Deletion', () => {
    it('successfully deletes a product and removes it from catalog and admin view', async () => {
      const initialProducts = await getAdminProducts()
      expect(initialProducts.length).toBeGreaterThan(0)
      const targetProduct = initialProducts[initialProducts.length - 1]

      const res = await deleteProduct(targetProduct.id)
      expect(res.success).toBe(true)

      const deletedIds = getDeletedProductIds()
      expect(deletedIds.has(targetProduct.id)).toBe(true)

      const remainingProducts = await getAdminProducts()
      expect(remainingProducts.some((p) => p.id === targetProduct.id)).toBe(false)

      const storefrontProducts = await getProducts()
      expect(storefrontProducts.some((p) => p.id === targetProduct.id)).toBe(false)
    })
  })

  describe('Category Deletion', () => {
    it('successfully deletes a category and removes it from category listings', async () => {
      const initialCategories = await getCategories()
      expect(initialCategories.length).toBeGreaterThan(0)
      const targetCat = initialCategories[initialCategories.length - 1]

      const res = await deleteCategory(targetCat.id)
      expect(res.success).toBe(true)

      const deletedIds = getDeletedCategoryIds()
      expect(deletedIds.has(targetCat.id)).toBe(true)

      const remainingCategories = await getCategories()
      expect(remainingCategories.some((c) => c.id === targetCat.id)).toBe(false)
    })
  })

  describe('Collection Deletion', () => {
    it('successfully deletes a collection and removes it from collections listing', async () => {
      const initialCollections = await getCollections(true)
      expect(initialCollections.length).toBeGreaterThan(0)
      const targetCol = initialCollections[initialCollections.length - 1]

      const res = await deleteCollection(targetCol.id)
      expect(res.success).toBe(true)

      const deletedIds = getDeletedCollectionIds()
      expect(deletedIds.has(targetCol.id)).toBe(true)

      const remainingCollections = await getCollections(true)
      expect(remainingCollections.some((c) => c.id === targetCol.id)).toBe(false)
    })
  })

  describe('Order Cancellation & Deletion', () => {
    const testOrderId = 'test-ord-delete-999'
    const testOrder = {
      id: testOrderId,
      order_number: 'BB-DEL-999',
      status: 'pending',
      payment_status: 'paid',
      payment_method: 'cod',
      total_amount: 1999,
      created_at: new Date().toISOString(),
      shipping_address: {
        full_name: 'Test Customer',
        phone: '9876543210',
      },
    }

    beforeEach(() => {
      saveDevOrder(testOrder)
    })

    it('cancels a pending order with audit reason', async () => {
      const res = await cancelOrder(testOrderId, 'Customer requested cancellation')
      expect(res.data?.status).toBe('cancelled')
      expect(res.data?.cancellation_reason).toBe('Customer requested cancellation')
    })

    it('permanently deletes an order from dev orders storage', async () => {
      const res = await deleteOrder(testOrderId)
      expect(res.success).toBe(true)

      const devOrders = getDevOrders()
      expect(devOrders.some((o) => o.id === testOrderId)).toBe(false)
    })
  })
})
