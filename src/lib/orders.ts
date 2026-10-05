import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { getStoreSettings, StoreShippingSettings } from '@/lib/settings'
import { validateCoupon } from '@/lib/coupons'
import { reserveStockForCheckout, confirmStockReservation, releaseStockReservation } from '@/lib/inventory'
import { createCashfreeOrder, getCashfreeConfig, getPaymentStatus } from '@/lib/payments/cashfree'
import { sendOrderShippedEmail, sendOrderDeliveredEmail } from '@/lib/emails/resend'
import { isAdmin } from '@/lib/auth'
import { MOCK_PRODUCTS, MOCK_ORDERS } from '@/lib/mock-data'
import fs from 'fs'
import path from 'path'

function getDevOrdersFilePath() {
  const dir = path.join(process.cwd(), '.next')
  return path.join(dir, 'bb_dev_orders.json')
}

let inMemoryDevOrders: any[] = []
const deletedDevOrderIds = new Set<string>()

export function getDeletedOrderIds(): Set<string> {
  return deletedDevOrderIds
}

export function getDevOrders(): any[] {
  let diskOrders: any[] = []
  try {
    const file = getDevOrdersFilePath()
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8')
      diskOrders = JSON.parse(content)
    }
  } catch {}

  const orderMap = new Map<string, any>()
  for (const o of MOCK_ORDERS) {
    if (o?.id && !deletedDevOrderIds.has(o.id) && (!o.order_number || !deletedDevOrderIds.has(o.order_number))) {
      orderMap.set(o.id, o)
    }
  }
  for (const o of diskOrders) {
    if (o?.id && !deletedDevOrderIds.has(o.id) && (!o.order_number || !deletedDevOrderIds.has(o.order_number))) {
      orderMap.set(o.id, o)
    }
  }
  for (const o of inMemoryDevOrders) {
    if (o?.id && !deletedDevOrderIds.has(o.id) && (!o.order_number || !deletedDevOrderIds.has(o.order_number))) {
      orderMap.set(o.id, o)
    }
  }
  return Array.from(orderMap.values())
}

export function saveDevOrder(order: any) {
  if (order?.id) deletedDevOrderIds.delete(order.id)
  if (order?.order_number) deletedDevOrderIds.delete(order.order_number)
  inMemoryDevOrders = [
    order,
    ...inMemoryDevOrders.filter((o: any) => o.id !== order.id && o.order_number !== order.order_number),
  ]
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
    // silent
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
  landmark?: string | null
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

export function validateTrackingUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return true
  const trimmed = url.trim()
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function isValidOrderStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'unfulfilled', 'cancelled'],
    confirmed: ['unfulfilled', 'packed', 'cancelled'],
    unfulfilled: ['packed', 'cancelled'],
    packed: ['pickup_scheduled', 'shipped', 'cancelled'],
    pickup_scheduled: ['shipped', 'cancelled', 'delivery_exception'],
    shipped: ['out_for_delivery', 'delivered', 'delivery_exception', 'return_to_origin'],
    out_for_delivery: ['delivered', 'delivery_exception', 'return_to_origin'],
    delivery_exception: ['out_for_delivery', 'shipped', 'return_to_origin', 'delivered', 'cancelled'],
    return_to_origin: ['cancelled', 'returned'],
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
  const config = getCashfreeConfig()
  const hasCashfree = Boolean(
    config.appId &&
    config.appId !== 'your-cashfree-client-id' &&
    config.appId !== 'your-cashfree-app-id' &&
    config.secretKey &&
    config.secretKey !== 'your-cashfree-secret-key'
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
      cf_mode: 'sandbox',
    }
  }

  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  if (!siteUrl || siteUrl.startsWith('http://localhost')) {
    if (config.isProduction) {
      siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://bubbleboom-clothing.vercel.app')
    } else {
      siteUrl = siteUrl || 'http://localhost:3000'
    }
  }

  siteUrl = siteUrl.replace(/\/+$/, '')

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
      return_url: `${siteUrl}/orders/${order.order_number}/payment?order_id=${order.order_number}`,
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

  return {
    payment_session_id: cfRes.payment_session_id,
    order_id: cfRes.order_id,
    cf_mode: config.mode,
  }
}

/**
 * Reuses an active Cashfree payment session or renews/replaces it
 * for retrying payment against an existing internal order.
 */
