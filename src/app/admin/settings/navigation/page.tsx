import { getNavigationItems } from '@/lib/navigation'
import { getCategories } from '@/lib/categories'
import { getCollections } from '@/lib/collections'
import { NavigationManager } from '@/components/admin/navigation-manager'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Navigation & Menus | Bubble Boom Admin',
  robots: 'noindex, nofollow',
}

export default async function AdminNavigationPage() {
  const [items, categories, collections] = await Promise.all([
    getNavigationItems({ forAdmin: true }),
    getCategories(),
    getCollections(),
  ])

  return (
    <div className="space-y-6">
      <NavigationManager
        initialItems={items}
        categories={categories}
        collections={collections}
      />
    </div>
  )
}
