import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { getStoreSettings, StoreShippingSettings } from '@/lib/settings'
import { validateCoupon } from '@/lib/coupons'
import { reserveStockForCheckout, confirmStockReservation, releaseStockReservation } from '@/lib/inventory'
import { createCashfreeOrder } from '@/lib/payments/cashfree'
import { MOCK_PRODUCTS, MOCK_ORDERS } from '@/lib/mock-data'
import fs from 'fs'
import path from 'path'

function getDevOrdersFilePath() {
  const dir = path.join(process.cwd(), '.next')
  return path.join(dir, 'bb_dev_orders.json')
}

export function getDevOrders(): any[] {
  try {
    const file = getDevOrdersFilePath()
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8')
      const diskOrders = JSON.parse(content)
      return [...diskOrders, ...MOCK_ORDERS]
    }
  } catch {}
  return MOCK_ORDERS
}

export function saveDevOrder(order: any) {
  try {
    const file = getDevOrdersFilePath()
    let current: any[] = []
    if (fs.existsSync(file)) {
      try {
        current = JSON.parse(fs.readFileSync(file, 'utf-8'))
      } catch {}
    }
    current = [order, ...current.filter((o: any) => o.id !== order.id && o.order_number !== order.order_number)]
    fs.writeFileSync(file, JSON.stringify(current, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save dev order to disk:', e)
  }
}

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderStatus = Database['public']['Tables']['orders']['Row']['status']
export type PaymentStatus = Database['public']['Tables']['orders']['Row']['payment_status']

export interface ShippingAddressInput {
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pin_code: string
  country?: string
}

export interface CreateOrderInput {
  user_id?: string
  guest_email?: string
  guest_phone?: string
  shipping_address: ShippingAddressInput
  billing_address?: ShippingAddressInput
  payment_method: 'cashfree' | 'cod'
  coupon_code?: string
  cart_items: Array<{
    variant_id: string
    quantity: number
  }>
  notes?: string
}

export function validateIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) return /^[6-9]\d{9}$/.test(cleaned)
  if (cleaned.length === 12 && cleaned.startsWith('91')) return /^[6-9]\d{9}$/.test(cleaned.slice(2))
  return false
}

export function validateIndianPinCode(pin: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pin.trim())
}

