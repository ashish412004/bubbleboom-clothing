import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCurrentUser } from '@/lib/auth'
import { getOrdersByUserId } from '@/lib/orders'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AccountNav } from '@/components/account/account-nav'
import { ArrowRight, Package, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Order History | BUBBLE BOOM',
  description: 'View and track all your past and present Bubble Boom clothing orders.',
}

export default async function OrdersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account/orders')
  }

  const orders = await getOrdersByUserId(user.id)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Order Archive</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-1">
              My Orders
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600">
              Review current delivery statuses, download receipts, and manage order returns.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <AccountNav />
            </aside>

            <div className="lg:col-span-3">
              {orders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-300 p-8">
                  <Package className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
                  <h3 className="text-base uppercase tracking-tight font-black mb-1">No Orders Found</h3>
                  <p className="text-xs text-neutral-600 mb-6">
                    You haven&apos;t placed any orders with Bubble Boom yet.
                  </p>
                  <Link
                    href="/shop"
                    className="inline-block bg-black text-white px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="border border-black bg-white p-6 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-base">{ord.order_number}</span>
                            <span className="bg-black text-white text-[10px] uppercase font-mono px-2.5 py-0.5 font-bold">
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            Ordered on {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-mono text-neutral-500 block">Total Amount</span>
                          <span className="text-lg font-black font-mono">
                            ₹{ord.total_amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-neutral-600 font-mono flex flex-wrap items-center gap-2">
                          <span>Payment: <strong>{ord.payment_method.toUpperCase()}</strong></span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                              ord.payment_status === 'paid'
                                ? 'bg-black text-white'
                                : ord.payment_status === 'failed'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {ord.payment_status === 'paid' ? 'PAID ✓' : ord.payment_status.toUpperCase()}
                          </span>
                          {ord.tracking_number && (
                            <span className="block sm:inline sm:ml-2 text-black font-bold">
                              AWB: {ord.tracking_number}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {(ord.payment_status === 'paid' || ord.payment_method === 'cod') && (
                            <a
                              href={`/api/orders/${ord.order_number}/invoice`}
                              download
                              className="inline-flex items-center justify-center gap-1.5 border border-black bg-white hover:bg-neutral-100 text-black px-3 py-2 text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
                              title="Download Tax Invoice"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Invoice</span>
                            </a>
                          )}

                          <Link
                            href={`/account/orders/${ord.order_number}`}
                            className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
                          >
                            <span>Track &amp; View Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
