import { getCurrentUser } from '@/lib/auth'
import { getOrdersByUserId } from '@/lib/orders'
import { redirect } from 'next/navigation'
import { AccountShell } from '@/components/account/account-shell'
import { OrdersViewWithDrawer } from '@/components/account/orders-view-with-drawer'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Orders | BUBBLE BOOM',
  description: 'View and track all your past and present Bubble Boom clothing orders.',
}

export default async function OrdersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account/orders')
  }

  const { getUserProfile } = await import('@/lib/auth')
  const profile = await getUserProfile(user.id)
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ''

  const orders = await getOrdersByUserId(user.id)

  const userSummary = {
    id: user.id,
    name: displayName,
    full_name: displayName,
    email: user.email,
    phone: profile?.phone || (user as any).phone || null,
  }

  return (
    <AccountShell user={userSummary}>
      <OrdersViewWithDrawer orders={(orders as any) || []} />
    </AccountShell>
  )
}
