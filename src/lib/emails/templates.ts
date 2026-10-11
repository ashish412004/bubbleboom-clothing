export type OrderNotificationEvent =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_packed'
  | 'order_shipped'
  | 'out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  | 'refund_completed'

export interface OrderItemNotificationData {
  product_id?: string
  product_name: string
  image_url?: string | null
  size?: string | null
  color?: string | null
  quantity: number
  price: number
  total_amount?: number
}

export interface ShippingAddressData {
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pin_code: string
}

export interface OrderNotificationPayload {
  order_id: string
  order_number: string
  event: OrderNotificationEvent
  recipient_email: string
  customer_name: string
  total_amount: number
  subtotal?: number
  shipping_amount?: number
  cod_amount?: number
  discount_amount?: number
  payment_method: 'cashfree' | 'cod' | string
  payment_status: 'paid' | 'pending' | 'failed' | 'refunded' | string
  items: OrderItemNotificationData[]
  shipping_address?: ShippingAddressData | null
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  estimated_delivery?: string | null
  notes?: string | null
  created_at?: string
}

export interface OutboxJobRecord {
  id: string
  job_type: string
  payload: OrderNotificationPayload
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'simulated'
  retry_count: number
  max_retries: number
  last_error: string | null
  scheduled_at: string
  created_at: string
  updated_at: string
  message_id?: string | null
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app'
const SUPPORT_EMAIL = 'bubbleboomstore2026@gmail.com'

/**
 * Generate responsive black-and-white editorial email HTML
 */
export function renderNotificationHtml(
  event: OrderNotificationEvent,
  data: OrderNotificationPayload
): { subject: string; html: string; text: string } {
  const cleanSiteUrl = SITE_URL.replace(/\/+$/, '')
  const customerName = data.customer_name || 'Customer'
  const orderNumber = data.order_number || data.order_id
  const totalFmt = `₹${(data.total_amount || 0).toLocaleString('en-IN')}`
  const isCod = data.payment_method?.toLowerCase() === 'cod'
  const isPaid = data.payment_status?.toLowerCase() === 'paid'

  let eventTitle = 'ORDER STATUS UPDATE'
  let eventHeadline = 'YOUR BUBBLE BOOM ORDER'
  let eventMessage = 'We have an update regarding your order.'
  let statusBadgeBg = '#000000'
  let statusBadgeText = '#ffffff'
  let subject = `Update: #${orderNumber} | BUBBLE BOOM`

  switch (event) {
    case 'order_placed':
      subject = `Order Placed: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'ORDER RECEIVED'
      eventHeadline = 'YOUR DROP IS LOCKED IN'
      eventMessage = isCod
        ? 'Your order has been received and scheduled for Cash on Delivery. We are prepping your streetwear items for fulfillment.'
        : 'Your order has been received. Our team is preparing your streetwear drop for dispatch.'
      break
    case 'order_confirmed':
      subject = `Order Confirmed: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'ORDER CONFIRMED'
      eventHeadline = 'OFFICIALLY CONFIRMED'
      eventMessage = isCod
        ? `Your order is officially confirmed with Cash on Delivery. Please keep ${totalFmt} ready (cash or UPI) at your doorstep when your package arrives.`
        : 'Your online payment is verified and your order is confirmed. Our fulfillment crew is getting your apparel ready.'
      break
    case 'order_packed':
      subject = `Order Packed & Ready: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'QUALITY CHECKED & PACKED'
      eventHeadline = 'BOXED AND READY TO GO'
      eventMessage =
        'Your streetwear pieces have passed warehouse quality inspection and are packed in custom Bubble Boom packaging. Awaiting courier pickup.'
      break
    case 'order_shipped':
      subject = `Shipment Dispatched: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'SHIPMENT DISPATCHED'
      eventHeadline = 'ON THE MOVE'
      eventMessage = `Your order has been handed over to ${data.carrier || 'our courier partner'} and is in transit.`
      break
    case 'out_for_delivery':
      subject = `Out for Delivery: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'OUT FOR DELIVERY TODAY'
      eventHeadline = 'ARRIVING TODAY'
      eventMessage =
        'Your package is with the delivery executive and will reach your address today. Please ensure someone is available to receive it.'
      break
    case 'order_delivered':
      subject = `Delivered: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'DELIVERY CONFIRMED'
      eventHeadline = 'PACKAGE DELIVERED'
      eventMessage =
        'Your Bubble Boom package has been delivered! We hope you love the fit and style. Your 7-day hassle-free exchange window is now open.'
      break
    case 'order_cancelled':
      subject = `Order Cancelled: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'ORDER CANCELLED'
      eventHeadline = 'CANCELLATION CONFIRMED'
      eventMessage =
        'Your order has been cancelled. Any inventory reservations have been released. If this was a prepaid order, your refund is being initiated.'
      statusBadgeBg = '#222222'
      break
    case 'refund_completed':
      subject = `Refund Completed: #${orderNumber} | BUBBLE BOOM`
      eventTitle = 'REFUND COMPLETED'
      eventHeadline = 'FUNDS ISSUED'
      eventMessage = `The refund of ${totalFmt} for order #${orderNumber} has been successfully processed back to your original payment account. Standard bank processing takes 3–5 business days.`
      break
  }

  // Build items rows
  const itemsHtml = (data.items || [])
    .map((item) => {
      const name = item.product_name || 'Bubble Boom Apparel'
      const sizeStr = item.size ? `Size: ${item.size}` : ''
      const colorStr = item.color ? `Color: ${item.color}` : ''
      const meta = [sizeStr, colorStr].filter(Boolean).join(' • ')
      const pricePaise = item.price || 0
      const itemTotal = item.total_amount || pricePaise * item.quantity
      const img = item.image_url || null

      return `
        <tr style="border-bottom: 1px solid #e5e5e5;">
          <td style="padding: 12px 0; vertical-align: middle;">
            <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
              <tr>
                ${
                  img
                    ? `<td style="padding-right: 12px; vertical-align: middle;">
                        <img src="${img}" alt="${name}" width="54" height="54" style="width: 54px; height: 54px; object-fit: contain; border: 1px solid #000; background: #fafafa; display: block;" />
                       </td>`
                    : `<td style="padding-right: 12px; vertical-align: middle;">
                        <div style="width: 54px; height: 54px; border: 1px solid #000; background: #111; color: #fff; font-size: 8px; font-weight: bold; text-align: center; line-height: 54px; letter-spacing: 1px;">BB</div>
                       </td>`
                }
                <td style="vertical-align: middle;">
                  <div style="font-weight: 800; font-size: 13px; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">${name}</div>
                  ${meta ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${meta}</div>` : ''}
                </td>
              </tr>
            </table>
          </td>
          <td style="padding: 12px 0; text-align: center; font-size: 13px; font-weight: bold; vertical-align: middle; color: #000;">
            × ${item.quantity}
          </td>
          <td style="padding: 12px 0; text-align: right; font-size: 13px; font-weight: 900; vertical-align: middle; color: #000;">
            ₹${itemTotal.toLocaleString('en-IN')}
          </td>
        </tr>
      `
    })
    .join('')

  // Build financial breakdown
  const subtotalFmt = data.subtotal ? `₹${data.subtotal.toLocaleString('en-IN')}` : totalFmt
  const shippingFmt =
    data.shipping_amount === 0 || !data.shipping_amount
      ? 'FREE'
      : `₹${data.shipping_amount.toLocaleString('en-IN')}`
  const codFmt = data.cod_amount ? `₹${data.cod_amount.toLocaleString('en-IN')}` : null
  const discountFmt = data.discount_amount
    ? `-₹${data.discount_amount.toLocaleString('en-IN')}`
    : null

  // Tracking CTA & details
  const hasTracking = Boolean(data.tracking_number && data.tracking_number !== 'AWB-PENDING')
  const trackingLink =
    data.tracking_url && data.tracking_url.startsWith('http')
      ? data.tracking_url
      : `${cleanSiteUrl}/track-order?order_id=${orderNumber}`

  const address = data.shipping_address
  const addressHtml = address
    ? `
      <div style="border: 1px solid #000; background: #fafafa; padding: 14px 16px; margin: 20px 0; font-size: 12px; line-height: 1.6; color: #000;">
        <div style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; margin-bottom: 6px; color: #444;">
          Delivery Address
        </div>
        <strong>${address.full_name || customerName}</strong><br/>
        ${address.address_line1 || ''}<br/>
        ${address.address_line2 ? `${address.address_line2}<br/>` : ''}
        ${address.city || ''}, ${address.state || ''} — <strong>${address.pin_code || ''}</strong><br/>
        ${address.phone ? `Mobile: +91 ${address.phone}` : ''}
      </div>
    `
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #000000;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 2px solid #000000; text-align: left;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px; border-bottom: 2px solid #000000; text-align: center; background-color: #000000; color: #ffffff;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #ffffff;">
                BUBBLE BOOM
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #cccccc; font-weight: 700;">
                Streetwear • Official Drop
              </p>
            </td>
          </tr>

          <!-- Status Headline Banner -->
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid #e5e5e5; background-color: #fdfdfd;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: ${statusBadgeBg}; color: ${statusBadgeText}; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; padding: 4px 8px; text-transform: uppercase;">
                      ${eventTitle}
                    </span>
                    <h2 style="margin: 10px 0 6px 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.2px;">
                      ${eventHeadline}
                    </h2>
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333333;">
                      Hi <strong>${customerName}</strong>, ${eventMessage}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #000000; padding: 12px 16px;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.6; padding: 4px 0;">
                    <div><strong>Order Number:</strong> #${orderNumber}</div>
                    <div><strong>Payment Method:</strong> ${isCod ? 'Cash on Delivery (COD)' : 'Prepaid Online (Cashfree)'}</div>
                    <div>
                      <strong>Payment Status:</strong> 
                      <span style="display: inline-block; font-size: 10px; font-weight: 900; letter-spacing: 1px; padding: 2px 6px; background-color: ${isPaid ? '#000000' : '#444444'}; color: #ffffff; text-transform: uppercase;">
                        ${isPaid ? 'PAID' : (isCod ? 'PAY AT DOORSTEP' : data.payment_status.toUpperCase())}
                      </span>
                    </div>
                  </td>
                  <td style="text-align: right; vertical-align: top; font-size: 12px; padding: 4px 0;">
                    <div style="font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 1px;">Total Amount</div>
                    <div style="font-size: 20px; font-weight: 900; color: #000000; margin-top: 2px;">
                      ${totalFmt}
                    </div>
                  </td>
                </tr>
              </table>

              ${
                hasTracking
                  ? `
                  <div style="margin-top: 16px; border: 1px solid #000; background: #fff; padding: 14px 16px; font-size: 12px; line-height: 1.6;">
                    <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #444; margin-bottom: 4px;">
                      Tracking Information
                    </div>
                    <div><strong>Courier Partner:</strong> ${data.carrier || 'Express Logistics'}</div>
                    <div><strong>AWB / Tracking Number:</strong> ${data.tracking_number}</div>
                    ${data.estimated_delivery ? `<div><strong>Estimated Delivery:</strong> ${data.estimated_delivery}</div>` : ''}
                    <div style="margin-top: 10px;">
                      <a href="${trackingLink}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 8px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                        Track Live Shipment &rarr;
                      </a>
                    </div>
                  </div>
                  `
                  : ''
              }

              <!-- Purchased Items Table -->
              <div style="margin-top: 24px;">
                <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #000000; padding-bottom: 6px; margin-bottom: 4px;">
                  Purchased Items
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Price Breakdown -->
              <div style="margin-top: 16px; border-top: 1px solid #e5e5e5; padding-top: 12px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; line-height: 1.8;">
                  <tr>
                    <td style="color: #666;">Subtotal</td>
                    <td style="text-align: right; font-weight: bold; color: #000;">${subtotalFmt}</td>
                  </tr>
                  ${
                    discountFmt
                      ? `<tr>
                          <td style="color: #666;">Coupon Discount</td>
                          <td style="text-align: right; font-weight: bold; color: #000;">${discountFmt}</td>
                        </tr>`
                      : ''
                  }
                  <tr>
                    <td style="color: #666;">Shipping Fee</td>
                    <td style="text-align: right; font-weight: bold; color: #000;">${shippingFmt}</td>
                  </tr>
                  ${
                    codFmt
                      ? `<tr>
                          <td style="color: #666;">Cash on Delivery Fee</td>
                          <td style="text-align: right; font-weight: bold; color: #000;">${codFmt}</td>
                        </tr>`
                      : ''
                  }
                  <tr style="border-top: 2px solid #000000; font-size: 15px;">
                    <td style="font-weight: 900; padding-top: 8px; text-transform: uppercase;">Total</td>
                    <td style="text-align: right; font-weight: 900; padding-top: 8px;">${totalFmt}</td>
                  </tr>
                </table>
              </div>

              <!-- Delivery Address -->
              ${addressHtml}

              <!-- Action Buttons -->
              <div style="margin: 28px 0 12px 0; text-align: center;">
                <a href="${cleanSiteUrl}/account/orders/${orderNumber}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 24px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin: 4px;">
                  View Order Details
                </a>
                <a href="${cleanSiteUrl}/account/orders" style="display: inline-block; background-color: #ffffff; color: #000000; border: 1px solid #000000; text-decoration: none; padding: 13px 20px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin: 4px;">
                  My Orders
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 2px solid #000000; background-color: #fafafa; padding: 20px 24px; font-size: 11px; line-height: 1.6; color: #666666; text-align: center;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 1px;">
                BUBBLE BOOM APPAREL
              </p>
              <p style="margin: 0 0 8px 0;">
                Need help? Reach out directly to <a href="mailto:${SUPPORT_EMAIL}" style="color: #000000; font-weight: bold; text-decoration: underline;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #999999;">
                Official order notification sent by Bubble Boom. Tax invoices are accessible anytime in your customer account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
BUBBLE BOOM - ${eventTitle}
----------------------------------------
Hi ${customerName},
${eventMessage}

Order Number: #${orderNumber}
Total Amount: ${totalFmt}
Payment: ${isCod ? 'Cash on Delivery' : 'Prepaid'} (${isPaid ? 'PAID' : data.payment_status.toUpperCase()})

Items:
${(data.items || [])
  .map(
    (i) =>
      `- ${i.product_name} x ${i.quantity} (${[i.size, i.color].filter(Boolean).join('/')}) - ₹${i.price * i.quantity}`
  )
  .join('\n')}

${
  hasTracking
    ? `Tracking Partner: ${data.carrier || 'Express'}\nAWB: ${data.tracking_number}\nTracking Link: ${trackingLink}\n`
    : ''
}

View Order: ${cleanSiteUrl}/account/orders/${orderNumber}
Need help? Contact us at ${SUPPORT_EMAIL}
  `.trim()

  return { subject, html, text }
}
