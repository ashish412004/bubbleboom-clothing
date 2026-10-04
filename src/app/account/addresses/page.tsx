import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { AccountNav } from '@/components/account/account-nav'
import { AddressManager } from './address-manager'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Saved Addresses | BUBBLE BOOM',
  description: 'Manage shipping and delivery addresses for express Bubble Boom checkouts.',
}

export default async function AddressesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account/addresses')
  }

  const supabase = await createServerClient()
  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Address Book</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-1">
              Delivery Addresses
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600">
              Save multiple home and studio addresses for seamless one-click order fulfillment.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <AccountNav />
            </aside>

            <div className="lg:col-span-3">
              <AddressManager initialAddresses={addresses || []} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
