import { createServiceClient } from '@/lib/supabase/server'
import { getCategories } from '@/lib/categories'
import { FolderPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Category Architecture</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Organize the Bubble Boom wardrobe hierarchy and storefront navigation filters.
          </p>
        </div>
      </div>

      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Category Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Sort Order</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="p-3 font-bold uppercase text-black">{c.name}</td>
                  <td className="p-3 text-neutral-600">/{c.slug}</td>
                  <td className="p-3 text-neutral-500">{c.description || '—'}</td>
                  <td className="p-3 text-center">{c.sort_order}</td>
                  <td className="p-3 text-right">
                    <span className="bg-black text-white text-[10px] uppercase px-2 py-0.5 font-bold">
                      {c.is_active ? 'Active' : 'Hidden'}
                    </span>
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
