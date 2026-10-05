import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bubble Boom <orders@bubbleboom.in>'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bubbleboom-clothing.vercel.app'

export async function sendOrderConfirmationEmail(
  email: string,
  orderId: string,
  customerName: string,
  itemsSummary?: string
) {
  if (!resend) {
    console.log(`[Resend] RESEND_API_KEY not configured. Simulated confirmation email for ${email} (${orderId}).`)
    return { data: { id: `sim_${Date.now()}` } }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Confirmed: ${orderId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #000; background: #fff;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -1px; margin: 0;">BUBBLE BOOM</h1>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin: 4px 0 0 0;">Official Order Confirmation</p>
          </div>
          
          <p style="font-size: 14px;">Hi <strong>${customerName}</strong>,</p>
          <p style="font-size: 13px; color: #333; line-height: 1.6;">Your payment has been received and verified. Order <strong>${orderId}</strong> is confirmed and will be prepped for dispatch.</p>
          
          ${itemsSummary ? `<div style="background: #f8f8f6; border: 1px solid #000; padding: 12px; margin: 20px 0; font-size: 12px;"><strong>Items:</strong><br/>${itemsSummary}</div>` : ''}

          <div style="margin: 28px 0; text-align: center;">
            <a href="${siteUrl}/account/orders/${orderId}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">View Order & Tracking</a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 16px; font-size: 11px; color: #888; text-align: center;">
            <p>You can download your official tax invoice directly from your <a href="${siteUrl}/account/orders/${orderId}" style="color: #000; font-weight: bold;">Order Details page</a>.</p>
            <p style="margin-top: 6px;">Bubble Boom Apparel India • bubbleboomstore2026@gmail.com</p>
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
  carrier: string
) {
  if (!resend) {
    return { data: { id: `sim_${Date.now()}` } }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Shipped: ${orderId} | BUBBLE BOOM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #000;">
          <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">BUBBLE BOOM</h1>
          <p>Your order <strong>${orderId}</strong> has been shipped!</p>
          <p><strong>Carrier:</strong> ${carrier}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <div style="margin: 20px 0;">
            <a href="${siteUrl}/track-order?order_id=${orderId}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; font-size: 12px; font-weight: bold;">TRACK SHIPMENT</a>
          </div>
          <p>Thank you for shopping with Bubble Boom!</p>
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
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #000;">
          <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">BUBBLE BOOM</h1>
          <p>Your order <strong>${orderId}</strong> has been delivered!</p>
          <p>We hope you love your new Bubble Boom pieces. If you need any assistance, our 7-day return policy is active.</p>
          <p>Thank you for shopping with us!</p>
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
