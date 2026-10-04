import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderConfirmationEmail(
  email: string,
  orderId: string,
  customerName: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Streetwear <orders@yourdomain.com>',
      to: email,
      subject: `Order Confirmation - ${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Order Confirmed</h1>
          <p>Hi ${customerName},</p>
          <p>Your order <strong>${orderId}</strong> has been confirmed successfully.</p>
          <p>You will receive another email when your order is shipped.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending order confirmation email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Error sending order confirmation email:', error)
    return { error: 'Failed to send email' }
  }
}

export async function sendOrderShippedEmail(
  email: string,
  orderId: string,
  trackingNumber: string,
  carrier: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Streetwear <orders@yourdomain.com>',
      to: email,
      subject: `Order Shipped - ${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Order Shipped</h1>
          <p>Your order <strong>${orderId}</strong> has been shipped!</p>
          <p><strong>Carrier:</strong> ${carrier}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p>You can track your order using the tracking number provided.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending order shipped email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Error sending order shipped email:', error)
    return { error: 'Failed to send email' }
  }
}

export async function sendOrderDeliveredEmail(
  email: string,
  orderId: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Streetwear <orders@yourdomain.com>',
      to: email,
      subject: `Order Delivered - ${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Order Delivered</h1>
          <p>Your order <strong>${orderId}</strong> has been delivered!</p>
          <p>We hope you enjoy your purchase. If you have any issues, please don't hesitate to contact us.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending order delivered email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Error sending order delivered email:', error)
    return { error: 'Failed to send email' }
  }
}

export async function sendReturnRequestEmail(
  email: string,
  returnId: string,
  orderId: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Streetwear <support@yourdomain.com>',
      to: email,
      subject: `Return Request Received - ${returnId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Return Request Received</h1>
          <p>We have received your return request for order <strong>${orderId}</strong>.</p>
          <p>Return ID: <strong>${returnId}</strong></p>
          <p>Our team will review your request and get back to you within 2-3 business days.</p>
          <p>Thank you for your patience.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending return request email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Error sending return request email:', error)
    return { error: 'Failed to send email' }
  }
}

export async function sendReturnApprovedEmail(
  email: string,
  returnId: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Streetwear <support@yourdomain.com>',
      to: email,
      subject: `Return Approved - ${returnId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Return Approved</h1>
          <p>Your return request <strong>${returnId}</strong> has been approved.</p>
          <p>Please follow the instructions sent to you for returning the item.</p>
          <p>Once we receive the returned item, we will process your refund.</p>
          <p>Thank you for your patience.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending return approved email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Error sending return approved email:', error)
    return { error: 'Failed to send email' }
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Streetwear <welcome@yourdomain.com>',
      to: email,
      subject: 'Welcome to Streetwear!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Welcome to Streetwear!</h1>
          <p>Hi ${name},</p>
          <p>Thank you for signing up for an account with us.</p>
          <p>Stay tuned for exclusive drops, early access, and special offers.</p>
          <p>Happy shopping!</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { error: 'Failed to send email' }
  }
}
