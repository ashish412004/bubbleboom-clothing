import {
  getStoreSettings,
  StoreShippingSettings,
  StoreOrderSettings,
  StoreGeneralSettings,
  StoreExchangeSettings,
} from '@/lib/settings'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const [shipping, orders, general, exchange] = await Promise.all([
    getStoreSettings<StoreShippingSettings>('shipping'),
    getStoreSettings<StoreOrderSettings>('orders'),
    getStoreSettings<StoreGeneralSettings>('general'),
    getStoreSettings<StoreExchangeSettings>('exchange'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Store Settings &amp; Financial Boundaries</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Configure authoritative shipping rates, delivery processing schedules, and exchange policy terms.
        </p>
      </div>

      <SettingsClient
        initialShipping={shipping}
        initialOrders={orders}
        initialGeneral={general}
        initialExchange={exchange}
      />
    </div>
  )
}
