import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getStoreSettings, StoreOrderSettings, StoreExchangeSettings } from '@/lib/settings'
import { adjustInventory } from '@/lib/inventory'
import { createCashfreeRefund } from '@/lib/payments/cashfree'
import { queueOrderNotification } from '@/lib/emails/notifications'
import { getDevOrders } from '@/lib/orders'
import crypto from 'crypto'

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'pickup_scheduled'
  | 'in_transit'
  | 'received'
  | 'inspected'
  | 'refund_processing'
  | 'refunded'
  | 'exchange_dispatched'
  | 'completed'
  | 'cancelled'

export type RefundStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'manual_review' | 'not_applicable'
export type PickupStatus = 'pending' | 'scheduled' | 'out_for_pickup' | 'picked_up' | 'failed' | 'cancelled'

export interface BankDetails {
  account_holder_name: string
  account_number: string
  ifsc_code: string
  bank_name?: string
  upi_id?: string
}

export interface ReturnItemRecord {
  id: string
  return_id: string
  order_item_id: string
  quantity: number
  original_variant_id?: string | null
  exchange_variant_id?: string | null
  inspection_status?: 'pending' | 'passed' | 'failed' | 'restocked' | 'discarded'
  reason?: string | null
  created_at: string
  order_item?: any
  exchange_variant?: any
}

export interface ReturnRecord {
  id: string
  return_reference: string
  order_id: string
  user_id: string | null
  request_type: 'return' | 'exchange'
  status: ReturnStatus
  reason: string
  customer_notes?: string | null
  images: string[]
  refund_amount: number // in Rupees or Paise depending on context; standard in store is ₹
  refund_status: RefundStatus
  pickup_status: PickupStatus
  courier_name?: string | null
  reverse_awb?: string | null
  tracking_url?: string | null
  pickup_scheduled_date?: string | null
  received_at?: string | null
  inspection_result?: 'pass' | 'fail' | 'partial_pass' | null
  restock_decision?: boolean
  inspection_notes?: string | null
  rejection_reason?: string | null
  bank_details?: BankDetails | null
  exchange_order_id?: string | null
  created_at: string
  updated_at: string
  items?: ReturnItemRecord[]
  order?: any
}

export interface CreateReturnRequestInput {
  order_id: string
  user_id?: string | null
  request_type?: 'return' | 'exchange'
  order_item_id: string
  quantity: number
  reason: string
  notes?: string
  images?: string[]
  exchange_variant_id?: string | null
  bank_details?: BankDetails | null
}

// In-memory fallback cache for development or tests
const globalReturnStore = globalThis as unknown as {
  __bb_returns_map?: Map<string, ReturnRecord>
}

function getMemoryStore(): Map<string, ReturnRecord> {
  if (!globalReturnStore.__bb_returns_map) {
    globalReturnStore.__bb_returns_map = new Map()
  }
  return globalReturnStore.__bb_returns_map
}

export function _resetReturnStore() {
  getMemoryStore().clear()
}

/**
 * Generates an official Bubble Boom Return or Exchange reference
 * e.g., RET-20261012-7890 or EXC-20261012-3456
 */
