import { getNewsletterSubscribersAdmin } from '@/lib/newsletter'
import { SubscribersClient } from './subscribers-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Boom Squad Subscribers | Admin Terminal',
}

export default async function AdminSubscribersPage() {
  const initialData = await getNewsletterSubscribersAdmin({
    status: 'all',
    search: '',
    limit: 100,
    offset: 0,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Boom Squad Newsletter Subscribers</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Double opt-in verified audience, consent timestamps, and marketing subscription statuses.
        </p>
      </div>

      <SubscribersClient
        initialSubscribers={initialData.subscribers}
        initialCounts={initialData.counts}
        initialTotal={initialData.totalFiltered}
      />
    </div>
  )
}
