import { jsPDF } from 'jspdf'

export interface InvoiceOrderData {
  id: string
  order_number: string
  created_at: string
  status: string
  payment_status: string
  payment_method: string
  subtotal: number
  discount_amount: number
  shipping_amount: number
  total_amount: number
  coupon_discount?: number
  shipping_address: {
    full_name: string
    phone: string
    address_line1: string
    address_line2?: string | null
    city: string
    state: string
    pin_code: string
    country?: string
  }
  guest_email?: string | null
  order_items: Array<{
    id: string
    product_name: string
    variant_info?: {
      sku?: string
      color?: string
      size?: string
    }
    quantity: number
    selling_price: number
    total_amount: number
  }>
  payments?: Array<{
    cf_payment_id?: string | null
    cashfree_order_id?: string | null
    amount?: number
    status?: string
  }>
}

/**
 * Generates an authoritative black-and-white Bubble Boom PDF Tax Invoice / Receipt buffer.
 */
export function generateOrderInvoicePdf(order: InvoiceOrderData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const margin = 18
  let y = 20

  // 1. Header: Brand Logo & Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('BUBBLE BOOM', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('PREMIUM STREETWEAR APPAREL', margin, y + 5)

  // Invoice Meta (Right side)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('TAX INVOICE & RECEIPT', pageWidth - margin, y, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(`Invoice No: INV-${order.order_number}`, pageWidth - margin, y + 5, { align: 'right' })
  doc.text(
    `Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    pageWidth - margin,
    y + 9,
    { align: 'right' }
  )
  doc.text(`Order Ref: ${order.order_number}`, pageWidth - margin, y + 13, { align: 'right' })

  y += 20

  // Divider Line
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)

  y += 8

  // 2. Seller and Customer Details Grid (Two columns)
  const colWidth = (pageWidth - margin * 2) / 2
  const col2X = margin + colWidth

  // Seller Details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text('SOLD BY:', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text('Bubble Boom Apparel Ltd.', margin, y + 4)
  doc.text('Streetwear Hub, Sector 14', margin, y + 8)
  doc.text('New Delhi, India - 110001', margin, y + 12)
  doc.text('GSTIN: 07AAACB1234F1Z5 (Composite)', margin, y + 16)
  doc.text('Email: bubbleboomstore2026@gmail.com', margin, y + 20)

  // Buyer / Shipping Details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text('BILLED & SHIPPED TO:', col2X, y)

  const addr = order.shipping_address
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text(addr.full_name || 'Customer', col2X, y + 4)
  doc.text(addr.address_line1 || '', col2X, y + 8)
  if (addr.address_line2) {
    doc.text(addr.address_line2, col2X, y + 12)
    doc.text(`${addr.city}, ${addr.state} - ${addr.pin_code}`, col2X, y + 16)
    doc.text(`Phone: +91 ${addr.phone}`, col2X, y + 20)
    if (order.guest_email) doc.text(`Email: ${order.guest_email}`, col2X, y + 24)
    y += 30
  } else {
    doc.text(`${addr.city}, ${addr.state} - ${addr.pin_code}`, col2X, y + 12)
    doc.text(`Phone: +91 ${addr.phone}`, col2X, y + 16)
    if (order.guest_email) doc.text(`Email: ${order.guest_email}`, col2X, y + 20)
    y += 26
  }

  // 3. Items Table
  // Table Header Background
  doc.setFillColor(245, 245, 243)
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  doc.line(margin, y + 7, pageWidth - margin * 2 + margin, y + 7)

  // Header Titles
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(0, 0, 0)

  const colItemX = margin + 3
  const colVariantX = margin + 70
  const colQtyX = margin + 115
  const colPriceX = margin + 135
  const colTotalX = pageWidth - margin - 3

  doc.text('ITEM DESCRIPTION', colItemX, y + 4.8)
  doc.text('VARIANT / SKU', colVariantX, y + 4.8)
  doc.text('QTY', colQtyX, y + 4.8, { align: 'center' })
  doc.text('PRICE', colPriceX, y + 4.8, { align: 'right' })
  doc.text('TOTAL (INR)', colTotalX, y + 4.8, { align: 'right' })

  y += 11

  // Table Rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)

  for (const item of order.order_items || []) {
    const v = item.variant_info || {}
    const variantStr = [v.color, v.size].filter(Boolean).join(' / ') + (v.sku ? ` (${v.sku})` : '')

    // Print item name
    doc.setFont('helvetica', 'bold')
    doc.text(item.product_name, colItemX, y)

    // Print variant / SKU
    doc.setFont('helvetica', 'normal')
    doc.text(variantStr || 'Standard', colVariantX, y)

    // Qty
    doc.text(String(item.quantity), colQtyX, y, { align: 'center' })

    // Price
    doc.text(`Rs. ${item.selling_price.toLocaleString('en-IN')}`, colPriceX, y, { align: 'right' })

    // Total
    doc.setFont('helvetica', 'bold')
    doc.text(`Rs. ${item.total_amount.toLocaleString('en-IN')}`, colTotalX, y, { align: 'right' })

    y += 7

    // Thin row separator
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(margin, y - 2, pageWidth - margin, y - 2)
  }

  y += 4

  // 4. Financial Calculations / Totals
  const summaryX = pageWidth - margin - 65
  const summaryValX = pageWidth - margin - 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)

  // Subtotal
  doc.text('Subtotal:', summaryX, y)
  doc.text(`Rs. ${order.subtotal.toLocaleString('en-IN')}`, summaryValX, y, { align: 'right' })
  y += 5

  // Discount
  if (order.discount_amount > 0) {
    doc.text('Discount:', summaryX, y)
    doc.text(`- Rs. ${order.discount_amount.toLocaleString('en-IN')}`, summaryValX, y, { align: 'right' })
    y += 5
  }

  // Shipping
  doc.text('Shipping:', summaryX, y)
  doc.text(
    order.shipping_amount === 0 ? 'FREE' : `Rs. ${order.shipping_amount.toLocaleString('en-IN')}`,
    summaryValX,
    y,
    { align: 'right' }
  )
  y += 5

  // Estimated GST (Included in MRP)
  const gstInclusive = Math.round((order.total_amount * 5) / 105)
  doc.text('Estimated GST (5% Incl.):', summaryX, y)
  doc.text(`Rs. ${gstInclusive.toLocaleString('en-IN')}`, summaryValX, y, { align: 'right' })
  y += 5

  // Total Divider
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.6)
  doc.line(summaryX - 5, y, pageWidth - margin, y)
  y += 5

  // Grand Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL AMOUNT PAID:', summaryX, y)
  doc.text(`Rs. ${order.total_amount.toLocaleString('en-IN')}`, summaryValX, y, { align: 'right' })

  y += 14

  // 5. Payment Details Banner
  const latestPayment = order.payments?.[0]
  const paymentRef = latestPayment?.cf_payment_id || latestPayment?.cashfree_order_id || 'N/A'

  doc.setFillColor(248, 248, 246)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, pageWidth - margin * 2, 16, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('PAYMENT CONFIRMATION', margin + 4, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(60, 60, 60)
  doc.text(
    `Method: ${order.payment_method.toUpperCase()}   |   Status: ${order.payment_status.toUpperCase()}   |   Transaction ID: ${paymentRef}`,
    margin + 4,
    y + 11
  )

  y += 24

  // 6. Footer Notes & Declarations
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text(
    'This is an authentic, computer-generated invoice for order fulfillment. No physical signature is required.',
    margin,
    y
  )
  doc.text(
    'Bubble Boom 7-Day Easy Return Policy: Eligible unwashed items with tags can be returned within 7 days of delivery.',
    margin,
    y + 4
  )
  doc.text(
    'Thank you for shopping with Bubble Boom! For queries, contact bubbleboomstore2026@gmail.com',
    margin,
    y + 8
  )

  return Buffer.from(doc.output('arraybuffer'))
}
