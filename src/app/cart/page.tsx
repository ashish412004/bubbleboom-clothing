import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCart, calculateCartSummary } from '@/lib/cart'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { CartView } from './cart-view'

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const user = await getCurrentUser()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('bb_session_id')?.value

  const items = await getCart(user?.id, sessionId)
  const summary = await calculateCartSummary(items)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        <CartView initialItems={items as any} initialSummary={summary as any} />
      </main>

      <Footer />
    </div>
  )
}