export function generateReturnReference(type: 'return' | 'exchange'): string {
  const prefix = type === 'exchange' ? 'EXC' : 'RET'
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${dateStr}-${randomNum}`
}

/**
 * Validates delivery status, delivered timestamp, and return window (7 days or store settings)
 */
export async function isOrderEligibleForReturn(
  orderId: string
): Promise<{ eligible: boolean; reason?: string; order?: any; remainingDays?: number }> {
  let order: any = null

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .maybeSingle()
      order = data
    } catch {}
  }

  if (!order) {
    try {
      const devOrders = getDevOrders()
      order = devOrders.find((o) => o.id === orderId || o.order_number === orderId) || null
    } catch {}
  }

  if (!order) {
    return { eligible: false, reason: 'Order not found' }
  }

  // Only delivered orders are eligible for return/exchange
  if (order.status !== 'delivered') {
    return {
      eligible: false,
      reason: `Orders can only be returned after delivery. Current status: ${order.status.replace(/_/g, ' ')}.`,
      order,
    }
  }

  // Check store return/exchange settings window
  const orderSettings = await getStoreSettings<StoreOrderSettings>('orders')
  const exchangeSettings = await getStoreSettings<StoreExchangeSettings>('exchange')
  const returnWindowDays = Math.max(
    orderSettings?.return_window_days || 7,
    exchangeSettings?.exchange_window_days || 7
  )

  // Use delivered_email_sent_at, or updated_at, or created_at as delivered timestamp
  const deliveryIso = order.delivered_email_sent_at || order.updated_at || order.created_at
  const deliveredDate = new Date(deliveryIso)
  const windowEnd = new Date(deliveredDate.getTime() + returnWindowDays * 24 * 60 * 60 * 1000)
  const now = new Date()

  if (now > windowEnd) {
    return {
      eligible: false,
      reason: `Return window of ${returnWindowDays} calendar days from delivery has expired.`,
      order,
      remainingDays: 0,
    }
  }

  const remainingDays = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return {
    eligible: true,
    order,
    remainingDays,
  }
}

/**
 * Calculates remaining unreturned quantity for an order item to prevent over-returning
 */
export async function getUnreturnedItemQuantity(
  orderId: string,
  orderItemId: string
): Promise<{ purchased: number; alreadyRequested: number; remainingEligible: number }> {
  let purchased = 0
  let alreadyRequested = 0

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: item } = await supabase
        .from('order_items')
        .select('quantity')
        .eq('id', orderItemId)
        .maybeSingle()
      purchased = item?.quantity || 0

      // Sum active returns for this order item
      const allReturns = await getAllReturns()
      const relevantReturns = allReturns.filter(
        (r) => (r.order_id === orderId || r.order?.id === orderId) && r.status !== 'cancelled' && r.status !== 'rejected'
      )

      for (const ret of relevantReturns) {
        if (ret.items) {
          for (const it of ret.items) {
            if (it.order_item_id === orderItemId) {
              alreadyRequested += it.quantity
            }
          }
        }
      }
    } catch {}
  }

  const remainingEligible = Math.max(0, purchased - alreadyRequested)
  return { purchased, alreadyRequested, remainingEligible }
}

/**
 * Validates available stock for an exchange variant
 */
export async function validateExchangeVariant(
  exchangeVariantId: string,
  requestedQuantity: number
): Promise<{ valid: boolean; error?: string; variant?: any }> {
  if (!exchangeVariantId) {
    return { valid: false, error: 'Exchange replacement variant is required' }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: variant } = await supabase
        .from('product_variants')
        .select('*, product:products(*)')
        .eq('id', exchangeVariantId)
        .maybeSingle()

      if (!variant) {
        return { valid: false, error: 'Selected exchange variant not found' }
      }

      if (variant.is_active === false) {
        return { valid: false, error: 'Selected exchange variant is currently inactive' }
      }

      if (variant.stock < requestedQuantity) {
        return {
          valid: false,
          error: `Selected variant is currently out of stock (${variant.stock} available)`,
          variant,
        }
      }

      return { valid: true, variant }
    } catch (err: any) {
      return { valid: false, error: err.message || 'Variant validation failed' }
    }
  }

  return { valid: true }
}

/**
 * Persists return record safely to Supabase (direct tables with store_settings fallback)
 */
async function persistReturnRecord(record: ReturnRecord): Promise<void> {
  getMemoryStore().set(record.id, record)

  if (!isSupabaseConfigured()) return

  try {
    const supabase = await createServiceClient()

    // 1. Try public.returns table
    const { error: retErr } = await (supabase.from('returns') as any).upsert({
      id: record.id,
      return_reference: record.return_reference,
      order_id: record.order_id,
      user_id: record.user_id,
      request_type: record.request_type,
      status: record.status,
      reason: record.reason,
      customer_notes: record.customer_notes || null,
      images: record.images || [],
      refund_amount: record.refund_amount,
      refund_status: record.refund_status,
      pickup_status: record.pickup_status,
      courier_name: record.courier_name || null,
      reverse_awb: record.reverse_awb || null,
      tracking_url: record.tracking_url || null,
      pickup_scheduled_date: record.pickup_scheduled_date || null,
      received_at: record.received_at || null,
      inspection_result: record.inspection_result || null,
      restock_decision: record.restock_decision ?? true,
      inspection_notes: record.inspection_notes || null,
      rejection_reason: record.rejection_reason || null,
      bank_details: record.bank_details as any,
      exchange_order_id: record.exchange_order_id || null,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })

    if (!retErr && record.items && record.items.length > 0) {
      for (const item of record.items) {
        await (supabase.from('return_items') as any).upsert({
          id: item.id,
          return_id: record.id,
          order_item_id: item.order_item_id,
          quantity: item.quantity,
          original_variant_id: item.original_variant_id || null,
          exchange_variant_id: item.exchange_variant_id || null,
          inspection_status: item.inspection_status || 'pending',
          reason: item.reason || record.reason,
          created_at: item.created_at,
        })
      }
      return
    }

    // 2. Resilient fallback to store_settings
    const key = `return_${record.id}`
    await supabase.from('store_settings').upsert({
      key,
      value: record as any,
      updated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    console.warn('[returns] Persistence note:', err.message)
  }
}

/**
 * Fetch all returns across Supabase tables and fallback store
 */
export async function getAllReturns(): Promise<ReturnRecord[]> {
  const result: ReturnRecord[] = []
  const seenIds = new Set<string>()

  // 1. From memory
  for (const item of getMemoryStore().values()) {
    result.push(item)
    seenIds.add(item.id)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()

      // 2. Query public.returns
      const { data: dbReturns, error } = await (supabase.from('returns') as any)
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && dbReturns) {
        for (const rawRet of dbReturns) {
          const ret = rawRet as any
          if (!seenIds.has(ret.id)) {
            // Hydrate items
            const { data: items } = await (supabase.from('return_items') as any)
              .select('*, order_item:order_items(*)')
              .eq('return_id', ret.id)

            // Hydrate order
            const { data: ord } = await supabase
              .from('orders')
              .select('id, order_number, total_amount, payment_method, shipping_address, customer_email:guest_email')
              .eq('id', ret.order_id)
              .maybeSingle()

            const record: ReturnRecord = {
              id: ret.id,
              return_reference: ret.return_reference || `RET-${ret.id.slice(0, 8).toUpperCase()}`,
              order_id: ret.order_id,
              user_id: ret.user_id,
              request_type: (ret.request_type as any) || 'return',
              status: ret.status as ReturnStatus,
              reason: ret.reason,
              customer_notes: ret.customer_notes || ret.notes || null,
              images: ret.images || [],
              refund_amount: ret.refund_amount || 0,
              refund_status: (ret.refund_status as any) || 'pending',
              pickup_status: (ret.pickup_status as any) || 'pending',
              courier_name: ret.courier_name || null,
              reverse_awb: ret.reverse_awb || null,
              tracking_url: ret.tracking_url || null,
              pickup_scheduled_date: ret.pickup_scheduled_date || null,
              received_at: ret.received_at || null,
              inspection_result: ret.inspection_result || null,
              restock_decision: ret.restock_decision ?? true,
              inspection_notes: ret.inspection_notes || null,
              rejection_reason: ret.rejection_reason || null,
              bank_details: ret.bank_details as any,
              exchange_order_id: ret.exchange_order_id || null,
              created_at: ret.created_at,
              updated_at: ret.updated_at,
              items: items || [],
              order: ord,
            }

            result.push(record)
            seenIds.add(ret.id)
            getMemoryStore().set(record.id, record)
          }
        }
      }

      // 3. Query store_settings for fallback return records
      const { data: settingRows } = await supabase
        .from('store_settings')
        .select('*')
        .like('key', 'return_%')

      if (settingRows) {
        for (const row of settingRows) {
          const val = row.value as unknown as ReturnRecord
          if (val && val.id && !seenIds.has(val.id)) {
            result.push(val)
            seenIds.add(val.id)
            getMemoryStore().set(val.id, val)
          }
        }
      }
    } catch {}
  }

  // Sort descending by created_at
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return result
}

/**
 * Fetch a specific return by ID or Reference
 */
export async function getReturnById(returnId: string): Promise<ReturnRecord | null> {
  const all = await getAllReturns()
  return (
    all.find(
      (r) =>
        r.id === returnId ||
        r.return_reference?.toLowerCase() === returnId.toLowerCase()
    ) || null
  )
}

/**
 * Fetch returns for a specific order
 */
export async function getReturnsForOrder(orderId: string): Promise<ReturnRecord[]> {
  const all = await getAllReturns()
  return all.filter((r) => r.order_id === orderId || r.order?.id === orderId || r.order?.order_number === orderId)
}

/**
 * Create a new Return or Exchange request from customer
 */
export async function createReturnRequest(
  input: CreateReturnRequestInput
): Promise<{ success: boolean; data?: ReturnRecord; error?: string }> {
  // 1. Check order eligibility (delivered, within 7 days)
  const eligibility = await isOrderEligibleForReturn(input.order_id)
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason }
  }

  const order = eligibility.order
  const requestType = input.request_type || (input.exchange_variant_id ? 'exchange' : 'return')

  // 2. Fetch order item and price details
  let orderItem: any = null
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('id', input.order_item_id)
        .maybeSingle()
      orderItem = data
    } catch {}
  }

  if (!orderItem) {
    return { success: false, error: 'Selected order item was not found.' }
  }

  // 3. Verify eligible quantity
  const qtyCheck = await getUnreturnedItemQuantity(order.id, input.order_item_id)
  if (input.quantity > qtyCheck.remainingEligible) {
    return {
      success: false,
      error: `Requested quantity (${input.quantity}) exceeds eligible unreturned quantity (${qtyCheck.remainingEligible}).`,
    }
  }

  // 4. If exchange, validate target variant availability
  let exchangeVariantData: any = null
  if (requestType === 'exchange') {
    if (!input.exchange_variant_id) {
      return { success: false, error: 'Please choose a size or color variant for your exchange.' }
    }
    const valRes = await validateExchangeVariant(input.exchange_variant_id, input.quantity)
    if (!valRes.valid) {
      return { success: false, error: valRes.error }
    }
    exchangeVariantData = valRes.variant
  }

  // 5. Calculate refund amount (only for returns, ₹0 for direct exchanges)
  const itemUnitPrice = Math.round(orderItem.total_amount / orderItem.quantity)
  const refundAmount = requestType === 'return' ? itemUnitPrice * input.quantity : 0

  const returnId = crypto.randomUUID()
  const returnReference = generateReturnReference(requestType)
  const now = new Date().toISOString()

  const itemRecord: ReturnItemRecord = {
    id: crypto.randomUUID(),
    return_id: returnId,
    order_item_id: input.order_item_id,
    quantity: input.quantity,
    original_variant_id: orderItem.variant_id || null,
    exchange_variant_id: input.exchange_variant_id || null,
    inspection_status: 'pending',
    reason: input.reason,
    created_at: now,
    order_item: orderItem,
    exchange_variant: exchangeVariantData,
  }

  const returnRecord: ReturnRecord = {
    id: returnId,
    return_reference: returnReference,
    order_id: order.id,
    user_id: input.user_id || order.user_id || null,
    request_type: requestType,
    status: 'requested',
    reason: input.reason,
    customer_notes: input.notes || null,
    images: input.images || [],
    refund_amount: refundAmount,
    refund_status: requestType === 'return' ? 'pending' : 'not_applicable',
    pickup_status: 'pending',
    courier_name: null,
    reverse_awb: null,
    tracking_url: null,
    pickup_scheduled_date: null,
    received_at: null,
    inspection_result: null,
    restock_decision: true,
    inspection_notes: null,
    rejection_reason: null,
    bank_details: input.bank_details || null,
    exchange_order_id: null,
    created_at: now,
    updated_at: now,
    items: [itemRecord],
    order: {
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      shipping_address: order.shipping_address,
      customer_email: order.guest_email || (order.shipping_address as any)?.email,
    },
  }

  // 6. Persist
  await persistReturnRecord(returnRecord)

  // 7. Update order status if not already set
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      await supabase
        .from('orders')
        .update({
          status: 'return_requested',
          updated_at: now,
        })
        .eq('id', order.id)
    } catch {}
  }

  // 8. Queue immediate notification email to customer
  const customerEmail =
    order.guest_email ||
    (order.shipping_address as any)?.email ||
    (order.shipping_address as any)?.customer_email

  if (customerEmail) {
    const eventType = requestType === 'exchange' ? 'exchange_requested' : 'return_requested'
    try {
      await queueOrderNotification(
        {
          order_id: order.id,
          order_number: order.order_number,
          event: eventType,
          recipient_email: customerEmail,
          customer_name: (order.shipping_address as any)?.full_name || 'Customer',
          total_amount: refundAmount,
          payment_method: order.payment_method,
          payment_status: 'return_requested',
          items: [
            {
              product_id: orderItem.product_id,
              product_name: orderItem.product_name,
              quantity: input.quantity,
              price: itemUnitPrice,
              total_amount: refundAmount,
              variant_info: orderItem.variant_info,
            },
          ],
          notes: input.notes,
        },
        { immediate: true }
      )
    } catch (mailErr) {
      console.warn('[returns] Customer notification note:', mailErr)
    }
  }

  return { success: true, data: returnRecord }
}

/**
 * Admin Action: Approve or Reject Return/Exchange Request
 */
export async function updateReturnApproval(
  returnId: string,
  action: 'approve' | 'reject',
  options?: {
    rejection_reason?: string
    adminNotes?: string
    adminUserId?: string
  }
): Promise<{ success: boolean; data?: ReturnRecord; error?: string }> {
  const ret = await getReturnById(returnId)
  if (!ret) return { success: false, error: 'Return record not found' }

  const newStatus: ReturnStatus = action === 'approve' ? 'approved' : 'rejected'
  ret.status = newStatus
  ret.updated_at = new Date().toISOString()
  if (action === 'reject') {
    ret.rejection_reason = options?.rejection_reason || 'Claim did not satisfy return condition requirements.'
  }
  if (options?.adminNotes) {
    ret.inspection_notes = options.adminNotes
  }

  await persistReturnRecord(ret)

  // Send email to customer
  const customerEmail = ret.order?.customer_email || ret.order?.shipping_address?.email
  if (customerEmail) {
    try {
      await queueOrderNotification(
        {
          order_id: ret.order_id,
          order_number: ret.order?.order_number || ret.order_id,
          event: action === 'approve' ? 'return_approved' : 'return_rejected',
          recipient_email: customerEmail,
          customer_name: ret.order?.shipping_address?.full_name || 'Customer',
          total_amount: ret.refund_amount,
          payment_method: ret.order?.payment_method || 'prepaid',
          payment_status: ret.status,
          items:
            ret.items?.map((it) => ({
              product_name: it.order_item?.product_name || 'Bubble Boom Apparel',
              quantity: it.quantity,
              price: ret.refund_amount,
            })) || [],
          cancellation_reason: ret.rejection_reason,
          notes: options?.adminNotes,
        },
        { immediate: true }
      )
    } catch {}
  }

  return { success: true, data: ret }
}

/**
 * Admin Action: Schedule Courier Reverse Pickup (Manual entry or Shiprocket tracking)
 */
export async function scheduleReversePickup(
  returnId: string,
  courierDetails: {
    courier_name: string
    reverse_awb: string
    tracking_url?: string
    pickup_date?: string
    adminUserId?: string
  }
): Promise<{ success: boolean; data?: ReturnRecord; error?: string }> {
  const ret = await getReturnById(returnId)
  if (!ret) return { success: false, error: 'Return record not found' }

  const cleanAwb = courierDetails.reverse_awb.trim()
  const cleanCourier = courierDetails.courier_name.trim()

  // Generate trackable URL if not supplied
  let trackingUrl = courierDetails.tracking_url?.trim()
  if (!trackingUrl) {
    const lower = cleanCourier.toLowerCase()
    if (lower.includes('shiprocket')) {
      trackingUrl = `https://shiprocket.co/tracking/${cleanAwb}`
    } else if (lower.includes('delhivery')) {
      trackingUrl = `https://www.delhivery.com/track/package/${cleanAwb}`
    } else if (lower.includes('bluedart')) {
      trackingUrl = `https://www.bluedart.com/tracking?handler=tnt&action=custtrack&awb=awb&numbers=${cleanAwb}`
    } else {
      trackingUrl = `https://track.bubbleboom.in/${cleanAwb}`
    }
  }

  ret.status = 'pickup_scheduled'
  ret.pickup_status = 'scheduled'
  ret.courier_name = cleanCourier
  ret.reverse_awb = cleanAwb
  ret.tracking_url = trackingUrl
  ret.pickup_scheduled_date = courierDetails.pickup_date || new Date().toISOString().slice(0, 10)
  ret.updated_at = new Date().toISOString()

  await persistReturnRecord(ret)

  // Dispatch pickup scheduled email
  const customerEmail = ret.order?.customer_email || ret.order?.shipping_address?.email
  if (customerEmail) {
    try {
      await queueOrderNotification(
        {
          order_id: ret.order_id,
          order_number: ret.order?.order_number || ret.order_id,
          event: 'pickup_scheduled',
          recipient_email: customerEmail,
          customer_name: ret.order?.shipping_address?.full_name || 'Customer',
          total_amount: ret.refund_amount,
          payment_method: ret.order?.payment_method || 'courier',
          payment_status: 'pickup_scheduled',
          items: [],
          carrier: cleanCourier,
          tracking_number: cleanAwb,
          tracking_url: trackingUrl,
        },
        { immediate: true }
      )
    } catch {}
  }

  return { success: true, data: ret }
}

