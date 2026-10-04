import { getCollections } from '@/lib/collections'
import Link from 'next/link'
import { ExternalLink, Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminCollectionsPage() {
  const collections = await getCollections()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Capsule Drops &amp; Collections</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Curate drop themes, hero banners, and limited release streetwear groupings.
          </p>
        </div>
      </div>

      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Collection Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Visibility</th>
                <th className="p-3 text-right">Storefront</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {collections.map((col) => (
                <tr key={col.id} className="hover:bg-neutral-50">
                  <td className="p-3 font-bold uppercase text-black">{col.name}</td>
                  <td className="p-3 text-neutral-600">/collections/{col.slug}</td>
                  <td className="p-3 text-neutral-500 max-w-xs truncate">{col.description || '—'}</td>
                  <td className="p-3 text-center">
                    <span className="bg-black text-white text-[10px] uppercase px-2 py-0.5 font-bold">
                      {col.is_visible ? 'Public' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/collections/${col.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-bold underline hover:text-neutral-600"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
