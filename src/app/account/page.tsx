import { getCurrentUser } from '@/lib/auth'
import { getOrdersByUserId } from '@/lib/orders'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { AccountShell } from '@/components/account/account-shell'
import { ProfileDetailsForm } from '@/components/account/profile-details-form'
import { ArrowRight, MapPin, Heart, ShoppingBag, Eye, Edit2, Package, ArrowUpRight } from 'lucide-react'
import { createClient as createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getSafeImageUrl, formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Profile | BUBBLE BOOM',
  description: 'Manage your Bubble Boom profile details, addresses, orders, and saved drops.',
}

export default async function AccountPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account')
  }

  const { getUserProfile } = await import('@/lib/auth')
  const profile = await getUserProfile(user.id)
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ''
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

  const userSummary = {
    id: user.id,
    name: displayName,
    full_name: displayName,
    email: user.email,
    phone: profile?.phone || (user as any).phone || null,
  }

  return (
    <AccountShell user={userSummary}>
      <div className="space-y-10">
        {/* Welcome Greeting Banner */}
        <div className="pb-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] uppercase tracking-widest font-mono text-neutral-500 font-bold block">
              Member Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mt-0.5">
              Welcome back, <span className="font-bold text-black">{firstName}</span>.
            </h1>
          </div>
          <Link
            href="/account/profile"
            className="text-xs uppercase tracking-wider font-bold text-neutral-600 hover:text-black flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Edit Profile</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Phase 4 & Phase 5: Profile Details Form & Default Address */}
        <section aria-label="Personal Info & Default Address" className="space-y-4">
          <div className="sr-only">
            <span>Personal Info</span>
            <span>Default Address</span>
            <span>Manage Addresses</span>
          </div>
          <ProfileDetailsForm
            initialFullName={displayName}
            initialEmail={user.email || ''}
            initialPhone={userSummary.phone}
            defaultAddress={defaultAddress}
          />
        </section>

        {/* Recent Orders Section (Latest 2 Orders with VIEW ALL ORDERS Link) */}
        <section aria-labelledby="recent-orders-heading" className="pt-6 border-t border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="recent-orders-heading" className="text-sm font-black uppercase tracking-wider text-black">
                Recent Orders
              </h3>
              <p className="text-xs text-neutral-500">
                Latest fulfillment and shipping updates.
              </p>
            </div>
            <Link
              href="/account/orders"
              className="text-xs uppercase tracking-wider font-bold text-neutral-800 hover:text-black transition-colors inline-flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-[#F9F9FB] rounded-xl p-8 border border-dashed border-neutral-300 text-center space-y-3">
              <Package className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-xs text-neutral-600 font-medium">
                You have not placed any orders yet.
              </p>
              <Link
                href="/shop"
                className="inline-block px-5 py-2.5 rounded-lg bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                Discover Collection
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((ord) => {
                const items = (ord as any).order_items || []
                return (
                  <div
                    key={ord.id}
                    className="bg-[#F9F9FB] rounded-xl p-4 sm:p-5 border border-neutral-200/80 hover:border-black/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-black">
                          {ord.order_number}
                        </span>
                        <span className="bg-black text-white text-[10px] uppercase font-mono px-2 py-0.5 font-bold rounded-full">
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })} · {items.length} {items.length === 1 ? 'Item' : 'Items'}
                      </p>

                      {/* Item Thumbnails Preview */}
                      {items.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          {items.slice(0, 3).map((it: any, idx: number) => {
                            const v = it.variant_info || {}
                            const img = it.image_url || v.image_url || null
                            return (
                              <div
                                key={idx}
                                className="w-10 h-10 rounded-md border border-neutral-200 overflow-hidden bg-white relative shrink-0"
                              >
                                {img ? (
                                  <Image
                                    src={getSafeImageUrl(img)}
                                    alt={it.product_name || 'Product'}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-[9px] font-mono font-bold text-neutral-400">
                                    BB
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {items.length > 3 && (
                            <span className="text-[11px] font-mono text-neutral-500 font-bold">
                              +{items.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-mono text-neutral-500 block">Total</span>
                        <span className="text-base font-black font-mono text-black">
                          {formatPrice(ord.total_amount)}
                        </span>
                      </div>
                      <Link
                        href={`/account/orders?orderId=${ord.order_number}`}
                        className="text-xs uppercase font-bold tracking-wider text-black hover:underline flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Saved Drops Preview (Up to 3 items) */}
        <section aria-labelledby="saved-drops-heading" className="pt-6 border-t border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="saved-drops-heading" className="text-sm font-black uppercase tracking-wider text-black">
                Saved Drops
              </h3>
              <p className="text-xs text-neutral-500">
                Quick access to your prioritized wishlist wishlist items.
              </p>
            </div>
            <Link
              href="/account/saved-drops"
              className="text-xs uppercase tracking-wider font-bold text-neutral-800 hover:text-black transition-colors inline-flex items-center gap-1"
            >
              <span>View All Saved Drops</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {savedDropsPreview.length === 0 ? (
            <div className="bg-[#F9F9FB] rounded-xl p-8 border border-dashed border-neutral-300 text-center space-y-3">
              <Heart className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-xs text-neutral-600 font-medium">
                No drops saved to your wishlist yet.
              </p>
              <Link
                href="/shop"
                className="inline-block px-5 py-2.5 rounded-lg bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                Browse Shop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {savedDropsPreview.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#F9F9FB] rounded-xl p-3 border border-neutral-200/80 hover:border-black/50 transition-all space-y-2 group"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white">
                    <Image
                      src={getSafeImageUrl(item.product?.image_url)}
                      alt={item.product?.title || 'Product'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-black truncate">
                      {item.product?.title}
                    </h4>
                    <p className="text-xs font-mono font-bold text-black mt-0.5">
                      {formatPrice(item.product?.selling_price)}
                    </p>
                  </div>
                  <Link
                    href={`/products/${item.product?.slug}`}
                    className="block text-center py-1.5 rounded-md bg-white border border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors"
                  >
                    View Product
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AccountShell>
  )
}
