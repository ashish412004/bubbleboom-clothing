import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getAdminProducts } from '@/lib/products'
import { ProductTable } from './product-table'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const allProducts = await getAdminProducts()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Product Catalog</h1>
          <p className="text-xs text-neutral-600 font-mono mt-1">
            Manage streetwear garments, variant-level stock, storefront publication states, and removals.
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

      <ProductTable initialProducts={allProducts} />
    </div>
  )
}
