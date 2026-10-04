import { getCurrentUser, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

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

  // In production, strictly enforce admin authentication
  if (!user && process.env.NODE_ENV === 'production') {
    redirect('/login?next=/admin')
  }

  // If user is authenticated, check admin permission
  if (user) {
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin && process.env.NODE_ENV === 'production') {
      redirect('/')
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F8F8F6] text-black">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-black px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-widest text-neutral-500 font-bold">
              Bubble Boom Ops System
            </span>
            <span className="text-xs font-mono bg-black text-white px-2 py-0.5 font-bold">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Admin: <strong>{user?.email || 'System Admin (Dev Mode)'}</strong></span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
