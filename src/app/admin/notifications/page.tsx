import {
  getStoreSettings,
  StoreNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/lib/settings'
import { getOutboxHistory } from '@/lib/emails/notifications'
import { getMailerStatus } from '@/lib/emails/mailer'
import { NotificationsManagerClient } from './notifications-manager-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Email Notifications | Bubble Boom Admin',
  description: 'Manage automatic order notification emails, SMTP dispatch, templates, and outbox logs',
}

export default async function AdminNotificationsPage() {
  const [settings, history, mailerStatus] = await Promise.all([
    getStoreSettings<StoreNotificationSettings>('email_notifications'),
    getOutboxHistory({ limit: 50 }),
    Promise.resolve(getMailerStatus()),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">
          Automatic Email Notifications &amp; Outbox
        </h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Monitor transactional Gmail SMTP order dispatches, live delivery history, template previews, and event triggers.
        </p>
      </div>

      <NotificationsManagerClient
        initialSettings={settings || DEFAULT_NOTIFICATION_SETTINGS}
        initialHistory={history.jobs}
        totalCount={history.total}
        mailerStatus={mailerStatus}
      />
    </div>
  )
}
