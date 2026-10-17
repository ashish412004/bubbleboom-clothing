import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AccountShell } from '@/components/account/account-shell'
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

  const { getUserProfile } = await import('@/lib/auth')
  const profile = await getUserProfile(user.id)

  const effectiveName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    ''

  const identities = user.identities || []
  const hasEmailIdentity = identities.some((i: any) => i.provider === 'email')
  const hasGoogleIdentity = identities.some((i: any) => i.provider === 'google')
  const isGoogleOnly = hasGoogleIdentity && !hasEmailIdentity

  const userSummary = {
    id: user.id,
    name: effectiveName,
    full_name: effectiveName,
    email: user.email,
    phone: profile?.phone || (user as any).phone || null,
  }

  return (
    <AccountShell user={userSummary}>
      <ProfileForm
        initialName={effectiveName}
        initialEmail={user.email || ''}
        initialPhone={profile?.phone || ''}
        initialAvatar={profile?.avatar_url || ''}
        initialMarketingConsent={Boolean(profile?.marketing_consent)}
        isGoogleOnly={isGoogleOnly}
      />
      <div className="sr-only">
        <AccountNav />
      </div>
    </AccountShell>
  )
}
