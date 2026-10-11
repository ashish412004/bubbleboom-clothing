import { sendEmail } from '@/lib/emails/mailer'
import {
  queueOrderNotification,
  OrderItemNotificationData,
  ShippingAddressData,
} from '@/lib/emails/notifications'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app'
const fromEmail = process.env.SMTP_FROM || process.env.RESEND_FROM_EMAIL || 'BUBBLE BOOM <bubbleboomstore2026@gmail.com>'

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

  try {
    const formattedItems: OrderItemNotificationData[] = (items || []).map((it) => {
      const v = it.variant_info || {}
      return {
        product_id: it.product_id,
        product_name: it.product_name || it.name || 'Bubble Boom Apparel',
        size: v.size || it.size || null,
        color: v.color || it.color || null,
        quantity: it.quantity || 1,
        price: it.selling_price || it.price || 0,
        total_amount: it.total_amount || (it.price ? it.price * (it.quantity || 1) : 0),
        image_url: it.image_url || v.image_url || null,
      }
    })

    const queueRes = await queueOrderNotification({
      order_id: orderId,
      order_number: orderId,
      event: 'order_confirmed',
      recipient_email: email,
      customer_name: customerName,
      total_amount: totalAmount || 0,
      payment_method: 'online',
      payment_status: 'paid',
      items: formattedItems,
      shipping_address: shippingAddress as ShippingAddressData,
    })

    return { data: { id: queueRes.jobId || `job_${Date.now()}` } }
  } catch (error: any) {
    console.error('Error queuing order confirmation email:', error)
    return { error: error.message || 'Failed to send confirmation email' }
  }
}

export async function sendOrderShippedEmail(
  email: string,
  orderId: string,
  trackingNumber: string,
  carrier: string,
  trackingUrl?: string | null,
  options?: {
    customerName?: string
    totalAmount?: number
    items?: any[]
    shippingAddress?: any
    paymentMethod?: string
    paymentStatus?: string
  }
) {
  try {
    const queueRes = await queueOrderNotification({
      order_id: orderId,
      order_number: orderId,
      event: 'order_shipped',
      recipient_email: email,
      customer_name: options?.customerName || 'Customer',
      total_amount: options?.totalAmount || 0,
      payment_method: options?.paymentMethod || 'online',
      payment_status: options?.paymentStatus || 'paid',
      items: options?.items || [],
      shipping_address: options?.shippingAddress,
      carrier,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl || null,
    })
    return { data: { id: queueRes.jobId || `job_${Date.now()}` } }
  } catch (error: any) {
    console.error('Error queuing order shipped email:', error)
    return { error: error.message || 'Failed to send shipped email' }
  }
}

export async function sendOrderDeliveredEmail(
  email: string,
  orderId: string,
  options?: {
    customerName?: string
    totalAmount?: number
    items?: any[]
    shippingAddress?: any
    paymentMethod?: string
    paymentStatus?: string
  }
) {
  try {
    const queueRes = await queueOrderNotification({
      order_id: orderId,
      order_number: orderId,
      event: 'order_delivered',
      recipient_email: email,
      customer_name: options?.customerName || 'Customer',
      total_amount: options?.totalAmount || 0,
      payment_method: options?.paymentMethod || 'online',
      payment_status: options?.paymentStatus || 'paid',
      items: options?.items || [],
      shipping_address: options?.shippingAddress,
    })
    return { data: { id: queueRes.jobId || `job_${Date.now()}` } }
  } catch (error: any) {
    console.error('Error queuing order delivered email:', error)
    return { error: error.message || 'Failed to send delivered email' }
  }
}

export async function sendReturnRequestEmail(
  email: string,
  returnId: string,
  orderId: string
) {
  try {
    const res = await sendEmail({
      to: email,
      subject: `Return Request Received: ${returnId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 28px; color: #000; background: #fff;">
          <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0 0 16px 0;">BUBBLE BOOM</h1>
          <p style="font-size: 14px; margin: 0 0 8px 0;">We have received your return request for order <strong>#${orderId}</strong>.</p>
          <div style="background: #fafafa; border: 1px solid #000; padding: 12px 16px; margin: 16px 0; font-size: 13px;">
            <strong>Return Reference:</strong> ${returnId}
          </div>
          <p style="font-size: 13px; color: #555; line-height: 1.6;">Our operations team will review your request within 24–48 business hours.</p>
          <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #777;">
            Support: <a href="mailto:bubbleboomstore2026@gmail.com" style="color: #000; font-weight: bold;">bubbleboomstore2026@gmail.com</a>
          </div>
        </div>
      `,
    })
    return { data: { id: res.messageId } }
  } catch (error: any) {
    console.error('Error sending return request email:', error)
    return { error: error.message || 'Failed to send return request email' }
  }
}

