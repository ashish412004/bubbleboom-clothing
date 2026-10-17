'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'
import { getCustomerInitials } from '@/components/account/account-nav'
import { User, Mail, Phone, MapPin, Edit2, Lock, CheckCircle2, ArrowUpRight, Plus, Loader2 } from 'lucide-react'

interface DefaultAddressSummary {
  id?: string
  full_name?: string
  phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pin_code?: string
  postal_code?: string
  is_default?: boolean
}

interface ProfileDetailsFormProps {
  initialFullName: string
  initialEmail: string
  initialPhone?: string | null
  defaultAddress?: DefaultAddressSummary | null
}

export function ProfileDetailsForm({
  initialFullName,
  initialEmail,
  initialPhone,
  defaultAddress,
}: ProfileDetailsFormProps) {
  const router = useRouter()
  const refreshUser = useAuthStore((s) => s.refreshUser)

  // Split initial full name into first and last name
  const nameParts = initialFullName.trim().split(/\s+/)
  const initFirstName = nameParts[0] || ''
  const initLastName = nameParts.slice(1).join(' ') || ''

  const [firstName, setFirstName] = useState(initFirstName)
  const [lastName, setLastName] = useState(initLastName)
  const [saving, setSaving] = useState(false)

  // Derive location and pincode from default delivery address
  const addressCityState = defaultAddress?.city && defaultAddress?.state
    ? `${defaultAddress.city}, ${defaultAddress.state}`
    : defaultAddress?.city || defaultAddress?.state || 'Not set'
  const addressPincode = defaultAddress?.pin_code || defaultAddress?.postal_code || 'Not set'

  // Has editable data changed?
  const hasChanges =
    firstName.trim() !== initFirstName ||
    lastName.trim() !== initLastName

  const initials = getCustomerInitials(
    `${firstName} ${lastName}`.trim() || initialFullName,
    initialEmail
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChanges || saving) return

    const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!combinedName) {
      toast.error('First name cannot be empty')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-profile',
          name: combinedName,
          phone: initialPhone || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update profile')
      }

      await refreshUser()
      toast.success('Profile details updated successfully')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Top: Avatar & Profile Details Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-neutral-100">
        <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg tracking-widest shrink-0 shadow-sm">
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black uppercase tracking-tight text-black">
              Profile Details
            </h2>
            <span className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold">
              Personal Info
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your personal identity and default shipping location.
          </p>
        </div>
      </div>

      {/* Form: Responsive Two-Column Layout */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Row 1: First Name | Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center justify-between">
              <span>First Name</span>
              <Edit2 className="w-3 h-3 text-neutral-400" />
            </label>
            <div className="relative">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className="w-full h-12 px-4 rounded-xl bg-[#F9F9FB] border border-neutral-200/80 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center justify-between">
              <span>Last Name</span>
              <Edit2 className="w-3 h-3 text-neutral-400" />
            </label>
            <div className="relative">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className="w-full h-12 px-4 rounded-xl bg-[#F9F9FB] border border-neutral-200/80 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Phone Number | Email Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center justify-between">
              <span>Phone Number</span>
              <span className="text-[10px] text-neutral-400 font-mono">Verified Auth</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={initialPhone || 'Not connected'}
                readOnly
                disabled
                className="w-full h-12 px-4 pr-10 rounded-xl bg-[#F5F5F7] border border-neutral-200/60 text-sm text-neutral-600 font-mono cursor-not-allowed"
              />
              <Lock className="w-3.5 h-3.5 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Authentication phone is protected. Update delivery contact in Addresses.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center justify-between">
              <span>Email Address</span>
              <span className="text-[10px] text-neutral-400 font-mono">Primary Login</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={initialEmail}
                readOnly
                disabled
                className="w-full h-12 px-4 pr-10 rounded-xl bg-[#F5F5F7] border border-neutral-200/60 text-sm text-neutral-600 font-mono cursor-not-allowed"
              />
              <Lock className="w-3.5 h-3.5 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Your registered Bubble Boom sign-in email.
            </p>
          </div>
        </div>

        {/* Row 3: Location | Pincode (Derived from default address) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center justify-between">
              <span>Default Location</span>
              <span className="text-[10px] text-neutral-400">From Address</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressCityState}
                readOnly
                disabled
                className="w-full h-12 px-4 pr-10 rounded-xl bg-[#F5F5F7] border border-neutral-200/60 text-sm text-neutral-600 font-medium cursor-not-allowed"
              />
              <MapPin className="w-3.5 h-3.5 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center justify-between">
              <span>Delivery Pincode</span>
              <span className="text-[10px] text-neutral-400">Postal Code</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressPincode}
                readOnly
                disabled
                className="w-full h-12 px-4 rounded-xl bg-[#F5F5F7] border border-neutral-200/60 text-sm text-neutral-600 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Save Changes button: appears only when editable name changed */}
        {hasChanges && (
          <div className="pt-2 flex items-center justify-end animate-in fade-in duration-150">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Phase 5: DEFAULT ADDRESS Card */}
      <div className="pt-6 border-t border-neutral-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-black">
              Default Address
            </h3>
            <p className="text-xs text-neutral-500">
              Your primary destination for quick 1-click checkouts.
            </p>
          </div>
          <Link
            href="/account/addresses"
            className="text-xs uppercase tracking-wider font-bold text-neutral-800 hover:text-black transition-colors inline-flex items-center gap-1"
          >
            <span>Manage Addresses</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {defaultAddress ? (
          <div className="bg-[#F9F9FB] rounded-xl p-5 border border-neutral-200/80 relative hover:border-black/50 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-black">
                    {defaultAddress.full_name || `${firstName} ${lastName}`}
                  </span>
                  <span className="bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Default
                  </span>
                </div>

                <p className="text-xs text-neutral-700 leading-relaxed">
                  {defaultAddress.address_line1}
                  {defaultAddress.address_line2 ? `, ${defaultAddress.address_line2}` : ''}
                </p>

                <p className="text-xs text-neutral-700">
                  {defaultAddress.city}, {defaultAddress.state} – <span className="font-mono font-bold">{defaultAddress.pin_code || defaultAddress.postal_code}</span>
                </p>

                {defaultAddress.phone && (
                  <p className="text-xs font-mono text-neutral-600 flex items-center gap-1.5 pt-1">
                    <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span>{defaultAddress.phone}</span>
                  </p>
                )}
              </div>

              <Link
                href="/account/addresses"
                title="Edit address in My Addresses"
                className="p-2 text-neutral-500 hover:text-black hover:bg-white rounded-lg border border-transparent hover:border-neutral-200 transition-all shrink-0"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[11px]">Used for default delivery calculations</span>
              <Link
                href="/account/addresses"
                className="font-bold text-black uppercase tracking-wider text-[11px] hover:underline flex items-center gap-1"
              >
                <span>MANAGE ALL ADDRESSES</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[#F9F9FB] rounded-xl p-6 border border-dashed border-neutral-300 text-center space-y-3">
            <p className="text-xs text-neutral-600">
              You haven&apos;t designated a default delivery address yet.
            </p>
            <Link
              href="/account/addresses"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Delivery Address</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