export async function getOrRenewCashfreeSessionForOrder(order: any) {
  const config = getCashfreeConfig()
  const isDev = !isSupabaseConfigured()

  if (isDev) {
    return {
      success: true,
      payment_session_id: `session_dev_retry_${order.order_number}_${Date.now()}`,
      order_id: order.order_number,
      cf_mode: 'sandbox',
    }
  }

  // 1. Check if Cashfree already has an active order and payment session
  const cfStatus = await getPaymentStatus(order.order_number)
  if (cfStatus && !('error' in cfStatus)) {
    if (cfStatus.order_status === 'PAID') {
      return {
        error: 'This order is already marked as paid. Payment retry is not allowed.',
        alreadyPaid: true,
      }
    }

    if (cfStatus.order_status === 'ACTIVE' && cfStatus.payment_session_id) {
      // The session is still active and valid for payment!
      return {
        success: true,
        payment_session_id: cfStatus.payment_session_id,
        order_id: order.order_number,
        cf_mode: config.mode,
        reused: true,
      }
    }
  }

  // 2. If Cashfree order is closed/expired or cannot be reused, create a linked replacement gateway attempt
  const supabase = await createServiceClient()
  const { data: existingPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', order.id)

  const retryNumber = (existingPayments?.length || 0) + 1
  const gatewayOrderRef = `${order.order_number}-R${retryNumber}`

  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  if (!siteUrl || siteUrl.startsWith('http://localhost')) {
    if (config.isProduction) {
      siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://bubbleboom-clothing.vercel.app')
    } else {
      siteUrl = siteUrl || 'http://localhost:3000'
    }
  }
  siteUrl = siteUrl.replace(/\/+$/, '')

  const rawPhone = order.guest_phone || (order.shipping_address as any)?.phone || ''
  const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10)
  const customerPhone = cleanDigits.length === 10 ? cleanDigits : '9876543210'

  const cfRes = await createCashfreeOrder({
    order_id: gatewayOrderRef,
    order_amount: order.total_amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: order.user_id || `guest_${order.order_number}`,
      customer_name: (order.shipping_address as any)?.full_name || 'Customer',
      customer_email: order.guest_email || 'customer@bubbleboom.in',
      customer_phone: customerPhone,
    },
    order_meta: {
      return_url: `${siteUrl}/orders/${order.order_number}/payment?order_id=${order.order_number}`,
      notify_url: `${siteUrl}/api/webhooks/cashfree`,
    },
  })

  if ('error' in cfRes) {
    return { error: cfRes.error }
  }

  // Insert a new payment attempt row in payments table, maintaining history
  await supabase.from('payments').insert({
    order_id: order.id,
    cashfree_order_id: gatewayOrderRef,
    amount: order.total_amount,
    status: 'pending',
    payment_method: 'cashfree',
    currency: 'INR',
    payment_data: cfRes as any,
  })

  // Ensure internal order status is set back to pending
  await supabase
    .from('orders')
    .update({
      status: 'pending',
      payment_status: 'pending',
      cancellation_reason: null,
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  return {
    success: true,
    payment_session_id: cfRes.payment_session_id,
    order_id: gatewayOrderRef,
    cf_mode: config.mode,
    renewed: true,
  }
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
    const candidates = userOrders.length > 0 ? userOrders : orders.filter((o) => !o.user_id || o.user_id === userId)
    // Only return successfully paid orders or COD orders in customer My Orders
    return candidates.filter(
      (o) => o.payment_status === 'paid' || o.payment_method === 'cod'
    )
  }

  const supabase = await createServerClient()
  // Only fetch orders that are either paid or COD
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .or('payment_status.eq.paid,payment_method.eq.cod')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[getOrdersByUserId] Supabase error:', error)
    return []
  }

  // Ensure double-safety filter in memory
  return (data || []).filter(
    (o) => o.payment_status === 'paid' || o.payment_method === 'cod'
  )
}

