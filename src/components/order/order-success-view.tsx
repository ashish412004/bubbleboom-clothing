'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle2,
  Check,
  Package,
  Truck,
  ShieldCheck,
  MapPin,
  Download,
  ShoppingBag,
  ExternalLink,
  Copy,
  Clock,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { formatPrice, getSafeImageUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

export interface OrderSuccessViewProps {
  order: any
  orderNumber?: string
}

export function OrderSuccessView({ order, orderNumber }: OrderSuccessViewProps) {
  const [copiedOrder, setCopiedOrder] = useState(false)
  const resolvedOrderNumber = order?.order_number || orderNumber || 'BB-ORDER'
  const isCod = order?.payment_method === 'cod'
  const isPaid = order?.payment_status === 'paid'

  const shippingAddr = (order?.shipping_address as any) || {}
  const items = ((order?.order_items as any[]) || [])

  // Calculate estimated delivery date: 3-5 business days from order creation
  const orderDate = order?.created_at ? new Date(order.created_at) : new Date()
  const estDeliveryMin = order?.estimated_delivery_min
    ? new Date(order.estimated_delivery_min)
    : new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000)
  const estDeliveryMax = order?.estimated_delivery_max
    ? new Date(order.estimated_delivery_max)
    : new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000)

  const handleCopyOrderNumber = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(resolvedOrderNumber)
      setCopiedOrder(true)
      toast.success('Order ID copied to clipboard!')
      setTimeout(() => setCopiedOrder(false), 2000)
    }
  }

  // Progress timeline stages
  const timelineStages = [
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2, status: 'completed' },
    { key: 'packed', label: 'Packed', icon: Package, status: 'current' },
    { key: 'shipped', label: 'Shipped', icon: Truck, status: 'upcoming' },
    { key: 'delivered', label: 'Delivered', icon: ShieldCheck, status: 'upcoming' },
  ]

  // Contact info fallback
  const recipientContact =
    shippingAddr.phone || order?.guest_phone || order?.guest_email || 'your registered contact'

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. TOP SUCCESS STATE */}
      <div className="text-center space-y-3 pb-6 border-b border-black">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
          <Check className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-black">
          Order Placed Successfully
        </h1>

        <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto font-medium">
          {isCod
            ? `Your Cash on Delivery order is confirmed. Please keep ₹${order?.total_amount?.toLocaleString(
                'en-IN'
              )} in cash or UPI ready upon delivery.`
            : 'Your payment has been received and confirmed. Thank you for choosing Bubble Boom! We are getting your items ready for dispatch.'}
        </p>

        <p className="text-[11px] font-mono text-neutral-500">
          Receipt and live delivery notifications have been dispatched to{' '}
          <span className="font-bold text-black">{recipientContact}</span>.
        </p>
      </div>

      {/* 2. COMPACT ORDER SUMMARY CARD (Replaces previous multiple boxes) */}
      <div className="border-2 border-black bg-white shadow-sm overflow-hidden">
        {/* Card Header Strip */}
        <div className="bg-[#F8F8F6] border-b border-black p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block sm:inline">
              ORDER ID:
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-black break-all">
              {resolvedOrderNumber}
            </span>
            <button
              type="button"
              onClick={handleCopyOrderNumber}
              title="Copy Order ID"
              className="p-1 border border-neutral-300 hover:border-black bg-white text-neutral-700 hover:text-black transition-colors"
            >
              {copiedOrder ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="bg-black text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
              {order?.status ? order.status.replace(/_/g, ' ') : 'CONFIRMED'}
            </span>

            <span
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              {isPaid
                ? isCod
                  ? 'PAID (COD COLLECTED)'
                  : 'PAID & VERIFIED'
                : isCod
                ? 'COD (PENDING DELIVERY)'
                : 'PAYMENT PENDING'}
            </span>
          </div>
        </div>

        {/* Card Metadata Details */}
        <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-b border-neutral-200">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">
              Order Date
            </span>
            <span className="font-semibold text-black mt-0.5 block">
              {orderDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">
              Payment Method
            </span>
            <span className="font-semibold text-black mt-0.5 block uppercase">
              {isCod ? 'Cash on Delivery' : 'Online (UPI / Card)'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">
              Total Payable / Paid
            </span>
            <span className="font-black text-sm sm:text-base text-black mt-0.5 block">
              ₹{order?.total_amount?.toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">
              Est. Delivery
            </span>
            <span className="font-semibold text-black mt-0.5 block">
              {estDeliveryMin.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} –{' '}
              {estDeliveryMax.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* 3. DELIVERY INFORMATION & COMPACT TIMELINE */}
        <div className="p-4 sm:p-6 bg-[#FAFAFA]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
              <Truck size={14} />
              <span>Delivery Progress</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              Stage: <strong className="text-black uppercase">Confirmed &amp; In Fulfillment</strong>
            </span>
          </div>

          {/* Compact 4-Step Timeline */}
          <div className="relative pt-2 pb-1">
            <div className="hidden sm:block absolute top-[21px] left-[12%] right-[12%] h-[2px] bg-neutral-200 z-0">
              <div className="h-full bg-black w-[25%]" />
            </div>

            <div className="grid grid-cols-4 gap-2 relative z-10 text-center">
              {timelineStages.map((stage, idx) => {
                const Icon = stage.icon
                const isCompleted = idx === 0
                const isCurrent = idx === 1
                return (
                  <div key={stage.key} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors border-2 ${
                        isCompleted
                          ? 'bg-black text-white border-black'
                          : isCurrent
                          ? 'bg-white text-black border-black ring-2 ring-neutral-200 shadow-sm'
                          : 'bg-white text-neutral-300 border-neutral-300'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase font-mono tracking-tight font-bold ${
                        isCompleted || isCurrent ? 'text-black' : 'text-neutral-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[8px] font-mono uppercase bg-neutral-100 text-black px-1.5 py-0.2 rounded mt-0.5 border border-neutral-300">
                        In Progress
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 p-3 bg-white border border-neutral-200 text-[11px] font-mono text-neutral-600 flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <p>
              Your parcel is being carefully packed and quality-inspected. You will receive courier waybill and live tracking links via SMS/WhatsApp once the package is dispatched.
            </p>
          </div>
        </div>
      </div>

      {/* 4. PURCHASED ITEMS SECTION */}
      <div className="border border-black bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
            <ShoppingBag size={14} />
            <span>Purchased Items ({items.length})</span>
          </h2>
          <span className="text-[11px] font-mono text-neutral-500">
            {items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0)} Total Units
          </span>
        </div>

        <div className="divide-y divide-neutral-200">
          {items.map((item, idx) => {
            const v = item.variant_info || {}
            const imageUrl = item.image_url || v.image_url || null
            const itemPrice = item.selling_price || item.unit_price || 0
            const itemTotal = item.total_amount || itemPrice * item.quantity

            return (
              <div key={item.id || idx} className="py-4 first:pt-1 last:pb-1 flex items-start gap-4">
                {/* Product Thumbnail (Requirement 6 & 10) */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neutral-100 border border-neutral-300 relative shrink-0 overflow-hidden flex items-center justify-center p-1">
                  {imageUrl ? (
                    <Image
                      src={getSafeImageUrl(imageUrl)}
                      alt={item.product_name || 'Ordered Product'}
                      fill
                      sizes="80px"
                      className="object-contain p-1"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-400">
                      <Package className="w-5 h-5 mb-0.5" />
                      <span className="text-[8px] font-mono font-bold tracking-widest uppercase">
                        BOOM
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold uppercase text-black line-clamp-2 leading-snug">
                    {item.product_name}
                  </h4>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-mono">
                    {v.size && (
                      <span className="bg-black text-white px-2 py-0.5 uppercase font-bold">
                        Size: {v.size}
                      </span>
                    )}
                    {v.color && (
                      <span className="bg-neutral-100 border border-neutral-300 text-neutral-800 px-2 py-0.5 uppercase font-semibold">
                        Color: {v.color}
                      </span>
                    )}
                    <span className="bg-neutral-100 border border-neutral-300 text-neutral-700 px-2 py-0.5 uppercase font-semibold">
                      Qty: {item.quantity}
                    </span>
                    {v.sku && (
                      <span className="text-neutral-400 hidden sm:inline">SKU: {v.sku}</span>
                    )}
                  </div>

                  <div className="mt-2 text-xs font-mono text-neutral-500">
                    <span>₹{itemPrice.toLocaleString('en-IN')} × {item.quantity}</span>
                  </div>
                </div>

                {/* Line Total */}
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs sm:text-sm text-black">
                    ₹{itemTotal.toLocaleString('en-IN')}
                  </span>
                  <div className="mt-1">
                    <span className="text-[9px] font-mono uppercase bg-neutral-100 text-neutral-600 px-1.5 py-0.5 border border-neutral-200">
                      Standard
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 5. SHIPPING DESTINATION & PROPER PRICE BREAKDOWN (Requirement 4 & 7) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Destination Section */}
        <div className="border border-black bg-white p-5 space-y-3 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2 pb-2 border-b border-neutral-200">
            <MapPin size={14} />
            <span>Shipping Destination</span>
          </h3>

          <div className="text-xs space-y-1.5 text-neutral-700 font-mono">
            <p className="font-bold text-sm font-sans text-black">
              {shippingAddr?.full_name || 'Valued Customer'}
            </p>
            <p className="leading-relaxed">
              {shippingAddr?.address_line1 || 'Address on record'}
            </p>
            {shippingAddr?.address_line2 && (
              <p className="leading-relaxed">{shippingAddr.address_line2}</p>
            )}
            <p className="font-semibold text-black">
              {shippingAddr?.city || 'City'}, {shippingAddr?.state || 'State'} —{' '}
              <span className="font-bold">{shippingAddr?.pin_code || 'PIN'}</span>
            </p>
            {shippingAddr?.phone && (
              <p className="pt-1 text-black font-semibold">
                Phone: +91 {shippingAddr.phone}
              </p>
            )}
          </div>
        </div>

        {/* Proper Price Breakdown Section (Requirement 4) */}
        <div className="border border-black bg-[#F8F8F6] p-5 space-y-3 font-mono text-xs shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2 pb-2 border-b border-black font-sans">
            <FileText size={14} />
            <span>Price &amp; Payment Breakdown</span>
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal (Items Total)</span>
              <span>₹{(order?.subtotal || order?.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>

            {order?.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Promotional Discount</span>
                <span>-₹{order.discount_amount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between text-neutral-600">
              <span>Shipping &amp; Packaging</span>
              <span>
                {order?.shipping_amount === 0 || !order?.shipping_amount
                  ? 'FREE'
                  : `₹${order.shipping_amount.toLocaleString('en-IN')}`}
              </span>
            </div>

            {isCod && (
              <div className="flex justify-between text-neutral-600">
                <span>COD Handling Fee</span>
                <span>
                  {order?.cod_fee && Number(order.cod_fee) > 0
                    ? `₹${Number(order.cod_fee).toLocaleString('en-IN')}`
                    : 'FREE (Included)'}
                </span>
              </div>
            )}

            <div className="flex justify-between text-neutral-500 text-[11px]">
              <span>Taxes (GST 5% / 12%)</span>
              <span>Included</span>
            </div>

            {/* Final Total */}
            <div className="pt-2.5 border-t-2 border-black flex justify-between items-center text-sm sm:text-base font-black">
              <span className="uppercase text-black">
                {isCod && !isPaid ? 'Total Due on Delivery:' : 'Total Amount Paid:'}
              </span>
              <span className="text-black">
                ₹{order?.total_amount?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Amount Difference Clarification */}
          <div className="mt-3 p-2.5 bg-white border border-neutral-300 text-[11px] leading-relaxed">
            {isPaid ? (
              <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                <span>Payment settled in full via {order?.payment_method?.toUpperCase() || 'Cashfree'}. Zero balance due.</span>
              </p>
            ) : (
              <p className="text-amber-900 font-semibold">
                ⚠️ Cash / UPI collection required: Exactly ₹{order?.total_amount?.toLocaleString('en-IN')} will be collected by the courier upon delivery.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 6. ACTION BUTTONS (Requirement 8 & 9) */}
      <div className="pt-2 border-t border-neutral-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Primary Action: View in My Orders */}
          <Link
            href={`/account/orders?orderId=${encodeURIComponent(resolvedOrderNumber)}`}
            className="w-full bg-black text-white hover:bg-neutral-800 px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors min-h-[44px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>View in My Orders</span>
            <ArrowRight size={14} />
          </Link>

          {/* Secondary Action: Track Order Details */}
          <Link
            href={`/track-order?order_id=${encodeURIComponent(resolvedOrderNumber)}`}
            className="w-full border-2 border-black bg-white hover:bg-neutral-100 text-black px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <Truck size={14} />
            <span>Track Order Details</span>
          </Link>

          {/* Secondary Action: Download Invoice */}
          <a
            href={`/api/orders/${encodeURIComponent(resolvedOrderNumber)}/invoice`}
            download
            className="w-full border border-black bg-white hover:bg-neutral-100 text-black px-5 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            <span>Download Invoice</span>
          </a>

          {/* Fourth Action: Continue Shopping */}
          <Link
            href="/shop"
            className="w-full border border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 text-neutral-800 hover:text-black px-5 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <ShoppingBag size={14} />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
