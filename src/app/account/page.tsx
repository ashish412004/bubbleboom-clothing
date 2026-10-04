import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCurrentUser } from '@/lib/auth'
import { getOrdersByUserId } from '@/lib/orders'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AccountNav } from '@/components/account/account-nav'
import { ArrowRight, Package, MapPin, UserCheck, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Account | BUBBLE BOOM',
  description: 'Manage your Bubble Boom orders, addresses, and account preferences.',
}

export default async function AccountPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account')
  }

  const orders = await getOrdersByUserId(user.id)
  const recentOrders = orders.slice(0, 3)

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Account Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Member Space</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-1">
              Account Overview
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600">
              Welcome back, <span className="font-bold text-black">{user.user_metadata?.full_name || user.email}</span>
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <AccountNav />
            </aside>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-8">
              {/* Quick Stat Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-black p-5 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-mono tracking-wider text-neutral-500">Total Orders</span>
                    <Package className="w-4 h-4 text-black" />
                  </div>
                  <p className="text-3xl font-black mt-2 font-mono">{orders.length}</p>
                </div>

                <div className="border border-black p-5 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-mono tracking-wider text-neutral-500">Security</span>
                    <Shield className="w-4 h-4 text-black" />
                  </div>
                  <p className="text-sm font-bold uppercase mt-2">Verified Customer</p>
                </div>

                <div className="border border-black p-5 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-mono tracking-wider text-neutral-500">Free Delivery</span>
                    <UserCheck className="w-4 h-4 text-black" />
                  </div>
                  <p className="text-sm font-bold uppercase mt-2">Orders &gt; ₹1,499</p>
                </div>
              </div>

              {/* Recent Orders Section */}
              <div className="border border-black bg-white p-6">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
                  <h2 className="text-base uppercase tracking-tight font-black">Recent Orders</h2>
                  <Link
                    href="/account/orders"
                    className="text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600"
                  >
                    View All ({orders.length})
                  </Link>
                </div>

                {recentOrders.length > 0 ? (
                  <div className="divide-y divide-neutral-200">
                    {recentOrders.map((ord) => (
                      <div key={ord.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-sm">{ord.order_number}</span>
                            <span className="bg-black text-white text-[10px] uppercase font-mono px-2 py-0.5 font-bold">
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            Placed on {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6">
                          <span className="font-mono font-black text-sm">
                            ₹{ord.total_amount.toLocaleString('en-IN')}
                          </span>
                          <Link
                            href={`/account/orders/${ord.order_number}`}
                            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-bold border border-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors"
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-neutral-300">
                    <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">No orders placed yet.</p>
                    <Link
                      href="/shop"
                      className="inline-block mt-4 bg-black text-white px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                    >
                      Explore Catalog
                    </Link>
                  </div>
                )}
              </div>

              {/* Profile Details Snapshot */}
              <div className="border border-black bg-white p-6">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
                  <h2 className="text-base uppercase tracking-tight font-black">Personal Information</h2>
                  <Link
                    href="/account/profile"
                    className="text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600"
                  >
                    Edit Profile
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-neutral-500">Name</span>
                    <p className="font-bold text-sm mt-0.5">{user.user_metadata?.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-neutral-500">Email</span>
                    <p className="font-mono text-sm mt-0.5">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