/**
 * Enforce valid fulfillment state transitions & dispatch safeguards
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  adminUserId?: string
) {
  if (!isSupabaseConfigured()) {
    const devOrders = getDevOrders()
    const found = devOrders.find((o) => o.id === orderId || o.order_number === orderId)
    if (!found) return { error: 'Order not found' }

    if (!isValidOrderStatusTransition(found.status, newStatus)) {
      return {
        error: `Transition from "${found.status}" to "${newStatus}" is not permitted.`,
      }
    }

    // Dispatch guard: block dispatch of unpaid online orders
    if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
      if (found.payment_method === 'cashfree' && found.payment_status !== 'paid') {
        return {
          error: `Cannot dispatch order: Online payment is not verified (status: ${found.payment_status}). Only paid online orders or valid COD orders can be shipped.`,
        }
      }
    }

    const previousStatus = found.status
    found.status = newStatus
    found.updated_at = new Date().toISOString()

    // Status history entry
    found.status_history = Array.isArray(found.status_history) ? found.status_history : []
    found.status_history.push({
      from: previousStatus,
      to: newStatus,
      timestamp: new Date().toISOString(),
      admin_id: adminUserId || null,
    })

    // Email notifications (idempotent & non-blocking)
    const customerEmail = found.guest_email || (found.shipping_address as any)?.email
    if (newStatus === 'shipped' && !found.shipped_email_sent_at && customerEmail) {
      try {
        await sendOrderShippedEmail(
          customerEmail,
          found.order_number,
          found.tracking_number || 'AWB-PENDING',
          found.carrier || 'Express Courier',
          found.tracking_url || null
        )
        found.shipped_email_sent_at = new Date().toISOString()
      } catch (emailErr) {
        console.warn('[updateOrderStatus dev] Non-fatal email error on dispatch:', emailErr)
      }
    }

    if (newStatus === 'delivered' && !found.delivered_email_sent_at && customerEmail) {
      try {
        await sendOrderDeliveredEmail(customerEmail, found.order_number)
        found.delivered_email_sent_at = new Date().toISOString()
      } catch (emailErr) {
        console.warn('[updateOrderStatus dev] Non-fatal email error on delivery:', emailErr)
      }
    }

    saveDevOrder(found)
    return { data: found }
  }

  const supabase = await createServiceClient()

  const { data: currentOrder, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchErr || !currentOrder) return { error: 'Order not found' }

  if (!isValidOrderStatusTransition(currentOrder.status, newStatus)) {
    return {
      error: `Transition from "${currentOrder.status}" to "${newStatus}" is not permitted.`,
    }
  }

  // Dispatch guard: block dispatch of unpaid online orders
  if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
    if (currentOrder.payment_method === 'cashfree' && currentOrder.payment_status !== 'paid') {
      return {
        error: `Cannot dispatch order: Online payment is not verified (status: ${currentOrder.payment_status}). Only paid online orders or valid COD orders can be shipped.`,
      }
    }
  }

  const history = Array.isArray((currentOrder as any).status_history)
    ? [...(currentOrder as any).status_history]
    : []

  history.push({
    from: currentOrder.status,
    to: newStatus,
    timestamp: new Date().toISOString(),
    admin_id: adminUserId || null,
  })

  let shippedEmailSentAt = (currentOrder as any).shipped_email_sent_at
  let deliveredEmailSentAt = (currentOrder as any).delivered_email_sent_at

  const customerEmail = currentOrder.guest_email || (currentOrder.shipping_address as any)?.email

  // Email notifications: idempotent and non-blocking
  if (newStatus === 'shipped' && !shippedEmailSentAt && customerEmail) {
    try {
      await sendOrderShippedEmail(
        customerEmail,
        currentOrder.order_number,
        currentOrder.tracking_number || 'AWB-PENDING',
        currentOrder.carrier || 'Express Courier',
        (currentOrder as any).tracking_url || null
      )
      shippedEmailSentAt = new Date().toISOString()
    } catch (emailErr) {
      console.warn('[updateOrderStatus] Non-fatal email error on dispatch:', emailErr)
    }
  }

  if (newStatus === 'delivered' && !deliveredEmailSentAt && customerEmail) {
    try {
      await sendOrderDeliveredEmail(customerEmail, currentOrder.order_number)
      deliveredEmailSentAt = new Date().toISOString()
    } catch (emailErr) {
      console.warn('[updateOrderStatus] Non-fatal email error on delivery:', emailErr)
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      status_history: history as any,
      shipped_email_sent_at: shippedEmailSentAt,
      delivered_email_sent_at: deliveredEmailSentAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) return { error: error.message }

  // Log in admin audit logs
  if (adminUserId) {
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUserId,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'orders',
        entity_id: orderId,
        metadata: { from: currentOrder.status, to: newStatus },
      })
    } catch {}
  }

  return { data }
}

export interface UpdateFulfillmentInput {
  orderId: string
  courierPartner: string
  trackingNumber: string
  trackingUrl?: string | null
  dispatchDate?: string | null
  packageWeightGrams?: number | null
  packageDimensions?: { length: number; width: number; height: number } | null
  estimatedDeliveryMin?: string | null
  estimatedDeliveryMax?: string | null
  adminUserId?: string
}

/**
 * Updates logistics, AWB tracking, weight and dimensions WITHOUT automatically marking the order as shipped.
 */
