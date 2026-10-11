import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCart, calculateCartSummary, getBuyNowItemDetails, CartItemWithDetails } from '@/lib/cart'
import { getCurrentUser } from '@/lib/auth'
import { createClient as createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CheckoutForm } from './checkout-form'

export const dynamic = 'force-dynamic'

interface CheckoutPageProps {
  searchParams?: Promise<{
    variant_id?: string
    quantity?: string
  }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = searchParams ? await searchParams : {}
  const buyNowVariantId = typeof params.variant_id === 'string' ? params.variant_id : undefined
  const buyNowQuantity = Math.max(1, parseInt(typeof params.quantity === 'string' ? params.quantity : '1', 10) || 1)

  const isBuyNow = Boolean(buyNowVariantId)

  const user = await getCurrentUser()

  // Require customer authentication to checkout
  if (!user) {
    if (isBuyNow) {
      const returnUrl = `/checkout?variant_id=${encodeURIComponent(buyNowVariantId!)}&quantity=${buyNowQuantity}`
      redirect(`/login?next=${encodeURIComponent(returnUrl)}`)
    } else {
      redirect('/login?next=/checkout')
    }
  }

  let items: CartItemWithDetails[] = []

  if (isBuyNow) {
    const buyNowRes = await getBuyNowItemDetails(buyNowVariantId!, buyNowQuantity)
    if (buyNowRes.error || !buyNowRes.item) {
      redirect('/cart')
    }
    items = [buyNowRes.item]
  } else {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('bb_session_id')?.value
    items = await getCart(user?.id, sessionId)

    if (!items || items.length === 0) {
      redirect('/cart')
    }
  }

  const [summary, addresses] = await Promise.all([
    calculateCartSummary(items),
    (async () => {
      if (!isSupabaseConfigured() || !user) return []
      try {
        const supabase = await createServerClient()
        const { data } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
        return data || []
      } catch {
        return []
      }
    })(),
  ])

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        <div className="border-b border-neutral-200 py-6 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
              {isBuyNow ? 'Instant Checkout' : 'Secure Checkout'}
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
            isBuyNow={isBuyNow}
            buyNowVariantId={buyNowVariantId}
            buyNowQuantity={buyNowQuantity}
            initialAddresses={addresses}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

