import { getCategoriesWithCovers } from '@/lib/categories'
import { getProducts } from '@/lib/products'
import { CategoryManager } from './category-manager'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const [categories, products] = await Promise.all([
    getCategoriesWithCovers({ includeHidden: true }),
    getProducts({ limit: 100 }),
  ])

  return <CategoryManager initialCategories={categories} products={products} />
}
