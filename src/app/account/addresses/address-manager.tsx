'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, MapPin, Check, AlertCircle, Navigation, Edit2, X, Phone, Home, Briefcase, Tag, Loader2 } from 'lucide-react'

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

export interface Address {
  id: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pin_code: string
  country?: string
  is_default: boolean
  type?: 'home' | 'work' | 'other' | string
}

export function AddressManager({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [loading, setLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  // Add Form State
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [addressType, setAddressType] = useState<'home' | 'work' | 'other'>('home')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinSuccessMsg, setPinSuccessMsg] = useState('')
  const [isDefault, setIsDefault] = useState(initialAddresses.length === 0)
  const [locating, setLocating] = useState(false)

  // Edit Form State
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLine1, setEditLine1] = useState('')
  const [editLine2, setEditLine2] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editPinCode, setEditPinCode] = useState('')
  const [editAddressType, setEditAddressType] = useState<'home' | 'work' | 'other'>('home')
  const [editIsDefault, setEditIsDefault] = useState(false)
  const [editPinLoading, setEditPinLoading] = useState(false)
  const [editPinSuccessMsg, setEditPinSuccessMsg] = useState('')

  const handleDetectLocation = (isEdit = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`)
          const data = await res.json()
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to resolve location address.')
          }

          const addr = data.address
          const matchedState = indianStates.find(
            (s) =>
              s.toLowerCase() === addr.state?.toLowerCase() ||
              s.toLowerCase().includes(addr.state?.toLowerCase()) ||
              addr.state?.toLowerCase().includes(s.toLowerCase())
          ) || addr.state || ''

          if (isEdit) {
            if (addr.address_line1) setEditLine1(addr.address_line1)
            if (addr.city) setEditCity(addr.city)
            if (matchedState) setEditState(matchedState)
            if (addr.pin_code && addr.pin_code.length === 6) {
              setEditPinCode(addr.pin_code)
              setEditPinSuccessMsg(`✓ ${addr.city || ''}, ${matchedState}`)
            }
          } else {
            if (addr.address_line1) setLine1(addr.address_line1)
            if (addr.city) setCity(addr.city)
            if (matchedState) setState(matchedState)
            if (addr.pin_code && addr.pin_code.length === 6) {
              setPinCode(addr.pin_code)
              setPinSuccessMsg(`✓ ${addr.city || ''}, ${matchedState}`)
            }
          }
          toast.success('Location detected successfully!')
        } catch (err: any) {
          toast.error(err.message || 'Could not auto-detect location.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        toast.error('Location permission was denied or timed out.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  const handlePinChange = async (val: string, isEdit = false) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6)
    if (isEdit) {
      setEditPinCode(cleaned)
      setEditPinSuccessMsg('')
    } else {
      setPinCode(cleaned)
      setPinSuccessMsg('')
    }

    if (cleaned.length === 6) {
      if (isEdit) setEditPinLoading(true)
      else setPinLoading(true)

      try {
        const res = await fetch(`/api/delivery/check?pincode=${cleaned}`)
        const data = await res.json()
        if (data.serviceable && data.city && data.state) {
          const matchedState = indianStates.find(
            (s) => s.toLowerCase() === data.state.toLowerCase()
          ) || data.state

          if (isEdit) {
            setEditCity(data.city)
            setEditState(matchedState)
            setEditPinSuccessMsg(`✓ ${data.city}, ${matchedState}`)
          } else {
            setCity(data.city)
            setState(matchedState)
            setPinSuccessMsg(`✓ ${data.city}, ${matchedState}`)
          }
        }
      } catch {
        // silent fail
      } finally {
        if (isEdit) setEditPinLoading(false)
        else setPinLoading(false)
      }
    }
  }

  const handleStartEdit = (addr: Address) => {
    setEditingAddress(addr)
    setEditFullName(addr.full_name)
    setEditPhone(addr.phone)
    setEditLine1(addr.address_line1)
    setEditLine2(addr.address_line2 || '')
    setEditCity(addr.city)
    setEditState(addr.state)
    setEditPinCode(addr.pin_code)
    setEditAddressType((addr.type as any) || 'home')
    setEditIsDefault(addr.is_default)
    setEditError(null)
    setEditPinSuccessMsg('')
    setShowAddForm(false)
  }

  const handleCancelEdit = () => {
    setEditingAddress(null)
    setEditError(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAddress) return
    setEditError(null)

    const phoneRegex = /^[6-9]\d{9}$/
    if (!phoneRegex.test(editPhone)) {
      setEditError('Please enter a valid 10-digit Indian mobile number.')
      return
    }

    if (!/^\d{6}$/.test(editPinCode)) {
      setEditError('Please enter a valid 6-digit Indian PIN code.')
      return
    }

    setEditLoading(true)
    try {
      const res = await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAddress.id,
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          address_line1: editLine1.trim(),
          address_line2: editLine2.trim() || null,
          city: editCity.trim(),
          state: editState.trim(),
          pin_code: editPinCode.trim(),
          is_default: editIsDefault,
          type: editAddressType,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update address')

      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === editingAddress.id) {
            return {
              ...a,
              full_name: editFullName.trim(),
              phone: editPhone.trim(),
              address_line1: editLine1.trim(),
              address_line2: editLine2.trim() || null,
              city: editCity.trim(),
              state: editState.trim(),
              pin_code: editPinCode.trim(),
              is_default: editIsDefault,
              type: editAddressType,
            }
          }
          if (editIsDefault) {
            return { ...a, is_default: false }
          }
          return a
        })
      )

      toast.success('Address updated successfully!')
      setEditingAddress(null)
      router.refresh()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update address.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const phoneRegex = /^[6-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number.')
      return
    }

    if (!/^\d{6}$/.test(pinCode)) {
      setError('Please enter a valid 6-digit Indian PIN code.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          address_line1: line1.trim(),
          address_line2: line2.trim() || null,
          city: city.trim(),
          state: state.trim(),
          pin_code: pinCode.trim(),
          is_default: isDefault,
          type: addressType,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create address')

      if (isDefault) {
        setAddresses((prev) => [
          data.address,
          ...prev.map((a) => ({ ...a, is_default: false })),
        ])
      } else {
        setAddresses((prev) => [data.address, ...prev])
      }

      toast.success('Address added successfully!')
      setShowAddForm(false)
      // Reset form
      setFullName('')
      setPhone('')
      setLine1('')
      setLine2('')
      setCity('')
      setState('')
      setPinCode('')
      setIsDefault(false)
      setPinSuccessMsg('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to add address.')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      setSettingDefaultId(id)
      const res = await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          set_default_only: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set default address')

      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === id,
        }))
      )
      toast.success('Default delivery address updated!')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Could not update default address')
    } finally {
      setSettingDefaultId(null)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return

    try {
      const res = await fetch(`/api/addresses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete address')

      setAddresses((prev) => {
        const target = prev.find((a) => a.id === id)
        const filtered = prev.filter((a) => a.id !== id)
        if (target?.is_default && filtered.length > 0) {
          filtered[0].is_default = true
        }
        return filtered
      })

      toast.success('Address removed successfully')
      router.refresh()
    } catch {
      toast.error('Could not delete address')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-black">
            MY ADDRESSES
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your delivery locations
          </p>
        </div>
        <span className="text-[11px] font-mono font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full self-start sm:self-auto">
          {addresses.length} {addresses.length === 1 ? 'Location' : 'Locations'}
        </span>
      </div>

      {/* Subheading */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-neutral-500">
          SAVED ADDRESSES
        </h3>
      </div>

      {/* Responsive Grid of Address Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: ADD NEW ADDRESS Large Dashed Button */}
        {!showAddForm && !editingAddress && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="border-2 border-dashed border-neutral-300 hover:border-black rounded-2xl p-6 min-h-[200px] flex flex-col items-center justify-center cursor-pointer transition-all bg-neutral-50/40 hover:bg-neutral-50 group text-center"
          >
            <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 group-hover:border-black flex items-center justify-center shadow-2xs group-hover:scale-110 transition-all mb-3">
              <Plus className="w-5 h-5 text-neutral-600 group-hover:text-black" />
            </div>
            <span className="font-black text-xs uppercase tracking-wider text-black block">
              ADD NEW ADDRESS
            </span>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Add a new shipping destination
            </span>
          </button>
        )}

        {/* Existing Saved Address Cards */}
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`border rounded-2xl p-5 sm:p-6 bg-white transition-all flex flex-col justify-between relative shadow-2xs ${
              addr.is_default
                ? 'border-black ring-1 ring-black/5'
                : 'border-neutral-200/80 hover:border-neutral-400'
            }`}
          >
            <div className="space-y-3">
              {/* Card Top: Badges & Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                    {addr.type === 'work' ? (
                      <Briefcase className="w-2.5 h-2.5" />
                    ) : (
                      <Home className="w-2.5 h-2.5" />
                    )}
                    <span>{addr.type || 'Home'}</span>
                  </span>

                  {addr.is_default && (
                    <span className="bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>

                {/* Edit & Delete Top-Right Icons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(addr)}
                    title="Edit address"
                    className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="sr-only">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    title="Delete address"
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="sr-only">Delete</span>
                  </button>
                </div>
              </div>

              {/* Recipient Name & Details */}
              <div>
                <h4 className="font-bold text-sm text-black mb-1">
                  {addr.full_name}
                </h4>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  {addr.address_line1}
                  {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                </p>
                <p className="text-xs text-neutral-700 mt-0.5">
                  {addr.city}, {addr.state} – <span className="font-mono font-bold">{addr.pin_code}</span>
                </p>
                <p className="text-xs font-mono text-neutral-600 flex items-center gap-1.5 pt-2">
                  <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span>{addr.phone}</span>
                </p>
              </div>
            </div>

            {/* Card Footer: Set As Default Action */}
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
              {addr.is_default ? (
                <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1">
                  <Check className="w-3 h-3 text-black" />
                  <span>Primary Address</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={settingDefaultId === addr.id}
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {settingDefaultId === addr.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Set as Default</span>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Address Dialog / Form Modal */}
      {showAddForm && (
        <div className="bg-[#F9F9FB] rounded-2xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">New Delivery Location</span>
              <h3 className="text-base font-black uppercase tracking-tight text-black mt-0.5">Add New Address</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDetectLocation(false)}
                disabled={locating}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-bold bg-white hover:bg-black hover:text-white text-black border border-neutral-300 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Detecting...' : 'Autofill Location'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1.5 text-neutral-500 hover:text-black rounded-lg hover:bg-neutral-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAddAddress} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aryan Sharma"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                House / Flat / Building / Street Address *
              </label>
              <input
                type="text"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="e.g. Flat 402, Skyline Residency, Linking Road"
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                Landmark / Area (Optional)
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="e.g. Near Bandra Post Office"
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] uppercase font-bold tracking-wider text-neutral-600">
                    PIN Code (6 Digits) *
                  </label>
                  {pinLoading && (
                    <span className="text-[10px] text-neutral-500 font-mono animate-pulse">
                      Detecting...
                    </span>
                  )}
                  {pinSuccessMsg && !pinLoading && (
                    <span className="text-[10px] font-mono font-bold text-green-700">
                      {pinSuccessMsg}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => handlePinChange(e.target.value, false)}
                  placeholder="e.g. 400050"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  State *
                </label>
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
                >
                  <option value="">Select State</option>
                  {indianStates.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address Type & Default */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-500 mr-1">Type:</span>
                {(['home', 'work', 'other'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAddressType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      addressType === t
                        ? 'bg-black text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:border-black'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-neutral-300 text-black accent-black focus:ring-black"
                />
                <span className="text-xs font-bold text-neutral-800">Set as default address</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-neutral-200/60 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 rounded-xl border border-neutral-200 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {loading ? 'Saving Address...' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Address Modal / Form */}
      {editingAddress && (
        <div className="bg-[#F9F9FB] rounded-2xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">Edit Mode</span>
              <h3 className="text-base font-black uppercase tracking-tight text-black mt-0.5">Edit Saved Address</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDetectLocation(true)}
                disabled={locating}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-bold bg-white hover:bg-black hover:text-white text-black border border-neutral-300 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Detecting...' : 'Autofill Location'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1.5 text-neutral-500 hover:text-black rounded-lg hover:bg-neutral-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {editError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                House / Flat / Building / Street Address *
              </label>
              <input
                type="text"
                required
                value={editLine1}
                onChange={(e) => setEditLine1(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                Landmark / Area (Optional)
              </label>
              <input
                type="text"
                value={editLine2}
                onChange={(e) => setEditLine2(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] uppercase font-bold tracking-wider text-neutral-600">
                    PIN Code (6 Digits) *
                  </label>
                  {editPinLoading && (
                    <span className="text-[10px] text-neutral-500 font-mono animate-pulse">
                      Detecting...
                    </span>
                  )}
                  {editPinSuccessMsg && !editPinLoading && (
                    <span className="text-[10px] font-mono font-bold text-green-700">
                      {editPinSuccessMsg}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={editPinCode}
                  onChange={(e) => handlePinChange(e.target.value, true)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  State *
                </label>
                <select
                  required
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-neutral-200/80 text-xs text-black focus:outline-none focus:border-black font-medium"
                >
                  <option value="">Select State</option>
                  {indianStates.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-500 mr-1">Type:</span>
                {(['home', 'work', 'other'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditAddressType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      editAddressType === t
                        ? 'bg-black text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:border-black'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsDefault}
                  onChange={(e) => setEditIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-neutral-300 text-black accent-black focus:ring-black"
                />
                <span className="text-xs font-bold text-neutral-800">Set as default address</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-neutral-200/60 justify-end">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-5 py-2.5 rounded-xl border border-neutral-200 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-6 py-2.5 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {editLoading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
