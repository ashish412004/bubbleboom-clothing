import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClient as createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { AccountShell } from '@/components/account/account-shell'
import { AddressManager } from './address-manager'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Addresses | BUBBLE BOOM',
  description: 'Manage shipping and delivery addresses for express Bubble Boom checkouts.',
}

export default async function AddressesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account/addresses')
  }

  const { getUserProfile } = await import('@/lib/auth')
  const profile = await getUserProfile(user.id)
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ''

  let addresses: any[] = []
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerClient()
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
      addresses = data || []
    } catch {
      // ignore
    }
  } else {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const raw = cookieStore.get('bb_dev_addresses')?.value
      if (raw) {
        addresses = JSON.parse(raw)
      } else {
        addresses = [
          {
            id: 'addr-dev-1',
            full_name: displayName || 'Bubble Boom Member',
            phone: '9876543210',
            address_line1: 'Flat 402, Boom Street',
            address_line2: 'Sector 15',
            city: 'Mumbai',
            state: 'Maharashtra',
            pin_code: '400001',
            country: 'IN',
            is_default: true,
          },
        ]
      }
    } catch {}
  }

  const userSummary = {
    id: user.id,
    name: displayName,
    full_name: displayName,
    email: user.email,
    phone: profile?.phone || (user as any).phone || null,
  }

  return (
    <AccountShell user={userSummary}>
      <AddressManager initialAddresses={addresses || []} />
    </AccountShell>
  )
}