export async function updateFulfillmentDetails(input: UpdateFulfillmentInput) {
  const {
    orderId,
    courierPartner,
    trackingNumber,
    trackingUrl,
    dispatchDate,
    packageWeightGrams,
    packageDimensions,
    estimatedDeliveryMin,
    estimatedDeliveryMax,
    adminUserId,
  } = input

  // Validate tracking URL if provided
  if (trackingUrl && trackingUrl.trim()) {
    const cleanUrl = trackingUrl.trim()
    if (!validateTrackingUrl(cleanUrl)) {
      return { error: 'Tracking URL must be a valid HTTPS web address (e.g. https://track.delhivery.com/...)' }
    }
  }

  if (!isSupabaseConfigured()) {
    const devOrders = getDevOrders()
    const found = devOrders.find((o) => o.id === orderId || o.order_number === orderId)
    if (!found) return { error: 'Order not found' }

    found.carrier = courierPartner.trim()
    found.tracking_number = trackingNumber.trim()
    found.tracking_url = trackingUrl?.trim() || null
    found.dispatch_date = dispatchDate || new Date().toISOString()
    found.package_weight_grams = packageWeightGrams || null
    found.package_dimensions = packageDimensions || null
    found.estimated_delivery_min = estimatedDeliveryMin || null
    found.estimated_delivery_max = estimatedDeliveryMax || null
    found.updated_at = new Date().toISOString()

    saveDevOrder(found)
    return { data: found }
  }

  const supabase = await createServiceClient()

  const { data: currentOrder, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, carrier, tracking_number')
    .eq('id', orderId)
    .single()

  if (fetchErr || !currentOrder) return { error: 'Order not found' }

  // Update order record (preserves current status)
  const { data, error } = await supabase
    .from('orders')
    .update({
      carrier: courierPartner.trim(),
      tracking_number: trackingNumber.trim(),
      tracking_url: trackingUrl?.trim() || null,
      dispatch_date: dispatchDate || new Date().toISOString(),
      package_weight_grams: packageWeightGrams || null,
      package_dimensions: packageDimensions as any || null,
      estimated_delivery_min: estimatedDeliveryMin || null,
      estimated_delivery_max: estimatedDeliveryMax || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) return { error: error.message }

  // Also upsert/record in shipments table
  try {
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existingShipment) {
      await supabase
        .from('shipments')
        .update({
          courier: courierPartner.trim(),
          awb: trackingNumber.trim(),
          tracking_id: trackingNumber.trim(),
          tracking_url: trackingUrl?.trim() || null,
          tracking_data: {
            package_weight_grams: packageWeightGrams,
            package_dimensions: packageDimensions,
            estimated_delivery_min: estimatedDeliveryMin,
            estimated_delivery_max: estimatedDeliveryMax,
          } as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingShipment.id)
    } else {
      await supabase
        .from('shipments')
        .insert({
          order_id: orderId,
          courier: courierPartner.trim(),
          awb: trackingNumber.trim(),
          tracking_id: trackingNumber.trim(),
          tracking_url: trackingUrl?.trim() || null,
          status: currentOrder.status,
          tracking_data: {
            package_weight_grams: packageWeightGrams,
            package_dimensions: packageDimensions,
            estimated_delivery_min: estimatedDeliveryMin,
            estimated_delivery_max: estimatedDeliveryMax,
          } as any,
        })
    }
  } catch (shipmentErr) {
    console.warn('[updateFulfillmentDetails] Non-fatal shipments table update:', shipmentErr)
  }

  // Admin audit log
  if (adminUserId) {
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUserId,
        action: 'UPDATE_FULFILLMENT',
        entity: 'orders',
        entity_id: orderId,
        metadata: {
          courierPartner,
          trackingNumber,
          trackingUrl,
          packageWeightGrams,
        },
      })
    } catch {}
  }

  return { data }
}

/**
 * Generates a clean, copyable text summary for pasting into courier booking dashboards (Shiprocket, Delhivery, Blue Dart, DTDC)
 */
