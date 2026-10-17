import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AccountNav } from '@/components/account/account-nav'
import { getWishlist } from '@/lib/wishlist'
import { SavedDropsView } from './saved-drops-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Saved Drops | BUBBLE BOOM',
  description: 'Manage your saved wishlist pieces and limited edition streetwear drops.',
}

export default async function SavedDropsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account/saved-drops')
  }

  const cookieStore = await cookies()
  const sessionId =
    cookieStore.get('bb_session_id')?.value ||
    cookieStore.get('bubbleboom_guest_session')?.value

  const items = await getWishlist(user.id, sessionId)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Wishlist & Vault</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-1">
              Saved Drops
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600">
              Manage your personal collection of streetwear pieces and track sizing and stock before they sell out.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <AccountNav />
            </aside>

            <div className="lg:col-span-3">
              <SavedDropsView initialItems={items} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
