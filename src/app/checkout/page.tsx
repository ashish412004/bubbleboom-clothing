import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCart, calculateCartSummary } from '@/lib/cart'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CheckoutForm } from './checkout-form'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const user = await getCurrentUser()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('bb_session_id')?.value

  const items = await getCart(user?.id, sessionId)

  if (!items || items.length === 0) {
    redirect('/cart')
  }

  const summary = await calculateCartSummary(items)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        <div className="border-b border-neutral-200 py-6 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
              Secure Checkout
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Bubble Boom Official Store | All India Express Logistics
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <CheckoutForm
            items={items as any}
            summary={summary as any}
            userEmail={user?.email || ''}
            userName={(user as any)?.user_metadata?.full_name || ''}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