/**
 * Admin Action: Mark returned item received at warehouse
 */
export async function markReturnReceived(
  returnId: string,
  adminUserId?: string
): Promise<{ success: boolean; data?: ReturnRecord; error?: string }> {
  const ret = await getReturnById(returnId)
  if (!ret) return { success: false, error: 'Return record not found' }

  ret.status = 'received'
  ret.pickup_status = 'picked_up'
  ret.received_at = new Date().toISOString()
  ret.updated_at = new Date().toISOString()

  await persistReturnRecord(ret)

  // Dispatch warehouse arrival email
  const customerEmail = ret.order?.customer_email || ret.order?.shipping_address?.email
  if (customerEmail) {
    try {
      await queueOrderNotification(
        {
          order_id: ret.order_id,
          order_number: ret.order?.order_number || ret.order_id,
          event: 'item_received',
          recipient_email: customerEmail,
          customer_name: ret.order?.shipping_address?.full_name || 'Customer',
          total_amount: ret.refund_amount,
          payment_method: ret.order?.payment_method || 'return',
          payment_status: 'received',
          items: [],
        },
        { immediate: true }
      )
    } catch {}
  }

  return { success: true, data: ret }
}

/**
 * Admin Action: Process Quality Inspection and Restock Decision
 */
export async function processReturnInspection(
  returnId: string,
  decision: 'approved' | 'rejected',
  restockDecision: boolean,
  adminNotes?: string,
  adminUserId?: string
): Promise<{ success: boolean; data?: ReturnRecord; error?: string }> {
  const ret = await getReturnById(returnId)
  if (!ret) return { success: false, error: 'Return record not found' }

  const now = new Date().toISOString()
  ret.inspection_result = decision === 'approved' ? 'pass' : 'fail'
  ret.restock_decision = restockDecision
  ret.inspection_notes = adminNotes || ret.inspection_notes
  ret.updated_at = now

  if (decision === 'approved') {
    ret.status = ret.request_type === 'exchange' ? 'inspected' : 'inspected'

    // Restock returned units into inventory if selected
    if (restockDecision && ret.items) {
      for (const item of ret.items) {
        const variantId = item.original_variant_id || item.order_item?.variant_id
        if (variantId) {
          try {
            await adjustInventory(
              variantId,
              item.quantity,
              ret.id,
              'return_restock',
              `Restocked after inspected return approval (${ret.return_reference})`,
              adminUserId
            )
          } catch (invErr) {
            console.warn('[returns] Restock error:', invErr)
          }
        }
      }
    }
  } else {
    ret.status = 'rejected'
    ret.rejection_reason = adminNotes || 'Item failed return quality inspection.'
  }

  await persistReturnRecord(ret)

  return { success: true, data: ret }
}

