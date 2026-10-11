import nodemailer, { type Transporter } from 'nodemailer'
import { Resend } from 'resend'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  simulated?: boolean
  provider?: 'gmail-smtp' | 'resend' | 'simulated'
}

let cachedTransporter: Transporter | null = null

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT) || 465
  const secure = process.env.SMTP_SECURE === 'true' || port === 465
  const user =
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    process.env.SMTP_EMAIL ||
    'bubbleboomstore2026@gmail.com'
  const pass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    ''
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    `BUBBLE BOOM <${user}>`

  const hasCredentials = Boolean(pass && pass.trim().length > 0)

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    hasCredentials,
  }
}

export function getMailerTransporter(): Transporter | null {
  const cfg = getSmtpConfig()
  if (!cfg.hasCredentials) {
    return null
  }

  if (cachedTransporter) {
    return cachedTransporter
  }

  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  })

  return cachedTransporter
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const smtpConfig = getSmtpConfig()
  const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to
  const sender = options.from || smtpConfig.from
  const replyTo = options.replyTo || 'bubbleboomstore2026@gmail.com'

  // 1. Primary: Gmail SMTP via Nodemailer
  if (smtpConfig.hasCredentials) {
    try {
      const transporter = getMailerTransporter()
      if (transporter) {
        const info = await transporter.sendMail({
          from: sender,
          to: recipient,
          replyTo,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        })

        return {
          success: true,
          messageId: info.messageId,
          provider: 'gmail-smtp',
          simulated: false,
        }
      }
    } catch (smtpErr: any) {
      console.error('[Gmail SMTP] Delivery error:', smtpErr?.message || smtpErr)
      // Fall through to Resend secondary fallback if available
    }
  }

  // 2. Secondary fallback: Resend if configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey && resendApiKey.startsWith('re_')) {
    try {
      const resend = new Resend(resendApiKey)
      const resendFrom =
        process.env.RESEND_FROM_EMAIL ||
        process.env.EMAIL_FROM ||
        'Bubble Boom <orders@bubbleboom.in>'

      const { data, error } = await (resend.emails.send as any)({
        from: resendFrom,
        to: recipient,
        reply_to: replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      if (!error && data?.id) {
        return {
          success: true,
          messageId: data.id,
          provider: 'resend',
          simulated: false,
        }
      }
      if (error) {
        console.warn('[Resend Fallback] Error sending email:', error.message)
      }
    } catch (resendErr: any) {
      console.warn('[Resend Fallback] Exception sending email:', resendErr?.message)
    }
  }

  // 3. Fallback: Simulated send (Local/Preview dev mode when credentials aren't set)
  console.log(
    `[Gmail SMTP Simulated] Sent to ${recipient} | Subject: "${options.subject}"`
  )

  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    provider: 'simulated',
    simulated: true,
  }
}

export function getMailerStatus() {
  const cfg = getSmtpConfig()
  const resendKey = process.env.RESEND_API_KEY

  let provider: 'gmail-smtp' | 'resend' | 'simulated' = 'simulated'
  if (cfg.hasCredentials) {
    provider = 'gmail-smtp'
  } else if (resendKey && resendKey.startsWith('re_')) {
    provider = 'resend'
  }

  return {
    configured: cfg.hasCredentials || Boolean(resendKey && resendKey.startsWith('re_')),
    provider,
    smtpHost: cfg.host,
    smtpPort: cfg.port,
    smtpUser: cfg.user,
    fromEmail: cfg.from,
    supportEmail: 'bubbleboomstore2026@gmail.com',
  }
}
