import { getCurrentUser, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin Terminal | BUBBLE BOOM',
  robots: 'noindex, nofollow',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const allowedAdminEmail = (process.env.ADMIN_EMAIL || 'hhshukla241099@gmail.com').toLowerCase().trim()

  // Strictly enforce admin authentication
  if (!user) {
    redirect('/login?next=/admin')
  }

  // Strictly enforce that only the authorized email can access the admin portal
  const userEmail = (user.email || '').toLowerCase().trim()
  if (userEmail !== allowedAdminEmail) {
    redirect('/login?next=/admin&error=unauthorized')
  }

  // Verify admin authorization
  const userIsAdmin = await isAdmin(user.id)
  if (!userIsAdmin) {
    redirect('/login?next=/admin&error=unauthorized')
  }

  return (
    <AdminShell userEmail={user?.email || allowedAdminEmail}>
      {children}
    </AdminShell>
  )
}
