import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit3, Eye, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const supabase = await createServiceClient()

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .order('created_at', { ascending: false })

  const allProducts = products || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Product Catalog</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Manage streetwear garments, variant-level stock, and storefront publication states.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Catalog Table */}
      <div className="border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price / MRP</th>
                <th className="p-3">Variants</th>
                <th className="p-3">Total Stock</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {allProducts.length > 0 ? (
                allProducts.map((p: any) => {
                  const firstImage = p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
                  const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-14 bg-neutral-100 border border-neutral-300 shrink-0 overflow-hidden">
                            <Image src={firstImage} alt={p.name} fill className="object-cover" />
                          </div>
                          <div>
                            <span className="font-bold uppercase text-black block">{p.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">/{p.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 uppercase">{p.category?.name || 'Uncategorized'}</td>
                      <td className="p-3">
                        <span className="font-black text-black">₹{p.selling_price?.toLocaleString('en-IN')}</span>
                        {p.mrp > p.selling_price && (
                          <span className="text-neutral-400 line-through ml-2">₹{p.mrp?.toLocaleString('en-IN')}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.variants?.length || 0} variants
                        <div className="text-[10px] text-neutral-500">
                          {p.variants?.map((v: any) => v.size).filter((val: any, idx: number, arr: any[]) => arr.indexOf(val) === idx).join(', ')}
                        </div>
                      </td>
                      <td className="p-3 font-bold">
                        <span className={totalStock <= 10 ? 'text-neutral-900 font-black' : ''}>
                          {totalStock} units
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold ${
                          p.is_published ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'
                        }`}>
                          {p.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            title="View on storefront"
                            className="p-1 hover:text-neutral-600"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                    No products found in catalog. Create your first product above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
