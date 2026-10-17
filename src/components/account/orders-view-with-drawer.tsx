'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Package,
  Calendar,
  CreditCard,
  MapPin,
  Truck,
  ExternalLink,
  Download,
  RotateCcw,
  XCircle,
  X,
  ChevronRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Phone,
  FileText,
  Loader2,
} from 'lucide-react'
import { getSafeImageUrl, formatPrice } from '@/lib/utils'

export interface OrderItem {
  id: string
  product_id?: string
  product_name: string
  quantity: number
  selling_price?: number
  unit_price?: number
  total_amount?: number
  image_url?: string
  variant_info?: {
    size?: string
    color?: string
    sku?: string
    image_url?: string
  }
  status?: string
}

export interface CustomerOrder {
  id: string
  order_number: string
  created_at: string
  updated_at?: string
  status: string
  payment_status: string
  payment_method: string
  total_amount: number
  subtotal?: number
  discount_amount?: number
  shipping_fee?: number
  tax_amount?: number
  shipping_address?: any
  billing_address?: any
  tracking_number?: string | null
  tracking_url?: string | null
  courier_name?: string | null
  order_items?: OrderItem[]
  delivered_email_sent_at?: string | null
}

interface OrdersViewWithDrawerProps {
  orders: CustomerOrder[]
}

type FilterTab = 'all' | 'processing' | 'delivered' | 'cancelled'