export function formatCourierSummary(order: any): string {
  const addr = (order.shipping_address as any) || {}
  const items = (order.order_items as any[]) || []
  const itemsFormatted = items.map((it: any) => {
    const v = it.variant_info || {}
    const parts = [v.size ? `Size: ${v.size}` : '', v.color ? `Color: ${v.color}` : ''].filter(Boolean).join(', ')
    return `• ${it.quantity}x ${it.product_name || 'Apparel'} ${parts ? `(${parts})` : ''}`
  }).join('\n')

  const isCod = order.payment_method === 'cod'
  const codAmount = isCod ? `₹${(order.total_amount || 0).toLocaleString('en-IN')}` : '₹0 (PREPAID - DO NOT COLLECT)'
  const phone = order.guest_phone || addr.phone || 'N/A'

  return `BUBBLE BOOM — COURIER DISPATCH SUMMARY
========================================
Order Reference : ${order.order_number}
Order Date      : ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}

RECIPIENT & DELIVERY DETAILS
----------------------------------------
Name            : ${addr.full_name || 'Customer'}
Phone           : ${phone}
Address Line 1  : ${addr.address_line1 || ''}
${addr.address_line2 ? `Address Line 2  : ${addr.address_line2}\n` : ''}${addr.landmark ? `Landmark        : ${addr.landmark}\n` : ''}City            : ${addr.city || ''}
State           : ${addr.state || ''}
PIN Code        : ${addr.pin_code || ''}
Country         : ${addr.country || 'India'}

PACKAGE & SHIPMENT SPECIFICATIONS
----------------------------------------
Items Ordered   :
${itemsFormatted || '• Streetwear Apparel (1 item)'}
Package Weight  : ${order.package_weight_grams ? `${order.package_weight_grams} g` : 'Est. 450 g'}
Dimensions      : ${order.package_dimensions ? `${order.package_dimensions.length}x${order.package_dimensions.width}x${order.package_dimensions.height} cm` : 'Standard Mailer (30x25x5 cm)'}
Courier Assigned: ${order.carrier || 'Pending Assignment'}
AWB / Tracking  : ${order.tracking_number || 'Pending Assignment'}
${order.tracking_url ? `Tracking URL    : ${order.tracking_url}\n` : ''}
PAYMENT & COLLECTION
----------------------------------------
Payment Method  : ${order.payment_method === 'cod' ? 'CASH ON DELIVERY (COD)' : 'ONLINE (PREPAID CASHFREE)'}
Payment Status  : ${order.payment_status?.toUpperCase()}
Collectable COD : ${codAmount}
========================================`
}

export async function cancelOrder(orderId: string, reason: string, cancelledByUserId?: string) {
  if (!isSupabaseConfigured()) {
    const devOrders = getDevOrders()
    const found = devOrders.find((o) => o.id === orderId || o.order_number === orderId)
    if (!found) return { error: 'Order not found' }

    // Ownership check for customers
    if (cancelledByUserId && found.user_id && found.user_id !== cancelledByUserId) {
      return { error: 'You are not authorized to cancel this order.' }
    }

    if (!['pending', 'confirmed', 'unfulfilled', 'packed', 'processing'].includes(found.status)) {
      return {
        error: `Orders with status "${found.status}" cannot be cancelled. Cancellation is only allowed before parcel dispatch.`,
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

  // Check ownership if cancelled by a customer
  if (cancelledByUserId && order.user_id && order.user_id !== cancelledByUserId) {
    const adminCheck = await isAdmin(cancelledByUserId)
    if (!adminCheck) {
      return { error: 'You are not authorized to cancel this order.' }
    }
  }

  if (!['pending', 'confirmed', 'unfulfilled', 'packed', 'processing'].includes(order.status)) {
    return {
      error: `Orders with status "${order.status}" cannot be cancelled. Cancellation is only allowed before parcel dispatch.`,
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

  inMemoryDevOrders = inMemoryDevOrders.filter((o: any) => o.id !== orderId && o.order_number !== orderId)
  deletedDevOrderIds.add(orderId)

  const mIdx = MOCK_ORDERS.findIndex((o) => o.id === orderId || o.order_number === orderId)
  if (mIdx >= 0) {
    MOCK_ORDERS.splice(mIdx, 1)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('payments').delete().eq('order_id', orderId)
      await supabase.from('shipments').delete().eq('order_id', orderId)
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
 * Public track order lookup requiring both order number AND matching phone/email verification.
 * Masks customer personal delivery address for privacy.
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

    // Mask sensitive address details for public lookup
    const maskedOrder = {
      ...order,
      shipping_address: {
        city: address?.city,
        state: address?.state,
        pin_code: address?.pin_code,
        country: address?.country || 'India',
      },
    }

    return { data: maskedOrder }
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
      tracking_url,
      dispatch_date,
      estimated_delivery_min,
      estimated_delivery_max,
      guest_email,
      guest_phone,
      shipping_address,
      status_history,
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

  // Mask sensitive address details for public lookup
  const maskedOrder = {
    ...order,
    shipping_address: {
      city: address?.city,
      state: address?.state,
      pin_code: address?.pin_code,
      country: address?.country || 'India',
    },
  }

  return { data: maskedOrder }
}

