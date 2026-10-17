import {
  getStoreSettings,
  StoreShippingSettings,
  StoreOrderSettings,
  StoreGeneralSettings,
  StoreExchangeSettings,
  StoreSocialSettings,
} from '@/lib/settings'
import { getNavigationItems } from '@/lib/navigation'
import { getCategories } from '@/lib/categories'
import { getCollections } from '@/lib/collections'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const [shipping, orders, general, exchange, social, navigation, categories, collections] = await Promise.all([
    getStoreSettings<StoreShippingSettings>('shipping'),
    getStoreSettings<StoreOrderSettings>('orders'),
    getStoreSettings<StoreGeneralSettings>('general'),
    getStoreSettings<StoreExchangeSettings>('exchange'),
    getStoreSettings<StoreSocialSettings>('social'),
    getNavigationItems({ forAdmin: true }),
    getCategories(),
    getCollections(),
  ])

  return (
    <div className="space-y-6">
      <SettingsClient
        initialShipping={shipping}
        initialOrders={orders}
        initialGeneral={general}
        initialExchange={exchange}
        initialSocial={social}
        initialNavigation={navigation}
        categories={categories}
        collections={collections}
      />
    </div>
  )
}
