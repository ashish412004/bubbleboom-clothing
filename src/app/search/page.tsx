import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getProducts } from '@/lib/products'
import { SearchClient } from './search-client'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = q?.trim() || ''
  const initialProducts = query ? await getProducts({ search: query }) : []

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />
      <main className="flex-1">
        <SearchClient initialQuery={query} initialProducts={initialProducts} />
      </main>
      <Footer />
    </div>
  )
}
