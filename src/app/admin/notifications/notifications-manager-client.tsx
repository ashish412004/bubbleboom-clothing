'use client'

import React, { useState } from 'react'
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Send,
  Eye,
  Settings as SettingsIcon,
  Mail,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import {
  StoreNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/lib/settings'
import { OutboxJobRecord, OrderNotificationEvent, renderNotificationHtml } from '@/lib/emails/templates'

interface NotificationsManagerClientProps {
  initialSettings: StoreNotificationSettings
  initialHistory: OutboxJobRecord[]
  totalCount: number
  mailerStatus: {
    configured: boolean
    provider: 'gmail-smtp' | 'resend' | 'simulated'
    smtpHost: string
    smtpPort: number
    smtpUser: string
    fromEmail: string
    supportEmail: string
    hasPassword?: boolean
  }
}

const NOTIFICATION_EVENTS: Array<{
  id: OrderNotificationEvent
  key: keyof StoreNotificationSettings
  title: string
  description: string
}> = [
  {
    id: 'order_placed',
    key: 'notify_order_placed',
    title: 'Order Placed',
    description: 'Sent when order checkout is completed (COD or pre-payment).',
  },
  {
    id: 'order_confirmed',
    key: 'notify_order_confirmed',
    title: 'Order Confirmed',
    description: 'Sent when online payment is verified or COD order is officially confirmed.',
  },
  {
    id: 'order_packed',
    key: 'notify_order_packed',
    title: 'Order Packed',
    description: 'Sent when apparel is inspected and boxed at the fulfillment center.',
  },
  {
    id: 'order_shipped',
    key: 'notify_order_shipped',
    title: 'Shipment Dispatched',
    description: 'Sent when handed over to courier partner with live AWB tracking details.',
  },
  {
    id: 'out_for_delivery',
    key: 'notify_out_for_delivery',
    title: 'Out for Delivery',
    description: 'Sent on the day of delivery when executive is out for doorstep delivery.',
  },
  {
    id: 'order_delivered',
    key: 'notify_order_delivered',
    title: 'Order Delivered',
    description: 'Sent when parcel is handed over. Activates 7-day return/exchange window.',
  },
  {
    id: 'order_cancelled',
    key: 'notify_order_cancelled',
    title: 'Order Cancelled',
    description: 'Sent when an order is cancelled and inventory hold is released.',
  },
  {
    id: 'refund_completed',
    key: 'notify_refund_completed',
    title: 'Refund Completed',
    description: 'Sent when refunded amount is credited back to customer account.',
  },
]

export function NotificationsManagerClient({
  initialSettings,
  initialHistory,
  totalCount,
  mailerStatus,
}: NotificationsManagerClientProps) {
  const [settings, setSettings] = useState<StoreNotificationSettings>(initialSettings)
  const [history, setHistory] = useState<OutboxJobRecord[]>(initialHistory)
  const [activeTab, setActiveTab] = useState<'settings' | 'preview' | 'history'>('settings')

  // Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null)

  // Test Email State
  const [testEmail, setTestEmail] = useState('')
  const [testEvent, setTestEvent] = useState<OrderNotificationEvent>('order_confirmed')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Preview State
  const [previewEvent, setPreviewEvent] = useState<OrderNotificationEvent>('order_confirmed')

  // History State
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false)
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null)

  // SMTP Credential State
  const [smtpPass, setSmtpPass] = useState(settings.smtp_pass || '')
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false)
  const [verifyFeedback, setVerifyFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Process Outbox State
  const [isProcessingOutbox, setIsProcessingOutbox] = useState(false)
  const [processFeedback, setProcessFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Save Settings Handler
  async function handleSaveSettings() {
    setIsSavingSettings(true)
    setSettingsFeedback(null)
    try {
      const payloadSettings = {
        ...settings,
        smtp_pass: smtpPass,
      }
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payloadSettings }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSettings(data.settings)
        setSettingsFeedback('Notification settings & SMTP credentials saved successfully.')
      } else {
        setSettingsFeedback(data.error || 'Failed to save settings.')
      }
    } catch (err: any) {
      setSettingsFeedback(err.message || 'Error saving settings.')
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Verify SMTP Connection Handler
  async function handleVerifySmtp() {
    setIsVerifyingSmtp(true)
    setVerifyFeedback(null)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_SMTP',
          config: {
            user: settings.smtp_user || mailerStatus.smtpUser,
            pass: smtpPass || settings.smtp_pass,
            host: settings.smtp_host || mailerStatus.smtpHost,
            port: settings.smtp_port || mailerStatus.smtpPort,
          },
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerifyFeedback({
          success: true,
          message: data.message || 'Gmail SMTP connection verified successfully!',
        })
      } else {
        setVerifyFeedback({
          success: false,
          message: data.error || 'Gmail SMTP verification failed.',
        })
      }
    } catch (err: any) {
      setVerifyFeedback({ success: false, message: err.message || 'Connection test failed.' })
    } finally {
      setIsVerifyingSmtp(false)
    }
  }

  // Send Test Email Handler
  async function handleSendTest() {
    if (!testEmail || !testEmail.includes('@')) {
      setTestFeedback({ success: false, message: 'Please enter a valid recipient email.' })
      return
    }

    setIsSendingTest(true)
    setTestFeedback(null)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testEmail, event: testEvent }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestFeedback({
          success: true,
          message: `Test email sent to ${testEmail}! ${data.simulated ? '(Simulated mode)' : `(Message ID: ${data.messageId || 'sent'})`}`,
        })
        fetchHistory()
      } else {
        setTestFeedback({
          success: false,
          message: data.error || 'Failed to send test email.',
        })
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: err.message || 'Error sending test email.' })
    } finally {
      setIsSendingTest(false)
    }
  }

  // Refresh History
  async function fetchHistory() {
    setIsRefreshingHistory(true)
    try {
      const res = await fetch('/api/admin/notifications?limit=50')
      const data = await res.json()
      if (res.ok && data.success) {
        setHistory(data.history || [])
      }
    } catch {} finally {
      setIsRefreshingHistory(false)
    }
  }

  // Retry Failed Job
  async function handleRetryJob(jobId: string) {
    setRetryingJobId(jobId)
    try {
      const res = await fetch('/api/admin/notifications/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchHistory()
      } else {
        alert(data.error || 'Retry failed')
      }
    } catch (err: any) {
      alert(err.message || 'Retry failed')
    } finally {
      setRetryingJobId(null)
    }
  }

  // Process All Pending Outbox Notifications Now
  async function handleProcessPendingOutbox() {
    setIsProcessingOutbox(true)
    setProcessFeedback(null)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PROCESS_OUTBOX', limit: 25 }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setProcessFeedback({
          success: true,
          message: `Processed ${data.processed} job(s): ${data.succeeded} dispatched, ${data.failed} failed/held.`,
        })
        await fetchHistory()
      } else {
        setProcessFeedback({
          success: false,
          message: data.error || 'Failed to process pending outbox jobs.',
        })
      }
    } catch (err: any) {
      setProcessFeedback({ success: false, message: err.message || 'Error processing outbox.' })
    } finally {
      setIsProcessingOutbox(false)
    }
  }

  // Sample data for Template Preview
  const sampleData = {
    order_id: 'ord_sample_9841',
    order_number: 'BB-20261011-8842',
    event: previewEvent,
    recipient_email: 'customer@bubbleboom.in',
    customer_name: 'Alex Mercer',
    total_amount: 3499,
    subtotal: 3499,
    shipping_amount: 0,
    payment_method: previewEvent === 'order_confirmed' ? 'cashfree' : 'cod',
    payment_status: previewEvent === 'order_confirmed' || previewEvent === 'refund_completed' ? 'paid' : 'pending',
    items: [
      {
        product_id: 'prod_hoodie_1',
        product_name: 'Heavyweight Boxy Hoodie',
        size: 'L',
        color: 'Washed Black',
        quantity: 1,
        price: 2499,
        total_amount: 2499,
        image_url: 'https://bubbleboom-clothing.vercel.app/images/products/hoodie-black.jpg',
      },
      {
        product_id: 'prod_tee_1',
        product_name: 'Oversized Acid Wash Tee',
        size: 'XL',
        color: 'Smoke Grey',
        quantity: 1,
        price: 1000,
        total_amount: 1000,
        image_url: 'https://bubbleboom-clothing.vercel.app/images/products/tee-grey.jpg',
      },
    ],
    shipping_address: {
      full_name: 'Alex Mercer',
      phone: '9876543210',
      address_line1: 'Flat 402, Highrise Tower, Indiranagar',
      address_line2: '100ft Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pin_code: '560038',
    },
    carrier: 'Bluedart Express',
    tracking_number: 'BLUEDART-882910382',
    tracking_url: 'https://bubbleboom-clothing.vercel.app/track-order?order_id=BB-20261011-8842',
    estimated_delivery: 'October 16, 2026',
  }

  const previewRendered = renderNotificationHtml(previewEvent, sampleData)

  const filteredHistory = history.filter((j) => {
    if (historyFilter === 'all') return true
    return j.status === historyFilter
  })

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: SMTP Config */}
        <div className="bg-black text-white p-5 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">SMTP Transport</span>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="text-lg font-black uppercase tracking-tight">
            {mailerStatus.provider === 'gmail-smtp'
              ? 'Gmail SMTP'
              : mailerStatus.provider === 'resend'
              ? 'Resend API'
              : 'Local / Simulated'}
          </div>
          <p className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
            {mailerStatus.smtpUser}
          </p>
        </div>

        {/* Card 2: Total Dispatches */}
        <div className="bg-white text-black p-5 border border-black">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">Outbox Logged</span>
            <Mail className="w-4 h-4 text-black" />
          </div>
          <div className="text-2xl font-black">{history.length}</div>
          <p className="text-[11px] font-mono text-neutral-600 mt-1">
            Total lifecycle records
          </p>
        </div>

        {/* Card 3: Delivered Successfully */}
        <div className="bg-white text-black p-5 border border-black">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">Completed</span>
            <CheckCircle className="w-4 h-4 text-black" />
          </div>
          <div className="text-2xl font-black">
            {history.filter((h) => h.status === 'completed').length}
          </div>
          <p className="text-[11px] font-mono text-neutral-600 mt-1">
            Verified email deliveries
          </p>
        </div>

        {/* Card 4: Failed / Need Attention */}
        <div className="bg-white text-black p-5 border border-black">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">Failed / Pending</span>
            <AlertTriangle className="w-4 h-4 text-black" />
          </div>
          <div className="text-2xl font-black">
            {history.filter((h) => h.status === 'failed' || h.status === 'pending').length}
          </div>
          <p className="text-[11px] font-mono text-neutral-600 mt-1">
            Requires retry or queued
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-black gap-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'settings'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Notification Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'preview'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Template Previews</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'history'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Outbox History ({history.length})</span>
        </button>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Toggles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-black p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Order Event Notifications
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    Toggle which customer lifecycle events trigger automatic branded emails.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold uppercase">Master Switch</span>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-5 h-5 accent-black cursor-pointer"
                  />
                </div>
              </div>

              {/* Event Toggles Grid */}
              <div className="space-y-4">
                {NOTIFICATION_EVENTS.map((event) => {
                  const isChecked = Boolean(settings[event.key])
                  return (
                    <label
                      key={event.id}
                      className={`flex items-start justify-between p-4 border transition-colors cursor-pointer ${
                        isChecked
                          ? 'border-black bg-neutral-50'
                          : 'border-neutral-200 opacity-60 bg-white'
                      }`}
                    >
                      <div className="space-y-1 pr-4">
                        <div className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                          <span>{event.title}</span>
                          {isChecked && (
                            <span className="text-[9px] font-mono bg-black text-white px-2 py-0.5 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600">{event.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        disabled={!settings.enabled}
                        checked={isChecked}
                        onChange={(e) =>
                          setSettings({ ...settings, [event.key]: e.target.checked })
                        }
                        className="w-5 h-5 accent-black cursor-pointer shrink-0 mt-1"
                      />
                    </label>
                  )
                })}
              </div>

              {settingsFeedback && (
                <div
                  className={`p-3 text-xs font-mono font-bold uppercase border ${
                    settingsFeedback.includes('successfully')
                      ? 'bg-neutral-100 border-black text-black'
                      : 'bg-red-50 border-red-500 text-red-600'
                  }`}
                >
                  {settingsFeedback}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="bg-black text-white px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Notification Rules'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Send Test Email */}
          <div className="space-y-6">
            <div className="bg-white border border-black p-6 space-y-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Send Test Email</span>
                </h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Verify your Gmail SMTP credentials and inspect delivery live.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-mono font-bold uppercase block mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    placeholder="youremail@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase block mb-1">
                    Select Event Template
                  </label>
                  <select
                    value={testEvent}
                    onChange={(e) => setTestEvent(e.target.value as OrderNotificationEvent)}
                    className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none"
                  >
                    {NOTIFICATION_EVENTS.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSendTest}
                  disabled={isSendingTest}
                  className="w-full bg-black text-white py-3 text-xs font-mono font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? 'Dispatching...' : 'Dispatch Test Email'}</span>
                </button>
              </div>

              {testFeedback && (
                <div
                  className={`p-3 text-xs font-mono border ${
                    testFeedback.success
                      ? 'bg-neutral-100 border-black text-black'
                      : 'bg-red-50 border-red-500 text-red-600'
                  }`}
                >
                  {testFeedback.message}
                </div>
              )}
            </div>

            {/* SMTP Environment & App Password Configuration */}
            <div className="bg-neutral-50 border border-neutral-300 p-5 space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <div className="font-bold uppercase tracking-wider text-black flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>Gmail SMTP Gateway</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${
                    mailerStatus.configured || Boolean(smtpPass)
                      ? 'bg-neutral-900 text-white border-black'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {mailerStatus.configured || Boolean(smtpPass) ? 'Credentials Active' : 'Setup Required'}
                </span>
              </div>

              <ul className="space-y-1.5 text-neutral-600">
                <li>• Host: <strong className="text-black">{mailerStatus.smtpHost || 'smtp.gmail.com'}</strong> (Port: {mailerStatus.smtpPort || 465})</li>
                <li>• User: <strong className="text-black">{mailerStatus.smtpUser || 'bubbleboomstore2026@gmail.com'}</strong></li>
                <li>• From Header: <strong className="text-black">{mailerStatus.fromEmail}</strong></li>
                <li>• Support Inquiries: <strong className="text-black">bubbleboomstore2026@gmail.com</strong></li>
              </ul>

              <div className="space-y-1.5 pt-2 border-t border-neutral-200">
                <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                  Gmail App Password (16 Characters)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter Gmail App Password (e.g. xxxx xxxx xxxx xxxx)"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="flex-1 bg-white border border-neutral-300 px-3 py-2 text-xs text-black focus:outline-none focus:border-black font-mono"
                  />
                  <button
                    onClick={handleVerifySmtp}
                    disabled={isVerifyingSmtp || (!smtpPass && !mailerStatus.configured)}
                    className="bg-black text-white px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isVerifyingSmtp ? 'Testing...' : 'Test SMTP'}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Password is stored securely in Supabase Store Settings and used by the transactional email worker.
                </p>
              </div>

              {verifyFeedback && (
                <div
                  className={`p-3 text-xs font-mono border ${
                    verifyFeedback.success
                      ? 'bg-neutral-100 border-black text-black'
                      : 'bg-red-50 border-red-500 text-red-600'
                  }`}
                >
                  {verifyFeedback.message}
                </div>
              )}

              <p className="text-[10px] text-neutral-500 border-t border-neutral-200 pt-2">
                Authentication login OTP emails continue using Supabase Auth SMTP configuration without disruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE PREVIEWS */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Template Selector Buttons */}
          <div className="flex flex-wrap gap-2 border-b border-black pb-4">
            {NOTIFICATION_EVENTS.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setPreviewEvent(ev.id)}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                  previewEvent === ev.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-neutral-300 hover:border-black'
                }`}
              >
                {ev.title}
              </button>
            ))}
          </div>

          {/* Preview Window */}
          <div className="bg-white border border-black p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-widest block">
                  Subject Line
                </span>
                <div className="text-sm font-bold font-mono text-black mt-0.5">
                  {previewRendered.subject}
                </div>
              </div>
              <span className="text-xs font-mono bg-neutral-100 border border-black px-2 py-1 uppercase font-bold">
                {previewEvent}
              </span>
            </div>

            {/* Email HTML Container */}
            <div className="border border-neutral-300 bg-neutral-100 p-4 overflow-auto max-h-[700px] flex justify-center">
              <iframe
                title="Email Preview"
                srcDoc={previewRendered.html}
                className="w-full max-w-[620px] h-[650px] bg-white border border-neutral-400 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OUTBOX HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white border border-black p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black uppercase tracking-tight">
                Outbox Notification History
              </h3>
              <span className="text-xs font-mono bg-neutral-100 border border-neutral-300 px-2 py-0.5 font-bold">
                {filteredHistory.length} Jobs
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter */}
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as any)}
                className="border border-black px-3 py-1.5 text-xs font-mono bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed Only</option>
                <option value="pending">Pending Only</option>
                <option value="failed">Failed Only</option>
              </select>

              <button
                onClick={fetchHistory}
                disabled={isRefreshingHistory}
                className="flex items-center gap-1.5 border border-black px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-black hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleProcessPendingOutbox}
                disabled={isProcessingOutbox}
                className="flex items-center gap-1.5 bg-black text-white border border-black px-3.5 py-1.5 text-xs font-mono font-bold uppercase hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isProcessingOutbox ? 'animate-pulse' : ''}`} />
                <span>{isProcessingOutbox ? 'Processing...' : 'Process Outbox Now'}</span>
              </button>
            </div>
          </div>

          {processFeedback && (
            <div
              className={`p-3 text-xs font-mono border ${
                processFeedback.success
                  ? 'bg-neutral-100 border-black text-black'
                  : 'bg-red-50 border-red-500 text-red-600'
              }`}
            >
              {processFeedback.message}
            </div>
          )}

          {/* Table */}
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-neutral-500 uppercase">
              No outbox jobs found matching filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-neutral-50 text-neutral-600 uppercase">
                    <th className="p-3">Job ID &amp; Date</th>
                    <th className="p-3">Event</th>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredHistory.map((job) => {
                    const isSuccess = job.status === 'completed'
                    const isFailed = job.status === 'failed'
                    const isPending = job.status === 'pending' || job.status === 'processing'

                    return (
                      <tr key={job.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-black">{job.id}</div>
                          <div className="text-[10px] text-neutral-500">
                            {new Date(job.created_at).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold uppercase text-black">
                            {job.payload.event || job.job_type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-black">
                          #{job.payload.order_number || job.payload.order_id}
                        </td>
                        <td className="p-3">
                          <div className="text-black">{job.payload.recipient_email}</div>
                          <div className="text-[10px] text-neutral-500">
                            {job.payload.customer_name}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isSuccess
                                ? 'bg-black text-white'
                                : isFailed
                                ? 'bg-red-600 text-white'
                                : 'bg-neutral-200 text-black'
                            }`}
                          >
                            {job.status}
                          </span>
                          {job.last_error && (
                            <div className="text-[10px] text-red-600 mt-1 max-w-[200px] truncate" title={job.last_error}>
                              {job.last_error}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isFailed && (
                            <button
                              onClick={() => handleRetryJob(job.id)}
                              disabled={retryingJobId === job.id}
                              className="inline-flex items-center gap-1 bg-black text-white px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-neutral-800 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{retryingJobId === job.id ? 'Retrying...' : 'Retry'}</span>
                            </button>
                          )}
                          {isSuccess && (
                            <span className="text-neutral-400 text-[10px] uppercase font-bold">
                              Delivered
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
