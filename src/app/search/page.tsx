import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getProducts } from '@/lib/products'
import { SearchClient } from './search-client'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string }>
}

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, category } = await searchParams
  const query = q?.trim() || ''
  const cat = category?.trim() && category.trim() !== 'all' ? category.trim() : undefined
  const initialProducts = query || cat ? await getProducts({ search: query || undefined, category: cat }) : []

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />
      <main className="flex-1">
        <SearchClient
          initialQuery={query}
          initialCategory={category?.trim() || 'all'}
          initialProducts={initialProducts}
        />
      </main>
      <Footer />
    </div>
  )
}
