import { getCollections } from '@/lib/collections'
import { CollectionManager } from './collection-manager'

export const dynamic = 'force-dynamic'

export default async function AdminCollectionsPage() {
  const collections = await getCollections(true)

  return <CollectionManager initialCollections={collections} />
}
