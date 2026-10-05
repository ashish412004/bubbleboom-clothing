import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AccountNav } from '@/components/account/account-nav'
import { ProfileForm } from './profile-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Profile & Security | BUBBLE BOOM',
  description: 'Update your name, contact phone, and security credentials.',
}

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account/profile')
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="border-b border-black py-10 md:py-14 bg-[#F8F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs uppercase tracking-widest font-mono text-neutral-500">Security Credentials</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mt-1">
              Profile &amp; Security
            </h1>
            <p className="mt-2 text-xs md:text-sm text-neutral-600">
              Manage personal details and configure your account authentication password.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <AccountNav />
            </aside>

            <div className="lg:col-span-3">
              <ProfileForm
                initialName={user.user_metadata?.full_name || ''}
                initialEmail={user.email || ''}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