export function isValidOrderStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['packed', 'cancelled'],
    packed: ['shipped', 'cancelled'],
    shipped: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
    delivered: ['return_requested'],
    return_requested: ['returned', 'delivered'],
    returned: ['refunded'],
    cancelled: [],
    refunded: [],
  }
  return allowed[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Server-authoritative order creation:
 * - Revalidates all prices and publication states from the database.
 * - Enforces Indian phone and PIN code validation.
 * - Calculates shipping and COD fees from store settings.
 * - Atomically reserves stock.
 * - Creates order with immutable snapshots.
 */
export async function createOrder(input: CreateOrderInput) {
  // 1. Validate contact info
  const phone = input.guest_phone || input.shipping_address.phone
  if (!validateIndianPhone(phone)) {
    return { error: 'Please enter a valid 10-digit Indian mobile number.' }
  }

  if (!validateIndianPinCode(input.shipping_address.pin_code)) {
    return { error: 'Please enter a valid 6-digit Indian PIN code.' }
  }

  if (!input.cart_items || input.cart_items.length === 0) {
    return { error: 'Your cart is empty.' }
  }

  if (!isSupabaseConfigured()) {
    let subtotalPaise = 0
    const itemSnapshots: any[] = []

    for (const item of input.cart_items) {
      let foundVariant: any = null
      let foundProduct: any = null
      for (const p of MOCK_PRODUCTS) {
        const v = p.variants?.find((vr: any) => vr.id === item.variant_id)
        if (v) {
          foundVariant = v
          foundProduct = p
          break
        }
      }

      if (!foundVariant || !foundProduct) {
        return { error: 'One or more items in your cart could not be verified.' }
      }

      const sellingPricePaise = Math.round(foundProduct.selling_price * 100)
      const itemTotalPaise = sellingPricePaise * item.quantity
      subtotalPaise += itemTotalPaise

      itemSnapshots.push({
        id: `oi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        order_id: '',
        product_id: foundProduct.id,
        variant_id: foundVariant.id,
        product_name: foundProduct.name,
        variant_info: {
          sku: foundVariant.sku,
          color: foundVariant.color,
          size: foundVariant.size,
        },
        quantity: item.quantity,
        mrp: foundProduct.mrp,
        selling_price: foundProduct.selling_price,
        discount_amount: Math.max(0, foundProduct.mrp - foundProduct.selling_price),
        total_amount: Math.round(itemTotalPaise / 100),
      })
    }

    const shippingSettings = await getStoreSettings<StoreShippingSettings>('shipping')
    const freeThreshold = shippingSettings.free_shipping_threshold_paise
    const shippingPaise = subtotalPaise >= freeThreshold ? 0 : shippingSettings.standard_shipping_paise
    const codFeePaise =
      input.payment_method === 'cod' && shippingSettings.cod_enabled
        ? shippingSettings.cod_fee_paise
        : 0

    let couponDiscountPaise = 0
    if (input.coupon_code) {
      const code = input.coupon_code.trim().toUpperCase()
      if (code === 'BOOM10') {
        couponDiscountPaise = Math.round(subtotalPaise * 0.1)
      } else if (code === 'FIRSTBOOM' && subtotalPaise >= 149900) {
        couponDiscountPaise = 20000
      }
    }

    const totalPaise = Math.max(0, subtotalPaise - couponDiscountPaise + shippingPaise + codFeePaise)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `BB-${dateStr}-${randomSuffix}`

    const orderRecord: Order = {
      id: `ord_${Date.now()}_${randomSuffix}`,
      order_number: orderNumber,
      user_id: input.user_id || null,
      guest_email: input.guest_email || null,
      guest_phone: phone,
      status: input.payment_method === 'cod' ? 'confirmed' : 'pending',
      payment_status: input.payment_method === 'cod' ? 'pending' : 'pending',
      payment_method: input.payment_method,
      subtotal: Math.round(subtotalPaise / 100),
      discount_amount: Math.round(couponDiscountPaise / 100),
      shipping_amount: Math.round((shippingPaise + codFeePaise) / 100),
      total_amount: Math.round(totalPaise / 100),
      coupon_id: null,
      coupon_discount: Math.round(couponDiscountPaise / 100),
      shipping_address: input.shipping_address as any,
      billing_address: (input.billing_address || input.shipping_address) as any,
      notes: input.notes || null,
      cancellation_reason: null,
      cancelled_at: null,
      tracking_number: null,
      carrier: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    for (const itm of itemSnapshots) {
      itm.order_id = orderRecord.id
    }

    const devOrderFull = {
      ...orderRecord,
      order_items: itemSnapshots,
      payments: [],
    }

    saveDevOrder(devOrderFull)
    MOCK_ORDERS.unshift(devOrderFull)

    return { data: orderRecord }
  }

  const supabase = await createServiceClient()

  // 2. Fetch authoritative product and variant details from DB
  const variantIds = input.cart_items.map((i) => i.variant_id)
  const { data: variants, error: varError } = await supabase
    .from('product_variants')
    .select(`
      id,
      product_id,
      sku,
      color,
      size,
      stock,
      is_active,
      product:products (
        id,
        name,
        slug,
        mrp,
        selling_price,
        is_published,
        is_active
      )
    `)
    .in('id', variantIds)

  if (varError || !variants || variants.length !== variantIds.length) {
    return { error: 'One or more items in your cart could not be verified.' }
  }

  // 3. Verify publication, availability, and build line items with authoritative prices
  let subtotalPaise = 0
  const itemSnapshots: Array<{
    variant_id: string
    product_id: string
    product_name: string
    variant_info: Record<string, any>
    quantity: number
    mrp: number
    selling_price: number
    discount_amount: number
    total_amount: number
  }> = []

  const productIds: string[] = []

  for (const item of input.cart_items) {
    const v = variants.find((variant) => variant.id === item.variant_id)
    if (!v) return { error: 'Product variant not found.' }

    const prod = (v as any).product
    if (!prod.is_published || !prod.is_active || !v.is_active) {
      return { error: `"${prod.name}" is no longer available.` }
    }

    productIds.push(prod.id)
    const sellingPricePaise = Math.round(prod.selling_price * 100)
    const itemTotalPaise = sellingPricePaise * item.quantity
    subtotalPaise += itemTotalPaise

    itemSnapshots.push({
      variant_id: v.id,
      product_id: prod.id,
      product_name: prod.name,
      variant_info: {
        sku: v.sku,
        color: v.color,
        size: v.size,
      },
      quantity: item.quantity,
      mrp: prod.mrp,
      selling_price: prod.selling_price,
      discount_amount: Math.max(0, prod.mrp - prod.selling_price),
      total_amount: Math.round(itemTotalPaise / 100),
    })
  }

  // 4. Shipping & COD rules from settings
  const shippingSettings = await getStoreSettings<StoreShippingSettings>('shipping')
  const freeThreshold = shippingSettings.free_shipping_threshold_paise
  const shippingPaise = subtotalPaise >= freeThreshold ? 0 : shippingSettings.standard_shipping_paise

  if (input.payment_method === 'cod' && !shippingSettings.cod_enabled) {
    return { error: 'Cash on Delivery is currently unavailable.' }
  }

  const codFeePaise =
    input.payment_method === 'cod' && shippingSettings.cod_enabled
      ? shippingSettings.cod_fee_paise
      : 0

  if (
    input.payment_method === 'cod' &&
    subtotalPaise > shippingSettings.max_cod_amount_paise
  ) {
    return {
      error: `Orders above ₹${Math.round(
        shippingSettings.max_cod_amount_paise / 100
      )} are not eligible for Cash on Delivery. Please choose online payment.`,
    }
  }

  // 5. Coupon validation
  let couponDiscountPaise = 0
  let appliedCouponId: string | null = null

  if (input.coupon_code) {
    const couponRes = await validateCoupon(
      input.coupon_code,
      input.user_id,
      subtotalPaise,
      productIds
    )
    if (!couponRes.valid) {
      return { error: couponRes.error }
    }
    couponDiscountPaise = couponRes.discount_paise || 0
    appliedCouponId = couponRes.coupon?.id || null
  }

  const totalPaise = Math.max(
    0,
    subtotalPaise - couponDiscountPaise + shippingPaise + codFeePaise
  )

  // 6. Generate order number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const orderNumber = `BB-${dateStr}-${randomSuffix}`

  // 7. Create internal pending order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: input.user_id || null,
      guest_email: input.guest_email || null,
      guest_phone: phone,
      status: input.payment_method === 'cod' ? 'confirmed' : 'pending',
      payment_status: 'pending',
      payment_method: input.payment_method,
      subtotal: Math.round(subtotalPaise / 100),
      discount_amount: Math.round(couponDiscountPaise / 100),
      shipping_amount: Math.round((shippingPaise + codFeePaise) / 100),
      total_amount: Math.round(totalPaise / 100),
      coupon_id: appliedCouponId,
      coupon_discount: Math.round(couponDiscountPaise / 100),
      shipping_address: input.shipping_address as any,
      billing_address: (input.billing_address || input.shipping_address) as any,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (orderErr || !order) {
    console.error('Failed to create order record:', orderErr)
    return { error: orderErr?.message || 'Failed to create order.' }
  }

  // 8. Insert order items
  const itemsToInsert = itemSnapshots.map((snap) => ({
    order_id: order.id,
    product_id: snap.product_id,
    variant_id: snap.variant_id,
    product_name: snap.product_name,
    variant_info: snap.variant_info,
    quantity: snap.quantity,
    mrp: snap.mrp,
    selling_price: snap.selling_price,
    discount_amount: snap.discount_amount,
    total_amount: snap.total_amount,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert)
  if (itemsErr) {
    console.error('Failed to create order items:', itemsErr)
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: 'Failed to record order items.' }
  }

  // 9. Atomically reserve inventory for all items
  for (const item of input.cart_items) {
    const reservationRes = await reserveStockForCheckout(
      item.variant_id,
      item.quantity,
      order.id,
      undefined,
      input.user_id,
      15 // 15 minutes hold
    )

    if (!reservationRes.success) {
      // Release any previously reserved items for this order
      await releaseStockReservation(order.id)
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      return {
        error: `Sorry, stock for one of your items could not be reserved: ${reservationRes.error}`,
      }
    }
  }

  // If COD, confirm reservation immediately as sale
  if (input.payment_method === 'cod') {
    await confirmStockReservation(order.id)
  }

  return { data: order }
}

/**
 * Initialize Cashfree payment session for an order
 */
export async function createCashfreeSessionForOrder(order: Order) {
  const appId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID
  const hasCashfree = Boolean(
    appId &&
    appId !== 'your-cashfree-client-id' &&
    appId !== 'your-cashfree-app-id' &&
    process.env.CASHFREE_SECRET_KEY &&
    process.env.CASHFREE_SECRET_KEY !== 'your-cashfree-secret-key'
  )

  if (!hasCashfree) {
    if (isSupabaseConfigured()) {
      return {
        error:
          'Cashfree payment credentials are not configured on the server. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in server environment variables.',
      }
    }
    return {
      payment_session_id: `session_dev_${order.order_number}`,
      order_id: order.order_number,
    }
  }

  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  if (!siteUrl || siteUrl.startsWith('http://localhost')) {
    if (process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production') {
      siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://bubbleboom-clothing.vercel.app')
    } else {
      siteUrl = siteUrl || 'http://localhost:3000'
    }
  }

  // Ensure customer phone is a valid 10-digit number for Cashfree
  const rawPhone = order.guest_phone || (order.shipping_address as any)?.phone || ''
  const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10)
  const customerPhone = cleanDigits.length === 10 ? cleanDigits : '9876543210'

  const cfRes = await createCashfreeOrder({
    order_id: order.order_number,
    order_amount: order.total_amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: order.user_id || `guest_${order.order_number}`,
      customer_name: (order.shipping_address as any)?.full_name || 'Customer',
      customer_email: order.guest_email || 'customer@bubbleboom.in',
      customer_phone: customerPhone,
    },
    order_meta: {
      return_url: `${siteUrl}/payment-return?order_id=${order.order_number}`,
      notify_url: `${siteUrl}/api/webhooks/cashfree`,
    },
  })

  if ('error' in cfRes) {
    return { error: cfRes.error }
  }

  // Record payment record in pending state (idempotent upsert/update)
  const supabase = await createServiceClient()
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle()

  if (existingPayment) {
    await supabase
      .from('payments')
      .update({
        cashfree_order_id: order.order_number,
        amount: order.total_amount,
        status: 'pending',
        payment_method: 'cashfree',
        currency: 'INR',
        payment_data: cfRes as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPayment.id)
  } else {
    await supabase.from('payments').insert({
      order_id: order.id,
      cashfree_order_id: order.order_number,
      amount: order.total_amount,
      status: 'pending',
      payment_method: 'cashfree',
      currency: 'INR',
      payment_data: cfRes as any,
    })
  }

  return { payment_session_id: cfRes.payment_session_id, order_id: cfRes.order_id }
}

export async function getOrderById(orderId: string) {
  if (!orderId) return null

  if (!isSupabaseConfigured()) {
    const orders = getDevOrders()
    const found = orders.find((o) => o.id === orderId || o.order_number === orderId)
    if (!found) return null
    return {
      ...found,
      order_items: found.order_items || [],
      payments: found.payments || [],
    }
  }

  const supabase = await createServiceClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)

  let order: any = null

  // If orderId is formatted as UUID, look up by primary key first
  if (isUuid) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    if (!error && data) {
      order = data
    }
  }

  // If not found or orderId is an order number (e.g. BB-20261005-4774), look up by order_number
  if (!order) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderId)
      .maybeSingle()
    if (error) {
      console.error('Error fetching order by order_number:', error)
    } else {
      order = data
    }
  }

  if (!order) {
    return null
  }

  // Separately fetch order_items and payments
  const [itemsRes, paymentsRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id),
    supabase
      .from('payments')
      .select('*')
      .eq('order_id', order.id),
  ])

  return {
    ...order,
    order_items: itemsRes.data || [],
    payments: paymentsRes.data || [],
  }
}

export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  if (!isSupabaseConfigured()) {
    const orders = getDevOrders()
    const userOrders = orders.filter((o) => o.user_id === userId)
    if (userOrders.length > 0) return userOrders
    return orders.filter((o) => !o.user_id || o.user_id === userId)
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

/**
 * Enforce valid fulfillment state transitions
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  adminUserId?: string
) {
  if (!isSupabaseConfigured()) {
    const found = MOCK_ORDERS.find((o) => o.id === orderId || o.order_number === orderId)
    if (!found) return { error: 'Order not found' }
    if (!isValidOrderStatusTransition(found.status, newStatus)) {
      return {
        error: `Transition from "${found.status}" to "${newStatus}" is not permitted.`,
      }
    }
    found.status = newStatus
    found.updated_at = new Date().toISOString()
    return { data: found }
  }

  const supabase = await createServiceClient()

  const { data: currentOrder, error: fetchErr } = await supabase
    .from('orders')
    .select('status, id')
    .eq('id', orderId)
    .single()

  if (fetchErr || !currentOrder) return { error: 'Order not found' }

  if (!isValidOrderStatusTransition(currentOrder.status, newStatus)) {
    return {
      error: `Transition from "${currentOrder.status}" to "${newStatus}" is not permitted.`,
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) return { error: error.message }

  // Log in audit logs
  if (adminUserId) {
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminUserId,
      action: 'UPDATE_ORDER_STATUS',
      entity: 'orders',
      entity_id: orderId,
      metadata: { from: currentOrder.status, to: newStatus },
    })
  }

  return { data }
}

export async function cancelOrder(orderId: string, reason: string, cancelledByUserId?: string) {
  if (!isSupabaseConfigured()) {
    const devOrders = getDevOrders()
    const found = devOrders.find((o) => o.id === orderId || o.order_number === orderId)
    if (!found) return { error: 'Order not found' }
    if (!['pending', 'confirmed', 'packed', 'processing'].includes(found.status)) {
      return {
        error: `Orders with status "${found.status}" cannot be cancelled. You can request a return after delivery.`,
      }
    }
    found.status = 'cancelled'
    found.cancellation_reason = reason
    found.cancelled_at = new Date().toISOString()
    found.updated_at = new Date().toISOString()
    saveDevOrder(found)
    return { data: found }
  }

  const supabase = await createServiceClient()

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchErr || !order) return { error: 'Order not found' }

  if (!['pending', 'confirmed', 'packed', 'processing'].includes(order.status)) {
    return {
      error: `Orders with status "${order.status}" cannot be cancelled. You can request a return after delivery.`,
    }
  }

  // Release inventory
  await releaseStockReservation(order.id)

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function deleteOrder(orderId: string) {
  try {
    const file = getDevOrdersFilePath()
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8')
      const orders = JSON.parse(content)
      const filtered = orders.filter((o: any) => o.id !== orderId && o.order_number !== orderId)
      fs.writeFileSync(file, JSON.stringify(filtered, null, 2), 'utf-8')
    }
  } catch {}

  const mIdx = MOCK_ORDERS.findIndex((o) => o.id === orderId || o.order_number === orderId)
  if (mIdx >= 0) {
    MOCK_ORDERS.splice(mIdx, 1)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('payments').delete().eq('order_id', orderId)
      await supabase.from('inventory_reservations').delete().eq('order_id', orderId)
      const { error } = await supabase.from('orders').delete().eq('id', orderId)
      if (error) return { error: error.message }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { success: true }
}

/**
 * Public track order lookup requiring both order number AND matching phone/email verification
 */
export async function getOrderByTracking(orderNumber: string, verifier: string) {
  if (!isSupabaseConfigured()) {
    const cleanOrder = orderNumber.trim()
    const cleanVerifier = verifier.trim().toLowerCase()
    const cleanPhone = verifier.replace(/\D/g, '')

    const orders = getDevOrders()
    const order = orders.find(
      (o) => o.order_number === cleanOrder || o.id === cleanOrder
    )

    if (!order) {
      return { error: 'Order not found. Please verify the order number.' }
    }

    const address = order.shipping_address as any
    const orderEmail = (order.guest_email || address?.email || '').toLowerCase()
    const orderPhone = (order.guest_phone || address?.phone || '').replace(/\D/g, '')

    const matchesEmail = cleanVerifier.includes('@') && orderEmail && orderEmail === cleanVerifier
    const matchesPhone = cleanPhone.length >= 10 && orderPhone && orderPhone.endsWith(cleanPhone.slice(-10))

    if (!matchesEmail && !matchesPhone) {
      return {
        error: 'The email or phone number does not match this order. Please verify your details.',
      }
    }

    return { data: order }
  }

  const supabase = await createServiceClient()
  const cleanOrder = orderNumber.trim()
  const cleanVerifier = verifier.trim().toLowerCase()
  const cleanPhone = verifier.replace(/\D/g, '')

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      created_at,
      status,
      payment_status,
      payment_method,
      total_amount,
      tracking_number,
      carrier,
      guest_email,
      guest_phone,
      shipping_address,
      order_items (
        id,
        product_name,
        quantity,
        variant_info,
        total_amount
      )
    `)
    .eq('order_number', cleanOrder)
    .maybeSingle()

  if (error || !order) {
    return { error: 'Order not found. Please verify the order number.' }
  }

  // Verify against guest_email, guest_phone, or shipping_address fields
  const address = order.shipping_address as any
  const orderEmail = (order.guest_email || address?.email || '').toLowerCase()
  const orderPhone = (order.guest_phone || address?.phone || '').replace(/\D/g, '')

  const matchesEmail = cleanVerifier.includes('@') && orderEmail && orderEmail === cleanVerifier
  const matchesPhone = cleanPhone.length >= 10 && orderPhone && orderPhone.endsWith(cleanPhone.slice(-10))

  if (!matchesEmail && !matchesPhone) {
    return {
      error: 'The email or phone number does not match this order. Please verify your details.',
    }
  }

  return { data: order }
}

