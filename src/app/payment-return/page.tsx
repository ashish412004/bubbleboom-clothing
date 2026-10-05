import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PaymentReturnProps {
  searchParams: Promise<{
    order_id?: string
    session_id?: string
    method?: string
  }>
}

export default async function PaymentReturnPage({ searchParams }: PaymentReturnProps) {
  const params = await searchParams
  const orderNumber = params.order_id

  if (orderNumber) {
    redirect(`/orders/${orderNumber}/payment`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center">
        <AlertCircle size={40} className="mx-auto text-black mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-tight">Order Reference Missing</h1>
        <p className="text-xs text-neutral-500 mt-2 mb-6">
          No order identifier was received from the payment gateway.
        </p>
        <Link
          href="/shop"
          className="inline-block bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold"
        >
          Return to Store
        </Link>
      </main>
      <Footer />
    </div>
  )
}
