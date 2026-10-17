import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AccountShell } from '@/components/account/account-shell'
import { AccountNav } from '@/components/account/account-nav'
import { getWishlist } from '@/lib/wishlist'
import { SavedDropsView } from './saved-drops-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Saved Drops | BUBBLE BOOM',
  description: 'Manage your saved wishlist pieces and limited edition streetwear drops.',
}

export default async function SavedDropsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account/saved-drops')
  }

  const { getUserProfile } = await import('@/lib/auth')
  const profile = await getUserProfile(user.id)
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ''

  const cookieStore = await cookies()
  const sessionId =
    cookieStore.get('bb_session_id')?.value ||
    cookieStore.get('bubbleboom_guest_session')?.value

  const items = await getWishlist(user.id, sessionId)

  const userSummary = {
    id: user.id,
    name: displayName,
    full_name: displayName,
    email: user.email,
    phone: profile?.phone || (user as any).phone || null,
  }

  return (
    <AccountShell user={userSummary}>
      {/* AccountNav integration is preserved inside AccountShell */}
      <SavedDropsView initialItems={items} />
      <div className="sr-only">
        <AccountNav />
      </div>
    </AccountShell>
  )
}
