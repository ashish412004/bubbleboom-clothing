import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCurrentUser } from '@/lib/auth'
import { getOrdersByUserId } from '@/lib/orders'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { AccountNav } from '@/components/account/account-nav'
import { ArrowRight, MapPin, Heart, ShoppingBag, Eye, Edit2 } from 'lucide-react'
import { createClient as createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getSafeImageUrl, formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Account | BUBBLE BOOM',
  description: 'Manage your Bubble Boom orders, addresses, saved drops, and account preferences.',
}

export default async function AccountPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account')
  }

  const { getUserProfile } = await import('@/lib/auth')
  const profile = await getUserProfile(user.id)
  const displayName = profile?.full_name || user.user_metadata?.full_name || ''
  const firstName = displayName ? displayName.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Member')

  // Fetch ONLY the latest 2 orders required for Account Overview
  const recentOrders = await getOrdersByUserId(user.id, 2)

  // Fetch Default Address Preview
  let defaultAddress: any = null
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerClient()
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
      defaultAddress = data?.[0] || null
    } catch {}
  } else {
    try {
      const cookieStore = await cookies()
      const raw = cookieStore.get('bb_dev_addresses')?.value
      if (raw) {
        const list = JSON.parse(raw)
        defaultAddress = list.find((a: any) => a.is_default) || list[0] || null
      }
    } catch {}
  }

  // Fetch Saved Drops Preview (Compact preview of up to 3 items)
  let savedDropsPreview: any[] = []
  let totalSavedDrops = 0
  try {
    const cookieStore = await cookies()
    const sessionId =
      cookieStore.get('bb_session_id')?.value ||
      cookieStore.get('bubbleboom_guest_session')?.value
    const { getWishlist } = await import('@/lib/wishlist')
    const allDrops = await getWishlist(user.id, sessionId)
    totalSavedDrops = allDrops.length
    savedDropsPreview = allDrops.slice(0, 3)
  } catch {}

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Account Banner */}
        <section className="border-b border-black py-8 md:py-12 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Member Space</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-1">
              Account Overview
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600">
              Welcome back, <span className="font-bold text-black">{firstName}</span>.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar / Mobile Navigation */}
            <aside className="lg:col-span-1">
              <AccountNav />
            </aside>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* 1. Recent Orders (Latest 2 orders only) */}
              <div className="border border-black bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
                  <div>
                    <h2 className="text-base uppercase tracking-tight font-black">Recent Orders</h2>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5">Your latest purchases</p>
                  </div>
                  <Link
                    href="/account/orders"
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600"
                  >
                    <span>View All Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentOrders.length > 0 ? (
                  <div className="divide-y divide-neutral-200">
                    {recentOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-sm">{ord.order_number}</span>
                            <span className="bg-black text-white text-[10px] uppercase font-mono px-2 py-0.5 font-bold">
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 font-mono">
                            Placed on{' '}
                            {new Date(ord.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
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
                  <div className="py-8 text-center border border-dashed border-neutral-300 p-6">
                    <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
                      No orders placed yet.
                    </p>
                    <Link
                      href="/shop"
                      className="inline-block mt-3 bg-black text-white px-5 py-2 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors"
                    >
                      Continue Shopping
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. Saved Drops Preview */}
              <div className="border border-black bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
                  <div>
                    <h2 className="text-base uppercase tracking-tight font-black">Saved Drops</h2>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5">
                      {totalSavedDrops} {totalSavedDrops === 1 ? 'piece saved' : 'pieces saved'}
                    </p>
                  </div>
                  <Link
                    href="/account/saved-drops"
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600"
                  >
                    <span>View All Saved Drops</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {savedDropsPreview.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {savedDropsPreview.map((item) => {
                      const product = item.variant?.product
                      const variant = item.variant
                      if (!product || !variant) return null
                      const img = getSafeImageUrl(product.images?.[0]?.image_url)

                      return (
                        <div
                          key={`preview-${item.id}`}
                          className="border border-neutral-200 p-3 bg-neutral-50 flex items-center gap-3"
                        >
                          <div className="relative w-14 h-18 bg-neutral-200 shrink-0 border border-neutral-300 overflow-hidden">
                            <Image
                              src={img}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-bold uppercase truncate text-black hover:underline">
                              <Link href={`/products/${product.slug}`}>{product.name}</Link>
                            </h3>
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                              {variant.size} · {variant.color}
                            </p>
                            <p className="text-xs font-mono font-black mt-1">
                              {formatPrice(product.selling_price)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center border border-dashed border-neutral-300 p-6">
                    <Heart className="w-6 h-6 mx-auto text-neutral-400 mb-2" />
                    <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
                      No saved pieces in your vault.
                    </p>
                    <Link
                      href="/shop"
                      className="inline-block mt-3 border border-black px-4 py-1.5 text-xs uppercase tracking-wider font-bold hover:bg-black hover:text-white transition-colors"
                    >
                      Explore Drops
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Default Address & Personal Information (Side by side on tablet/desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Default Delivery Address Preview */}
                <div className="border border-black bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200">
                      <h2 className="text-sm uppercase tracking-tight font-black">Default Address</h2>
                      <MapPin className="w-4 h-4 text-black" />
                    </div>

                    {defaultAddress ? (
                      <div className="text-xs text-neutral-700 space-y-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-sm uppercase text-black">
                            {defaultAddress.full_name}
                          </span>
                          <span className="bg-black text-white text-[9px] font-mono uppercase px-1.5 py-0.5 font-bold">
                            Default
                          </span>
                        </div>
                        <p>{defaultAddress.address_line1}</p>
                        {defaultAddress.address_line2 && <p>{defaultAddress.address_line2}</p>}
                        <p>
                          {defaultAddress.city}, {defaultAddress.state} —{' '}
                          <span className="font-mono font-bold">{defaultAddress.pin_code}</span>
                        </p>
                        <p className="font-mono text-neutral-500 pt-1">Phone: {defaultAddress.phone}</p>
                      </div>
                    ) : (
                      <div className="py-4 text-neutral-500 text-xs">
                        <p>No default delivery address set yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-200">
                    <Link
                      href="/account/addresses"
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600"
                    >
                      <span>{defaultAddress ? 'Manage Addresses' : 'Add Delivery Address'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="border border-black bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200">
                      <h2 className="text-sm uppercase tracking-tight font-black">Personal Info</h2>
                      <Edit2 className="w-4 h-4 text-black" />
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-neutral-500">Full Name</span>
                        <p className="font-bold text-sm text-black mt-0.5">
                          {displayName || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-neutral-500">Email Address</span>
                        <p className="font-mono text-sm text-black mt-0.5 break-all">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-200">
                    <Link
                      href="/account/profile"
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600"
                    >
                      <span>Edit Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