export async function sendReturnApprovedEmail(
  email: string,
  returnId: string
) {
  try {
    const res = await sendEmail({
      to: email,
      subject: `Return Approved: ${returnId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 28px; color: #000; background: #fff;">
          <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0 0 16px 0;">BUBBLE BOOM</h1>
          <p style="font-size: 14px; margin: 0 0 8px 0;">Your return request <strong>${returnId}</strong> has been approved.</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6;">A courier pickup has been scheduled. Once inspected at our warehouse, your refund will be credited immediately.</p>
          <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #777;">
            Support: <a href="mailto:bubbleboomstore2026@gmail.com" style="color: #000; font-weight: bold;">bubbleboomstore2026@gmail.com</a>
          </div>
        </div>
      `,
    })
    return { data: { id: res.messageId } }
  } catch (error: any) {
    console.error('Error sending return approved email:', error)
    return { error: error.message || 'Failed to send return approved email' }
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const res = await sendEmail({
      to: email,
      subject: 'Welcome to BUBBLE BOOM!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 32px 24px; color: #000; background: #fff;">
          <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0 0 12px 0;">BUBBLE BOOM</h1>
          <p style="font-size: 15px; margin-bottom: 8px;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6;">Welcome to the Boom Squad! Your customer account is active.</p>
          <div style="margin: 24px 0;">
            <a href="${siteUrl}/shop" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
              EXPLORE DROPS
            </a>
          </div>
        </div>
      `,
    })
    return { data: { id: res.messageId } }
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendNewsletterConfirmationEmail(
  email: string,
  confirmUrl: string
) {
  try {
    const res = await sendEmail({
      to: email,
      subject: 'Confirm your subscription | BUBBLE BOOM',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 2px solid #000; padding: 32px 24px; color: #000; background: #fff;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">BUBBLE BOOM</h1>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin: 4px 0 0 0; font-weight: bold;">Boom Squad Newsletter</p>
          </div>
          <p style="font-size: 15px; font-weight: bold; margin-bottom: 8px;">Please confirm your subscription</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6; margin-top: 0;">
            Thank you for requesting to join the Bubble Boom email squad. To complete your subscription and start receiving new arrivals and offers, please click the button below.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${confirmUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 0;">
              Confirm Subscription
            </a>
          </div>
          <p style="font-size: 12px; color: #666; line-height: 1.5;">
            Or copy and paste this verification URL into your browser:<br/>
            <a href="${confirmUrl}" style="color: #000; word-break: break-all; font-size: 11px;">${confirmUrl}</a>
          </p>
          <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #888; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">This confirmation link will expire in 24 hours.</p>
            <p style="margin: 4px 0 0 0;">If you did not request this subscription, no further action is required and you will not be subscribed.</p>
          </div>
        </div>
      `,
    })
    return { data: { id: res.messageId } }
  } catch (error: any) {
    console.error('Error sending newsletter confirmation email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendNewsletterWelcomeEmail(
  email: string,
  unsubscribeUrl: string
) {
  try {
    const res = await sendEmail({
      to: email,
      subject: 'Welcome to the Boom Squad | BUBBLE BOOM',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 2px solid #000; padding: 32px 24px; color: #000; background: #fff;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">BUBBLE BOOM</h1>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin: 4px 0 0 0; font-weight: bold;">Boom Squad</p>
          </div>
          <p style="font-size: 15px; font-weight: bold; margin-bottom: 8px;">You're officially on the list</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6; margin-top: 0;">
            Your email has been verified. You will receive updates on our latest apparel drops, exclusive releases, and seasonal offers.
          </p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${siteUrl}/shop" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 12px 28px; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
              Explore Latest Drops
            </a>
          </div>
          <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #888; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">You can <a href="${unsubscribeUrl}" style="color: #000; text-decoration: underline;">unsubscribe anytime</a> with one click.</p>
            <p style="margin: 4px 0 0 0;">Bubble Boom Apparel | bubbleboomstore2026@gmail.com</p>
          </div>
        </div>
      `,
    })
    return { data: { id: res.messageId } }
  } catch (error: any) {
    console.error('Error sending newsletter welcome email:', error)
    return { error: error.message || 'Failed to send email' }
  }
}

export async function sendNewsletterUnsubscribeEmail(
  email: string,
  unsubscribeUrl: string
) {
  try {
    const res = await sendEmail({
      to: email,
      subject: 'Manage Your Boom Squad Subscription | BUBBLE BOOM',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 2px solid #000; padding: 32px 24px; color: #000; background: #fff;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">BUBBLE BOOM</h1>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin: 4px 0 0 0; font-weight: bold;">Unsubscribe Request</p>
          </div>
          <p style="font-size: 15px; font-weight: bold; margin-bottom: 8px;">Unsubscribe Confirmation</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6; margin-top: 0;">
            We received a request to unsubscribe <strong>${email}</strong> from the Boom Squad newsletter. Click the button below to confirm opting out of marketing emails.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${unsubscribeUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 0;">
              Confirm Unsubscribe
            </a>
          </div>
          <p style="font-size: 12px; color: #666; line-height: 1.5;">
            Or copy and paste this link into your browser:<br/>
            <a href="${unsubscribeUrl}" style="color: #000; word-break: break-all; font-size: 11px;">${unsubscribeUrl}</a>
          </p>
          <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #888; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">If you did not request this, you can safely ignore this email — your subscription will remain active.</p>
            <p style="margin: 4px 0 0 0;">Bubble Boom Apparel | bubbleboomstore2026@gmail.com</p>
          </div>
        </div>
      `,
    })
    return { data: { id: res.messageId } }
  } catch (error: any) {
    console.error('Error sending newsletter unsubscribe email:', error)
    return { error: error.message || 'Failed to send unsubscribe email' }
  }
}

