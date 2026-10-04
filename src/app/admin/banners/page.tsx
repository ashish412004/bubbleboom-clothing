import { getStoreSettings } from '@/lib/settings'
import { BannersClient } from './banners-client'

export const dynamic = 'force-dynamic'

export default async function AdminBannersPage() {
  const banners = await getStoreSettings<any>('banners')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Announcement Bars &amp; Editorial Copy</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Customize the marquee announcement bar and editorial hero typography across the storefront.
        </p>
      </div>

      <BannersClient initialBanners={banners} />
    </div>
  )
}
