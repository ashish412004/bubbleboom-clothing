import { createServiceClient } from '@/lib/supabase/server'
import { ProductForm } from '../product-form'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const supabase = await createServiceClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Create Streetwear Product</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Add new silhouette details, generate variant matrix, and configure pricing.
        </p>
      </div>

      <ProductForm categories={categories || []} />
    </div>
  )
}