export function OrdersViewWithDrawer({ orders }: OrdersViewWithDrawerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  // Drawer ref for keyboard ESC handling
  const drawerRef = useRef<HTMLDivElement>(null)

  // 1. Sync URL query parameter (?orderId=BB-...) with Drawer state
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId')
    if (orderIdParam) {
      const found = orders.find(
        (o) => o.order_number === orderIdParam || o.id === orderIdParam
      )
      if (found) {
        setSelectedOrder(found)
      }
    }
  }, [searchParams, orders])

  // 2. Lock body scroll when drawer is open
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedOrder])

  // 3. Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedOrder) {
        closeDrawer()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedOrder])

  const openDrawer = (order: CustomerOrder) => {
    setSelectedOrder(order)
    // Update URL query param without full page navigation
    const newUrl = `/account/orders?orderId=${encodeURIComponent(order.order_number)}`
    window.history.pushState(null, '', newUrl)
  }

  const closeDrawer = () => {
    setSelectedOrder(null)
    setCancellingOrderId(null)
    setCancelReason('')
    window.history.pushState(null, '', '/account/orders')
  }

  // Filter categorization
  const filteredOrders = orders.filter((ord) => {
    const s = ord.status.toLowerCase()
    if (activeFilter === 'all') return true
    if (activeFilter === 'processing') {
      return [
        'pending',
        'unfulfilled',
        'confirmed',
        'preparing',
        'packed',
        'pickup_scheduled',
        'shipped',
        'out_for_delivery',
      ].includes(s)
    }
    if (activeFilter === 'delivered') {
      return s === 'delivered'
    }
    if (activeFilter === 'cancelled') {
      return ['cancelled', 'delivery_exception', 'return_to_origin'].includes(s)
    }
    return true
  })

  // Counts for tabs
  const countAll = orders.length
  const countProcessing = orders.filter((o) =>
    [
      'pending',
      'unfulfilled',
      'confirmed',
      'preparing',
      'packed',
      'pickup_scheduled',
      'shipped',
      'out_for_delivery',
    ].includes(o.status.toLowerCase())
  ).length
  const countDelivered = orders.filter((o) => o.status.toLowerCase() === 'delivered').length
  const countCancelled = orders.filter((o) =>
    ['cancelled', 'delivery_exception', 'return_to_origin'].includes(o.status.toLowerCase())
  ).length

  // Cancellation Handler
  const handleCancelOrder = async (orderId: string) => {
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason')
      return
    }

    try {
      setIsCancelling(true)
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          reason: cancelReason.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order')
      }

      toast.success('Order cancelled successfully')
      closeDrawer()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel order')
    } finally {
      setIsCancelling(false)
    }
  }

  // Get readable status badge styling
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'delivered') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
    if (['cancelled', 'delivery_exception'].includes(s)) {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    if (['shipped', 'out_for_delivery'].includes(s)) {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return 'bg-neutral-100 text-neutral-800 border-neutral-200'
  }

  // Safe payment status determination
  const getPaymentBadge = (order: CustomerOrder) => {
    if (order.payment_method === 'cod') {
      if (order.status === 'delivered') {
        return { text: 'Cash on Delivery (Collected)', color: 'text-emerald-700 bg-emerald-50' }
      }
      return { text: 'Cash on Delivery (Pending)', color: 'text-amber-700 bg-amber-50' }
    }
    if (order.payment_status === 'paid') {
      return { text: 'Paid Online', color: 'text-emerald-700 bg-emerald-50' }
    }
    return { text: 'Payment Pending', color: 'text-amber-700 bg-amber-50' }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pb-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-black">
            MY ORDERS
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            View &amp; manage all your orders
          </p>
        </div>
        <span className="text-[11px] font-mono font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full self-start sm:self-auto">
          {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Total
        </span>
      </div>

      {/* Horizontal Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { key: 'all' as FilterTab, label: 'All', count: countAll },
          { key: 'processing' as FilterTab, label: 'In Processing', count: countProcessing },
          { key: 'delivered' as FilterTab, label: 'Delivered', count: countDelivered },
          { key: 'cancelled' as FilterTab, label: 'Cancelled', count: countCancelled },
        ].map((tab) => {
          const isActive = activeFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                isActive
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-black hover:text-black'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#F9F9FB] rounded-2xl p-12 border border-dashed border-neutral-300 text-center space-y-3">
          <Package className="w-10 h-10 text-neutral-400 mx-auto" />
          <h4 className="text-sm font-bold uppercase text-black tracking-wider">
            No Orders in this Category
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {activeFilter === 'all'
              ? "You haven't placed any orders yet. Discover our latest drops in the shop."
              : `No orders matching status '${activeFilter}'. Try selecting 'All' to review full history.`}
          </p>
          <Link
            href="/shop"
            className="inline-block px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((ord) => {
            const items = ord.order_items || []
            const paymentInfo = getPaymentBadge(ord)

            return (
              <div
                key={ord.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/90 hover:border-black/60 transition-all shadow-2xs space-y-4"
              >
                {/* Top Row: Order ID + Status Badge (Left) | Total Amount (Right) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-black">
                      {ord.order_number}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                        ord.status
                      )}`}
                    >
                      {ord.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black font-mono text-black">
                      {formatPrice(ord.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Second Row: Order Date · Item Count */}
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                  <span>
                    {new Date(ord.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span>·</span>
                  <span>
                    {items.length} {items.length === 1 ? 'Item' : 'Items'}
                  </span>
                  <span>·</span>
                  <span className={`text-[11px] px-2 py-0.2 rounded-full font-medium ${paymentInfo.color}`}>
                    {paymentInfo.text}
                  </span>
                </div>

                {/* Bottom Row: Product Thumbnails (Left) | VIEW DETAILS ↗ (Right) */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-4">
                  {/* Bottom Left: Product Thumbnails */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    {items.slice(0, 4).map((it, idx) => {
                      const v = it.variant_info || {}
                      const img = it.image_url || v.image_url || null
                      return (
                        <div
                          key={idx}
                          className="w-12 h-12 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 relative shrink-0 shadow-2xs"
                        >
                          {img ? (
                            <Image
                              src={getSafeImageUrl(img)}
                              alt={it.product_name || 'Product'}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono text-[9px] font-bold text-neutral-400">
                              BB
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {items.length > 4 && (
                      <span className="text-xs font-mono font-bold text-neutral-500 shrink-0">
                        +{items.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Bottom Right: VIEW DETAILS ↗ Action */}
                  <button
                    type="button"
                    onClick={() => openDrawer(ord)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>VIEW DETAILS</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PHASE 8: RIGHT-SIDE ORDER DETAILS DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Dimmed Backdrop */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Fixed Right-Side Drawer Panel (420-480px on desktop) */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-order-title"
            className="fixed inset-y-0 right-0 max-w-full w-full sm:w-[460px] md:w-[480px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-250 ease-out"
          >
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
                  Order Details
                </span>
                <h3 id="drawer-order-title" className="text-base sm:text-lg font-black font-mono text-black mt-0.5">
                  {selectedOrder.order_number}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Placed on{' '}
                  {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close details"
                className="p-2 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* 1. ORDER SUMMARY GRID */}
              <div className="bg-[#F9F9FB] rounded-xl p-4 border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Order Date:</span>
                  <span className="font-medium text-black">
                    {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Delivery Status:</span>
                  <span
                    className={`font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Payment Status:</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getPaymentBadge(selectedOrder).color}`}>
                    {getPaymentBadge(selectedOrder).text}
                  </span>
                </div>

                <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-sm">
                  <span className="font-bold text-black uppercase tracking-wider text-xs">Total Amount:</span>
                  <span className="font-black font-mono text-black text-base">
                    {formatPrice(selectedOrder.total_amount)}
                  </span>
                </div>
              </div>

              {/* 2. ORDER ITEMS */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-black">
                  ITEMS ({(selectedOrder.order_items || []).length})
                </h4>

                <div className="space-y-3">
                  {(selectedOrder.order_items || []).map((it) => {
                    const v = it.variant_info || {}
                    const img = it.image_url || v.image_url || null
                    const unitPrice = it.selling_price || it.unit_price || 0

                    return (
                      <div
                        key={it.id}
                        className="bg-white rounded-xl p-3.5 border border-neutral-200/90 flex gap-3.5 items-start"
                      >
                        <div className="w-16 h-16 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 relative shrink-0">
                          {img ? (
                            <Image
                              src={getSafeImageUrl(img)}
                              alt={it.product_name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono text-xs font-bold text-neutral-400">
                              BB
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-bold text-xs text-black truncate leading-tight">
                            {it.product_name}
                          </h5>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
                            {v.size && <span>Size: <strong className="text-black">{v.size}</strong></span>}
                            {v.color && <span>Color: <strong className="text-black">{v.color}</strong></span>}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="text-neutral-500 font-mono">
                              Qty: <strong className="text-black">{it.quantity}</strong>
                            </span>
                            <span className="font-bold font-mono text-black">
                              {formatPrice(unitPrice * it.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 3. DELIVERY ADDRESS */}
              {selectedOrder.shipping_address && (
                <div className="bg-[#F9F9FB] rounded-xl p-4 border border-neutral-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Shipping Address</span>
                  </div>
                  <div className="text-xs text-neutral-700 leading-relaxed space-y-0.5">
                    <p className="font-bold text-black">{selectedOrder.shipping_address.full_name}</p>
                    <p>{selectedOrder.shipping_address.address_line1}</p>
                    {selectedOrder.shipping_address.address_line2 && (
                      <p>{selectedOrder.shipping_address.address_line2}</p>
                    )}
                    <p>
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} –{' '}
                      <span className="font-mono font-bold">
                        {selectedOrder.shipping_address.pin_code || selectedOrder.shipping_address.postal_code}
                      </span>
                    </p>
                    {selectedOrder.shipping_address.phone && (
                      <p className="font-mono text-neutral-500 pt-1">
                        Phone: {selectedOrder.shipping_address.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 4. PAYMENT & COST BREAKDOWN */}
              <div className="bg-[#F9F9FB] rounded-xl p-4 border border-neutral-200/80 space-y-2.5 text-xs">
                <h5 className="font-bold uppercase tracking-wider text-black text-[11px] pb-1 border-b border-neutral-200/60">
                  Payment &amp; Charges
                </h5>

                <div className="flex items-center justify-between text-neutral-600">
                  <span>Payment Method:</span>
                  <span className="font-mono uppercase font-bold text-black">
                    {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Online / UPI'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-neutral-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatPrice(selectedOrder.subtotal || selectedOrder.total_amount)}</span>
                </div>

                {Boolean(selectedOrder.discount_amount && selectedOrder.discount_amount > 0) && (
                  <div className="flex items-center justify-between text-green-700">
                    <span>Discount:</span>
                    <span className="font-mono">- {formatPrice(selectedOrder.discount_amount || 0)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-neutral-600">
                  <span>Shipping:</span>
                  <span className="font-mono font-bold text-emerald-700">FREE</span>
                </div>

                <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between font-bold text-sm text-black">
                  <span>Final Total:</span>
                  <span className="font-mono text-base">{formatPrice(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* 5. SHIPMENT TRACKING (IF AVAILABLE) */}
              {(selectedOrder.tracking_number || selectedOrder.tracking_url) && (
                <div className="bg-[#F9F9FB] rounded-xl p-4 border border-neutral-200/80 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-black">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Courier Tracking</span>
                  </div>
                  {selectedOrder.courier_name && (
                    <p className="text-neutral-600">
                      Courier Partner: <strong className="text-black">{selectedOrder.courier_name}</strong>
                    </p>
                  )}
                  {selectedOrder.tracking_number && (
                    <p className="font-mono text-neutral-600">
                      AWB / Tracking Number: <strong className="text-black">{selectedOrder.tracking_number}</strong>
                    </p>
                  )}
                  {selectedOrder.tracking_url && (
                    <a
                      href={selectedOrder.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-black underline pt-1"
                    >
                      <span>Track Shipment Live</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Cancellation Form if in progress */}
              {cancellingOrderId === selectedOrder.id && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Confirm Order Cancellation</span>
                  </div>
                  <p className="text-xs text-red-700">
                    Are you sure you want to cancel order #{selectedOrder.order_number}? This action cannot be undone.
                  </p>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation (required)..."
                    className="w-full text-xs p-2.5 rounded-lg border border-red-300 bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCancellingOrderId(null)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                    >
                      Keep Order
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling || !cancelReason.trim()}
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                      {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-neutral-200 bg-white space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                {/* Download Invoice Button */}
                <a
                  href={`/api/orders/${selectedOrder.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-colors text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Invoice</span>
                </a>

                {/* Return / Exchange Button if Delivered */}
                {selectedOrder.status === 'delivered' && (
                  <Link
                    href={`/account/orders/${selectedOrder.order_number}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-black bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors text-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return / Exchange</span>
                  </Link>
                )}

                {/* Cancel Button if Pending / Confirmed */}
                {['pending', 'confirmed', 'unfulfilled'].includes(selectedOrder.status.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => setCancellingOrderId(selectedOrder.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>

              {/* Direct Full Page Link */}
              <Link
                href={`/account/orders/${selectedOrder.order_number}`}
                className="w-full block text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black py-1 transition-colors"
              >
                View Full Page Details &amp; History →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
