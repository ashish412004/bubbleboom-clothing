import { getCategories } from '@/lib/categories'
import { CategoryManager } from './category-manager'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await getCategories()

  return <CategoryManager initialCategories={categories} />
}
