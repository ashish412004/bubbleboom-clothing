'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Lock, Mail, Phone, CheckCircle2, AlertCircle } from 'lucide-react'

interface ProfileFormProps {
  initialName: string
  initialEmail: string
  initialPhone: string
}

export function ProfileForm({ initialName, initialEmail, initialPhone }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [passwordErr, setPasswordErr] = useState<string | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setLoadingProfile(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone,
        },
      })

      if (error) throw error

      setProfileMsg('Profile information updated successfully!')
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    setPasswordErr(null)

    if (newPassword.length < 8) {
      setPasswordErr('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordErr('Passwords do not match')
      return
    }

    setLoadingPassword(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPasswordMsg('Your password has been changed.')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated')
    } catch (err: any) {
      setPasswordErr(err.message || 'Failed to change password')
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Details Form */}
      <div className="border border-black bg-white p-6">
        <h2 className="text-base uppercase tracking-tight font-black pb-4 mb-4 border-b border-neutral-200">
          Personal Information
        </h2>

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
                placeholder="Your Name"
                className="w-full border border-black p-2.5 pl-10 text-xs focus:outline-none"
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
                className="w-full border border-neutral-300 bg-neutral-100 p-2.5 pl-10 text-xs text-neutral-500 cursor-not-allowed"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
              Email address cannot be changed directly for security reasons.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Contact Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full border border-black p-2.5 pl-10 text-xs focus:outline-none"
              />
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loadingProfile}
              className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
            >
              {loadingProfile ? 'Saving...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>

      {/* Security / Password Form */}
      <div className="border border-black bg-white p-6">
        <h2 className="text-base uppercase tracking-tight font-black pb-4 mb-4 border-b border-neutral-200">
          Security &amp; Password
        </h2>

        {passwordMsg && (
          <div className="mb-4 p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordMsg}</span>
          </div>
        )}

        {passwordErr && (
          <div className="mb-4 p-3 bg-neutral-100 border-l-4 border-black text-xs text-black flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordErr}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                New Password (Min 8 Chars)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-black p-2.5 pl-10 text-xs focus:outline-none"
                />
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-black p-2.5 pl-10 text-xs focus:outline-none"
                />
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loadingPassword || !newPassword}
              className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              {loadingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
