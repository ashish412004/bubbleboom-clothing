import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getWishlist } from '@/lib/wishlist'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { WishlistView } from './wishlist-view'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Saved Items | BUBBLE BOOM',
  description: 'Your saved wardrobe pieces and limited edition streetwear drops.',
}

export default async function WishlistPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('bubbleboom_guest_session')?.value
  
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const items = await getWishlist(user?.id, sessionId)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2 flex items-center space-x-2 font-mono">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <span className="text-black font-semibold">Wishlist</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
              Saved Pieces
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600 max-w-lg">
              Manage your personal collection of streetwear pieces before they sell out.
            </p>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <WishlistView initialItems={items} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
