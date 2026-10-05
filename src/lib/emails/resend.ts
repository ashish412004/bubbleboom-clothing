import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bubble Boom <orders@bubbleboom.in>'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app'

export interface OrderConfirmationEmailProps {
  email: string
  orderId: string
  customerName: string
  totalAmount?: number
  items?: any[]
  itemsSummary?: string
  shippingAddress?: any
}

export async function sendOrderConfirmationEmail(
  param1: string | OrderConfirmationEmailProps,
  param2?: string,
  param3?: string,
  param4?: string
) {
  let email: string
  let orderId: string
  let customerName: string
  let itemsSummary: string | undefined
  let totalAmount: number | undefined
  let items: any[] | undefined
  let shippingAddress: any | undefined

  if (typeof param1 === 'object') {
    email = param1.email
    orderId = param1.orderId
    customerName = param1.customerName
    itemsSummary = param1.itemsSummary
    totalAmount = param1.totalAmount
    items = param1.items
    shippingAddress = param1.shippingAddress
  } else {
    email = param1
    orderId = param2 || ''
    customerName = param3 || 'Customer'
    itemsSummary = param4
  }

  if (!resend) {
    console.log(`[Resend] RESEND_API_KEY not configured. Simulated confirmation email for ${email} (${orderId}).`)
    return { data: { id: `sim_${Date.now()}` } }
  }

  try {
    const formattedItemsHtml = items && items.length > 0
      ? items.map((it) => {
          const name = it.product_name || it.name || 'Bubble Boom Apparel'
          const v = it.variant_info || {}
          const size = v.size || it.size || ''
          const color = v.color || it.color || ''
          const qty = it.quantity || 1
          const amt = it.total_amount || (it.price ? it.price * qty : 0)
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-size: 13px;">
                <strong>${name}</strong><br/>
                <span style="color: #666; font-size: 11px;">${size ? `Size: ${size}` : ''} ${color ? `• Color: ${color}` : ''}</span>
              </td>
              <td style="padding: 10px 0; text-align: center; font-size: 13px;">× ${qty}</td>
              <td style="padding: 10px 0; text-align: right; font-size: 13px; font-weight: bold;">${amt ? `₹${amt.toLocaleString('en-IN')}` : ''}</td>
            </tr>
          `
        }).join('')
      : itemsSummary
      ? `<tr><td colspan="3" style="padding: 8px 0; font-size: 12px; color: #444;">${itemsSummary}</td></tr>`
      : ''

    const addressHtml = shippingAddress
      ? `
        <div style="background: #f8f8f6; border: 1px solid #000; padding: 14px; margin: 20px 0; font-size: 12px; line-height: 1.5;">
          <strong style="text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Delivery Address:</strong>
          <strong>${shippingAddress.full_name || customerName}</strong><br/>
          ${shippingAddress.address_line1 || ''}<br/>
          ${shippingAddress.address_line2 ? `${shippingAddress.address_line2}<br/>` : ''}
          ${shippingAddress.city ? `${shippingAddress.city}, ` : ''}${shippingAddress.state ? `${shippingAddress.state} ` : ''}${shippingAddress.pin_code ? `— ${shippingAddress.pin_code}` : ''}<br/>
          ${shippingAddress.phone ? `Phone: +91 ${shippingAddress.phone}` : ''}
        </div>
      `
      : ''

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Confirmed: ${orderId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 28px; color: #000; background: #fff;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">BUBBLE BOOM</h1>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin: 4px 0 0 0; font-weight: bold;">Official Order Confirmation</p>
          </div>
          
          <p style="font-size: 14px; margin-bottom: 6px;">Hi <strong>${customerName}</strong>,</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6; margin-top: 0;">Your order has been placed and confirmed! We are prepping your streetwear items for quick dispatch.</p>
          
          <div style="background: #f8f8f6; border: 1px solid #ddd; padding: 10px 14px; margin: 16px 0; font-size: 12px; display: flex; justify-content: space-between;">
            <span><strong>Order Reference:</strong> ${orderId}</span>
            ${totalAmount ? `<span style="font-weight: bold; float: right;">Total Amount: ₹${totalAmount.toLocaleString('en-IN')}</span>` : ''}
          </div>

          ${formattedItemsHtml ? `
            <div style="margin: 20px 0;">
              <strong style="text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 8px;">Purchased Items:</strong>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #000; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                    <th style="text-align: left; padding-bottom: 6px;">Item</th>
                    <th style="text-align: center; padding-bottom: 6px;">Qty</th>
                    <th style="text-align: right; padding-bottom: 6px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${formattedItemsHtml}
                </tbody>
              </table>
              ${totalAmount ? `
                <div style="text-align: right; margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; font-size: 15px; font-weight: 900;">
                  Total Paid: ₹${totalAmount.toLocaleString('en-IN')}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${addressHtml}

          <div style="margin: 32px 0 20px 0; text-align: center;">
            <a href="${siteUrl}/account/orders" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 28px; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-right: 8px; margin-bottom: 8px;">
              View in My Orders
            </a>
            <a href="${siteUrl}/account/orders/${orderId}" style="display: inline-block; background: #fff; color: #000; border: 1px solid #000; text-decoration: none; padding: 13px 24px; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
              Order Details &amp; Tracking
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 16px; font-size: 11px; color: #777; text-align: center; line-height: 1.5;">
            <p style="margin: 4px 0;">You can download your official tax invoice anytime from your <a href="${siteUrl}/account/orders" style="color: #000; font-weight: bold;">My Orders page</a>.</p>
            <p style="margin-top: 6px;">Need help? Contact our support team at <a href="mailto:bubbleboomstore2026@gmail.com" style="color: #000; font-weight: bold;">bubbleboomstore2026@gmail.com</a></p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending order confirmation email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error: any) {
    console.error('Error sending order confirmation email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendOrderShippedEmail(
  email: string,
  orderId: string,
  trackingNumber: string,
  carrier: string,
  trackingUrl?: string | null
) {
  if (!resend) {
    return { data: { id: `sim_${Date.now()}` } }
  }

  const directTrackLink = trackingUrl && trackingUrl.startsWith('https://')
    ? trackingUrl
    : `${siteUrl}/track-order?order_id=${orderId}`

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Shipped: ${orderId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 28px; color: #000; background: #fff;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">BUBBLE BOOM</h1>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin: 4px 0 0 0; font-weight: bold;">Shipment Dispatched</p>
          </div>
          <p style="font-size: 14px; margin-bottom: 6px;">Good news! Your order <strong>${orderId}</strong> has been handed over to our logistics partner and is in transit.</p>
          
          <div style="background: #f8f8f6; border: 1px solid #000; padding: 14px; margin: 18px 0; font-size: 12px; line-height: 1.6;">
            <div><strong>Logistics Partner:</strong> ${carrier}</div>
            <div><strong>AWB / Waybill Number:</strong> ${trackingNumber}</div>
            <div><strong>Order Reference:</strong> ${orderId}</div>
          </div>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${directTrackLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-right: 8px;">
              Track Shipment
            </a>
            <a href="${siteUrl}/account/orders/${orderId}" style="display: inline-block; background: #fff; color: #000; border: 1px solid #000; padding: 11px 20px; text-decoration: none; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
              View Order Details
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 16px; font-size: 11px; color: #777; text-align: center; line-height: 1.5;">
            <p style="margin: 4px 0;">Need help with your delivery? Contact us at <a href="mailto:bubbleboomstore2026@gmail.com" style="color: #000; font-weight: bold;">bubbleboomstore2026@gmail.com</a></p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending order shipped email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error: any) {
    console.error('Error sending order shipped email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendOrderDeliveredEmail(
  email: string,
  orderId: string
) {
  if (!resend) {
    return { data: { id: `sim_${Date.now()}` } }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Delivered: ${orderId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 28px; color: #000; background: #fff;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">BUBBLE BOOM</h1>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin: 4px 0 0 0; font-weight: bold;">Delivery Confirmed</p>
          </div>
          <p style="font-size: 14px;">Your order <strong>${orderId}</strong> has been successfully delivered!</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6;">We hope you love your new Bubble Boom pieces. If you need any size exchanges or returns, our 7-day policy is active starting today.</p>
          
          <div style="margin: 24px 0; text-align: center;">
            <a href="${siteUrl}/account/orders/${orderId}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
              View Order / Request Return
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 16px; font-size: 11px; color: #777; text-align: center; line-height: 1.5;">
            <p style="margin: 4px 0;">Questions? We're here to help at <a href="mailto:bubbleboomstore2026@gmail.com" style="color: #000; font-weight: bold;">bubbleboomstore2026@gmail.com</a></p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending order delivered email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error: any) {
    console.error('Error sending order delivered email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendReturnRequestEmail(
  email: string,
  returnId: string,
  orderId: string
) {
  if (!resend) {
    return { data: { id: `sim_${Date.now()}` } }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Return Request Received: ${returnId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #000;">
          <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">BUBBLE BOOM</h1>
          <p>We have received your return request for order <strong>${orderId}</strong>.</p>
          <p>Return Reference: <strong>${returnId}</strong></p>
          <p>Our team will review your request within 24-48 business hours.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending return request email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error: any) {
    console.error('Error sending return request email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendReturnApprovedEmail(
  email: string,
  returnId: string
) {
  if (!resend) {
    return { data: { id: `sim_${Date.now()}` } }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Return Approved: ${returnId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #000;">
          <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">BUBBLE BOOM</h1>
          <p>Your return request <strong>${returnId}</strong> has been approved.</p>
          <p>A courier pickup has been scheduled. Once inspected at our warehouse, your refund will be credited.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending return approved email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error: any) {
    console.error('Error sending return approved email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  if (!resend) {
    return { data: { id: `sim_${Date.now()}` } }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Welcome to BUBBLE BOOM!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #000;">
          <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">BUBBLE BOOM</h1>
          <p>Hi ${name},</p>
          <p>Welcome to Bubble Boom! Your account has been set up successfully.</p>
          <div style="margin: 20px 0;">
            <a href="${siteUrl}/shop" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; font-size: 12px; font-weight: bold;">EXPLORE DROPS</a>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}
