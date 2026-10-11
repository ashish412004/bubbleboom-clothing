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
} from 'lucide-react'

interface ProfileFormProps {
  initialName: string
  initialEmail: string
  initialPhone?: string
  initialAvatar?: string
  isGoogleOnly?: boolean
}

export function ProfileForm({
  initialName,
  initialEmail,
  initialPhone = '',
  initialAvatar = '',
  isGoogleOnly = false,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
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

      // Also trigger Supabase client session update
      try {
        const supabase = createClient()
        await supabase.auth.updateUser({
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            avatar_url: avatarUrl.trim(),
          },
        })
      } catch {
        // Handled server-side
      }

      await refreshUser(true)
      setProfileMsg('Profile information updated successfully!')
      toast.success('Profile details saved')
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
          ? 'Password Added Successfully! You can now sign in using both Google and your email & password.'
          : 'Your password has been changed securely.'
      )
      setPasswordSetupDone(true)
      setIsGoogleAccount(false)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully')
    } catch (err: any) {
      setPasswordErr(err.message || 'Failed to update password')
    } finally {
      setLoadingPassword(false)
    }
  }

  const isSettingNewPassword = isGoogleAccount && !passwordSetupDone

  return (
    <div className="space-y-8">
      {/* Profile Details Form */}
      <div className="border border-black bg-white p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
          <div>
            <h2 className="text-base uppercase tracking-tight font-black">
              Personal Information
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Update your display name, contact phone, and avatar.
            </p>
          </div>
        </div>

        {profileMsg && (
          <div className="mb-4 p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full border border-black p-2.5 pl-10 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Email Address (Account Identifier)
            </label>
            <div className="relative">
              <input
                type="email"
                value={initialEmail}
                disabled
                className="w-full border border-neutral-300 bg-neutral-100 p-2.5 pl-10 text-xs text-neutral-500 cursor-not-allowed font-mono"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
              Email address cannot be changed directly for security reasons.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full border border-black p-2.5 pl-10 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loadingProfile}
              className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {loadingProfile ? 'Saving Details...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Security & Password Section */}
      <div className="border border-black bg-white p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base uppercase tracking-tight font-black">
                {isSettingNewPassword ? 'SET A PASSWORD' : 'CHANGE PASSWORD'}
              </h2>
              {isSettingNewPassword && (
                <span className="inline-flex items-center gap-1 bg-neutral-100 border border-neutral-300 text-black px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <Sparkles size={11} /> Optional
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              {isSettingNewPassword
                ? 'Add a password to also sign in using your email and password. Google sign-in remains active.'
                : 'Update your account password for email/password authentication.'}
            </p>
          </div>
          <KeyRound className="w-5 h-5 text-neutral-400 shrink-0 hidden sm:block" />
        </div>

        {passwordMsg && (
          <div className="mb-4 p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordMsg}</span>
          </div>
        )}

        {passwordErr && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{passwordErr}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              {isSettingNewPassword ? 'New Password' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                className="w-full border border-black p-2.5 pl-10 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-500 hover:text-black"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
              Must be at least 8 characters.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
                className="w-full border border-black p-2.5 pl-10 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loadingPassword || !newPassword || !confirmPassword}
              className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {loadingPassword
                ? 'Saving Password...'
                : isSettingNewPassword
                ? 'Set Password'
                : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

