import { createServiceClient } from '@/lib/supabase/server'
import { getProductById } from '@/lib/products'
import { notFound } from 'next/navigation'
import { ProductForm } from '../../product-form'

export const dynamic = 'force-dynamic'

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    notFound()
  }

  const supabase = await createServiceClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Edit Streetwear Product</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Modify product details, pricing, sizing variants, inventory stock, and imagery.
        </p>
      </div>

      <ProductForm categories={categories || []} initialProduct={product} />
    </div>
  )
}
