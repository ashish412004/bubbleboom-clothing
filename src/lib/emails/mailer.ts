import nodemailer, { type Transporter } from 'nodemailer'
import { Resend } from 'resend'
import { getStoreSettings, StoreNotificationSettings } from '@/lib/settings'

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
  const rawUser =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.GMAIL_USER ||
    process.env.GMAIL_EMAIL ||
    process.env.SMTP_EMAIL ||
    process.env.EMAIL_USER ||
    process.env.MAIL_USER ||
    'bubbleboomstore2026@gmail.com'
  const user = rawUser.trim()

  const rawPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.MAIL_PASSWORD ||
    process.env.SMTP_KEY ||
    ''
  // Strip whitespace from 16-character Google App Password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const pass = rawPass.replace(/\s+/g, '')

  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    `BUBBLE BOOM <${user}>`

  const hasCredentials = Boolean(pass && pass.length > 0)

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

/**
 * Resolves SMTP configuration dynamically checking process.env first,
 * then falling back to persistent store_settings in Supabase.
 */
export async function resolveSmtpConfig() {
  const syncCfg = getSmtpConfig()
  if (syncCfg.hasCredentials) {
    return syncCfg
  }

  try {
    const settings = await getStoreSettings<StoreNotificationSettings>('email_notifications')
    if (settings?.smtp_pass && settings.smtp_pass.trim().length > 0) {
      const user = settings.smtp_user || syncCfg.user
      const host = settings.smtp_host || syncCfg.host
      const port = Number(settings.smtp_port) || syncCfg.port
      const secure = port === 465
      const from = settings.from_email
        ? `BUBBLE BOOM <${settings.from_email}>`
        : syncCfg.from

      return {
        host,
        port,
        secure,
        user,
        pass: settings.smtp_pass.replace(/\s+/g, ''),
        from,
        hasCredentials: true,
      }
    }
  } catch {}

  return syncCfg
}

export async function getMailerTransporter(): Promise<Transporter | null> {
  const cfg = await resolveSmtpConfig()
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

export async function verifySmtpConnection(customConfig?: {
  user?: string
  pass?: string
  host?: string
  port?: number
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const cfg = customConfig?.pass
    ? {
        host: customConfig.host || 'smtp.gmail.com',
        port: Number(customConfig.port) || 465,
        secure: (Number(customConfig.port) || 465) === 465,
        user: customConfig.user || 'bubbleboomstore2026@gmail.com',
        pass: customConfig.pass,
      }
    : await resolveSmtpConfig()

  if (!cfg.pass || !cfg.pass.trim()) {
    return {
      success: false,
      error: 'No Gmail App Password provided. Please configure SMTP_PASS in environment or Store Settings.',
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    })

    await transporter.verify()
    return {
      success: true,
      message: `Successfully authenticated with ${cfg.host} as ${cfg.user}`,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'SMTP connection verification failed',
    }
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const smtpConfig = await resolveSmtpConfig()
  const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to
  const sender = options.from || smtpConfig.from
  const replyTo = options.replyTo || 'bubbleboomstore2026@gmail.com'

  // 1. Primary: Gmail SMTP via Nodemailer
  if (smtpConfig.hasCredentials) {
    try {
      const transporter = await getMailerTransporter()
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
      return {
        success: false,
        error: `[Gmail SMTP Error] ${smtpErr?.message || 'SMTP delivery failed'}`,
        provider: 'gmail-smtp',
        simulated: false,
      }
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
    error: 'Notice: SMTP_PASS / GMAIL_APP_PASSWORD not configured. Simulated delivery logged.',
  }
}

export async function getMailerStatus() {
  const cfg = await resolveSmtpConfig()
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
    hasPassword: Boolean(cfg.pass && cfg.pass.length > 0),
  }
}