/**
 * Admin Action: Dispatch Size/Colour Exchange Order
 */
export async function dispatchExchangeOrder(
  returnId: string,
  options: {
    carrier: string
    tracking_number: string
    tracking_url?: string
    adminUserId?: string
  }
): Promise<{ success: boolean; data?: ReturnRecord; error?: string }> {
  const ret = await getReturnById(returnId)
  if (!ret) return { success: false, error: 'Return record not found' }

  if (ret.request_type !== 'exchange') {
    return { success: false, error: 'This request is a return, not an exchange' }
  }

  ret.status = 'exchange_dispatched'
  ret.updated_at = new Date().toISOString()

  // Decrement replacement variant stock from inventory
  if (ret.items) {
    for (const item of ret.items) {
      if (item.exchange_variant_id) {
        try {
          await adjustInventory(
            item.exchange_variant_id,
            -item.quantity,
            ret.id,
            'exchange_dispatch',
            `Stock decremented for exchange fulfillment (${ret.return_reference})`,
            options.adminUserId
          )
        } catch (adjErr) {
          console.warn('[returns] Exchange stock adjustment note:', adjErr)
        }
      }
    }
  }

  await persistReturnRecord(ret)

  // Dispatch exchange dispatched email
  const customerEmail = ret.order?.customer_email || ret.order?.shipping_address?.email
  if (customerEmail) {
    try {
      await queueOrderNotification(
        {
          order_id: ret.order_id,
          order_number: ret.order?.order_number || ret.order_id,
          event: 'exchange_dispatched',
          recipient_email: customerEmail,
          customer_name: ret.order?.shipping_address?.full_name || 'Customer',
          total_amount: 0,
          payment_method: 'exchange',
          payment_status: 'dispatched',
          carrier: options.carrier,
          tracking_number: options.tracking_number,
          tracking_url: options.tracking_url,
          items:
            ret.items?.map((it) => ({
              product_name: it.order_item?.product_name || 'Exchange Replacement Item',
              quantity: it.quantity,
              price: 0,
            })) || [],
        },
        { immediate: true }
      )
    } catch {}
  }

  return { success: true, data: ret }
}

