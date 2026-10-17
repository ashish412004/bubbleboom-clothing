'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'
import {
  User,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react'

interface ProfileFormProps {
  initialName: string
  initialEmail: string
  initialPhone?: string
  initialAvatar?: string
  initialMarketingConsent?: boolean
  isGoogleOnly?: boolean
}

export function ProfileForm({
  initialName,
  initialEmail,
  initialPhone = '',
  initialAvatar = '',
  initialMarketingConsent = false,
  isGoogleOnly = false,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [marketingConsent, setMarketingConsent] = useState(initialMarketingConsent)
  const [loadingConsent, setLoadingConsent] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)

  // Password state
  const [isGoogleAccount, setIsGoogleAccount] = useState(isGoogleOnly)
  const [passwordSetupDone, setPasswordSetupDone] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [passwordErr, setPasswordErr] = useState<string | null>(null)

  const refreshUser = useAuthStore((state) => state.refreshUser)

  // Check auth details on mount to accurately reflect if user is Google-only
  useEffect(() => {
    async function checkAuthMetadata() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            if (data.user.full_name || data.user.user_metadata?.full_name) {
              setFullName(data.user.full_name || data.user.user_metadata?.full_name)
            }
            if (data.user.phone) setPhone(data.user.phone)
            if (data.user.avatar_url) setAvatarUrl(data.user.avatar_url)
            if (typeof data.user.marketing_consent === 'boolean') {
              setMarketingConsent(data.user.marketing_consent)
            }
            if (typeof data.user.isGoogleOnly === 'boolean') {
              setIsGoogleAccount(data.user.isGoogleOnly)
            }
          }
        }
      } catch {
        // Non-blocking
      }
    }
    checkAuthMetadata()
  }, [])

  const handleSaveMarketingConsent = async (nextConsent: boolean) => {
    setLoadingConsent(true)
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-profile',
          marketing_consent: nextConsent,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update marketing preferences')
      }

      setMarketingConsent(nextConsent)
      await refreshUser()
      toast.success(
        nextConsent
          ? 'Subscribed to Bubble Boom launch announcements and drops!'
          : 'Unsubscribed from marketing emails.'
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to update preferences')
    } finally {
      setLoadingConsent(false)
    }
  }

  // 1. UPDATE PROFILE INFORMATION
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setLoadingProfile(true)

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-profile',
          name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update profile')
      }

      await refreshUser()
      setProfileMsg('Personal details saved successfully.')
      toast.success('Profile updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  // 2. SET OR CHANGE PASSWORD
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    setPasswordErr(null)

    if (newPassword.length < 8) {
      setPasswordErr('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordErr('Passwords do not match. Please re-enter matching passwords.')
      return
    }

    setLoadingPassword(true)

    try {
      const actionType = isGoogleAccount && !passwordSetupDone ? 'set-password' : 'set-password'
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          password: newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update password')
      }

      setPasswordMsg(
        isGoogleAccount && !passwordSetupDone
          ? 'Password added successfully! You can now sign in using both Google and email/password.'
          : 'Your account password has been updated securely.'
      )
      setPasswordSetupDone(true)
      setIsGoogleAccount(false)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password saved successfully')
    } catch (err: any) {
      setPasswordErr(err.message || 'Failed to update password')
    } finally {
      setLoadingPassword(false)
    }
  }

  const isSettingNewPassword = isGoogleAccount && !passwordSetupDone

  return (
    <div className="space-y-10">
      {/* Section Header */}
      <div className="pb-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-black">
            PROFILE &amp; SECURITY
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Account authentication credentials &amp; security preferences
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Protected Session</span>
        </div>
      </div>

      {/* Account Security & Password Section */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-black">
              {isSettingNewPassword ? 'SET AN ACCOUNT PASSWORD' : 'CHANGE PASSWORD'}
            </h3>
            {isSettingNewPassword && (
              <span className="inline-flex items-center gap-1 bg-neutral-100 border border-neutral-200 text-neutral-700 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md">
                <Sparkles size={11} /> Optional
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {isSettingNewPassword
              ? 'Add a password to enable email & password sign-in alongside your Google credentials.'
              : 'Update your account password for secure email & password login.'}
          </p>
        </div>

        {passwordMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordMsg}</span>
          </div>
        )}

        {passwordErr && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{passwordErr}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                required
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-[#F9F9FB] border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Minimum 8 characters with a mix of letters and numbers recommended.
            </span>
          </div>

          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                className="w-full h-11 px-3.5 rounded-xl bg-[#F9F9FB] border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loadingPassword || !newPassword || !confirmPassword}
              className="px-6 py-2.5 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              {loadingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Password...</span>
                </>
              ) : (
                <span>{isSettingNewPassword ? 'Set Password' : 'Change Password'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Identity & Connected Logins */}
      <div className="pt-6 border-t border-neutral-100 space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-black">
            Connected Credentials
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Your verified authentication identities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#F9F9FB] rounded-xl p-4 border border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                <Mail className="w-4 h-4 text-black" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">Primary Email</span>
                <span className="text-xs font-mono font-bold text-black">{initialEmail}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Verified
            </span>
          </div>

          <div className="bg-[#F9F9FB] rounded-xl p-4 border border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                <Phone className="w-4 h-4 text-black" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">Mobile Login</span>
                <span className="text-xs font-mono font-bold text-black">{initialPhone || 'Not Connected'}</span>
              </div>
            </div>
            {initialPhone ? (
              <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Verified
              </span>
            ) : (
              <span className="text-[10px] font-bold font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                Optional
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Marketing Communication Preferences */}
      <div className="space-y-4 pt-6 border-t border-neutral-100">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-black">
            EMAIL &amp; MARKETING PREFERENCES
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your subscription to Bubble Boom launch announcements and drops.
          </p>
        </div>

        <div className="bg-[#F9F9FB] rounded-xl p-5 border border-neutral-200/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="profileMarketingConsent"
                checked={marketingConsent}
                onChange={(e) => handleSaveMarketingConsent(e.target.checked)}
                disabled={loadingConsent}
                className="mt-1 h-4 w-4 border-black rounded-none text-black focus:ring-black cursor-pointer"
              />
              <label htmlFor="profileMarketingConsent" className="text-xs text-neutral-700 font-medium leading-relaxed cursor-pointer select-none">
                I'd like to receive Bubble Boom launch announcements, new drops and exclusive offers by email.
              </label>
            </div>
            <span
              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                marketingConsent
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              {loadingConsent ? 'Saving...' : marketingConsent ? 'Opted In' : 'Not Subscribed'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-3 pt-3 border-t border-neutral-200/60 leading-normal">
            Transactional messages such as order receipts, shipping updates, and password resets will continue to be delivered regardless of this preference.
          </p>
        </div>
      </div>
    </div>
  )
}
