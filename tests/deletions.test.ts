import { describe, it, expect, beforeEach } from 'vitest'
import { deleteProduct, getProducts, getAdminProducts, getDeletedProductIds } from '@/lib/products'
import { deleteCategory, createCategory, getCategories, getDeletedCategoryIds } from '@/lib/categories'
import { deleteCollection, createCollection, getCollections, getDeletedCollectionIds } from '@/lib/collections'
import { cancelOrder, deleteOrder, getDevOrders, saveDevOrder } from '@/lib/orders'

describe('Admin & Store Deletion Logic & Persistence', () => {
  describe('Product Deletion', () => {
    it('successfully deletes a product and removes it from catalog and admin view', async () => {
      const initialProducts = await getAdminProducts()
      if (initialProducts.length === 0) {
        const res = await deleteProduct('test-temp-prod-1')
        expect(res.success).toBe(true)
        const deletedIds = getDeletedProductIds()
        expect(deletedIds.has('test-temp-prod-1')).toBe(true)
        return
      }
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
      const uniqueSuffix = Date.now()
      const tempCat = {
        id: `c9999999-0000-0000-0000-${String(uniqueSuffix).slice(-12).padStart(12, '0')}`,
        name: 'Temporary Category For Delete',
        slug: `temp-cat-delete-${uniqueSuffix}`,
        sort_order: 99,
        is_active: true,
      }
      const created = await createCategory(tempCat as any)
      const targetId = created.data?.id || tempCat.id
      const initialCategories = await getCategories(true)
      expect(initialCategories.some((c) => c.id === targetId)).toBe(true)

      const res = await deleteCategory(targetId)
      expect(res.success).toBe(true)

      const deletedIds = getDeletedCategoryIds()
      expect(deletedIds.has(targetId)).toBe(true)

      const remainingCategories = await getCategories(true)
      expect(remainingCategories.some((c) => c.id === targetId)).toBe(false)
    })
  })

  describe('Collection Deletion', () => {
    it('successfully deletes a collection and removes it from collections listing', async () => {
      const uniqueSuffix = Date.now()
      const tempCol = {
        id: `test-temp-col-delete-${uniqueSuffix}`,
        name: 'Temporary Collection For Delete',
        slug: `temp-col-delete-${uniqueSuffix}`,
        sort_order: 99,
        is_visible: true,
      }
      await createCollection(tempCol as any)
      const initialCollections = await getCollections(true)
      expect(initialCollections.some((c) => c.id === tempCol.id)).toBe(true)

      const res = await deleteCollection(tempCol.id)
      expect(res.success).toBe(true)

      const deletedIds = getDeletedCollectionIds()
      expect(deletedIds.has(tempCol.id)).toBe(true)

      const remainingCollections = await getCollections(true)
      expect(remainingCollections.some((c) => c.id === tempCol.id)).toBe(false)
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