/**
 * Refund Ceiling and Execution (Cashfree prepaid or verified COD manual payout)
 */
export async function executeRefund(
  orderId: string,
  returnId: string | null,
  amountPaise: number,
  reason: string,
  adminUserId?: string,
  bankReference?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (amountPaise <= 0) {
    return { success: false, error: 'Refund amount must be greater than zero.' }
  }

  let order: any = null
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()
      if (data) {
        order = data
      } else {
        const { data: byNum } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', orderId)
          .maybeSingle()
        order = byNum
      }
    } catch {}
  }

  if (!order) {
    try {
      const devOrders = getDevOrders()
      order = devOrders.find((o) => o.id === orderId || o.order_number === orderId) || null
    } catch {}
  }

  if (!order) return { success: false, error: 'Order not found' }

  const orderTotalPaise = Math.round(order.total_amount * 100)

  // Validate cumulative refund ceilings
  let totalAlreadyRefundedPaise = 0
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: dbRefunds } = await supabase
        .from('refunds')
        .select('amount_paise, status')
        .eq('order_id', order.id)
        .in('status', ['successful', 'processing', 'pending'])
      if (dbRefunds) {
        totalAlreadyRefundedPaise = dbRefunds.reduce((sum, r) => sum + r.amount_paise, 0)
      }
    } catch {}
  }

  if (totalAlreadyRefundedPaise + amountPaise > orderTotalPaise) {
    return {
      success: false,
      error: `Cumulative refunds (₹${((totalAlreadyRefundedPaise + amountPaise) / 100).toFixed(2)}) exceed captured order total (₹${order.total_amount}). Already refunded: ₹${(totalAlreadyRefundedPaise / 100).toFixed(2)}.`,
    }
  }

  const isCashfree = order.payment_method === 'cashfree'

  if (isCashfree) {
    // Online Cashfree gateway refund
    const refundId = `REF_${Date.now()}`
    const cfRes = await createCashfreeRefund({
      order_id: order.order_number,
      refund_id: refundId,
      refund_amount: amountPaise / 100, // Rupees
      refund_note: reason,
    })

    const refundStatus = 'error' in cfRes ? 'failed' : 'successful'
    const refundRecord = {
      id: crypto.randomUUID(),
      order_id: order.id,
      return_id: returnId,
      cashfree_refund_id: refundId,
      amount_paise: amountPaise,
      refund_type: 'cashfree',
      status: refundStatus,
      reason,
      notes: 'error' in cfRes ? cfRes.error : 'Cashfree online refund initiated successfully',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServiceClient()
        await (supabase.from('refunds') as any).insert(refundRecord)
      } catch {}
    }

    // Update return record status
    if (returnId) {
      const ret = await getReturnById(returnId)
      if (ret) {
        ret.status = 'refunded'
        ret.refund_status = refundStatus as any
        ret.updated_at = new Date().toISOString()
        await persistReturnRecord(ret)
      }
    }

    // Trigger refund completed customer email
    const customerEmail = order.guest_email || (order.shipping_address as any)?.email
    if (customerEmail) {
      try {
        await queueOrderNotification(
          {
            order_id: order.id,
            order_number: order.order_number,
            event: 'refund_completed',
            recipient_email: customerEmail,
            customer_name: (order.shipping_address as any)?.full_name || 'Customer',
            total_amount: Math.round(amountPaise / 100),
            payment_method: 'cashfree',
            payment_status: 'refunded',
            items: [],
          },
          { immediate: true }
        )
      } catch {}
    }

    if ('error' in cfRes) {
      return { success: false, error: cfRes.error }
    }

    return { success: true, data: refundRecord }
  } else {
    // Verified COD manual bank payout workflow
    const refundRecord = {
      id: crypto.randomUUID(),
      order_id: order.id,
      return_id: returnId,
      amount_paise: amountPaise,
      refund_type: 'cod_manual',
      status: bankReference ? 'successful' : 'manual_review',
      reason,
      bank_reference: bankReference || null,
      notes: bankReference
        ? `Manual COD bank transfer completed. Ref: ${bankReference}`
        : 'COD payout recorded for manual customer bank transfer / UPI payout',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServiceClient()
        await (supabase.from('refunds') as any).insert(refundRecord)
      } catch {}
    }

    if (returnId) {
      const ret = await getReturnById(returnId)
      if (ret) {
        ret.status = bankReference ? 'refunded' : 'refund_processing'
        ret.refund_status = bankReference ? 'successful' : 'manual_review'
        ret.updated_at = new Date().toISOString()
        await persistReturnRecord(ret)
      }
    }

    // Trigger refund completed email if bank reference provided
    if (bankReference) {
      const customerEmail = order.guest_email || (order.shipping_address as any)?.email
      if (customerEmail) {
        try {
          await queueOrderNotification(
            {
              order_id: order.id,
              order_number: order.order_number,
              event: 'refund_completed',
              recipient_email: customerEmail,
              customer_name: (order.shipping_address as any)?.full_name || 'Customer',
              total_amount: Math.round(amountPaise / 100),
              payment_method: 'cod',
              payment_status: 'refunded',
              items: [],
              notes: `Bank Reference: ${bankReference}`,
            },
            { immediate: true }
          )
        } catch {}
      }
    }

    return { success: true, data: refundRecord }
  }
}
