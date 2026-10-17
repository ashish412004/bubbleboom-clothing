'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, MapPin, Check, AlertCircle, Navigation, Edit2, X } from 'lucide-react'

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
          toast.success(`📍 Location detected: ${addr.city || matchedState || 'Address filled'}`)
        } catch (err: any) {
          toast.error(err.message || 'Could not fetch address for this location.')
        } finally {
          setLocating(false)
        }
      },
      (geoErr) => {
        setLocating(false)
        let msg = 'Could not access location.'
        if (geoErr.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser settings.'
        } else if (geoErr.code === 2) {
          msg = 'Location position unavailable.'
        } else if (geoErr.code === 3) {
          msg = 'Location request timed out.'
        }
        toast.error(msg)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  const handlePinChange = async (val: string, isEdit = false) => {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    if (isEdit) {
      setEditPinCode(clean)
      setEditPinSuccessMsg('')
    } else {
      setPinCode(clean)
      setPinSuccessMsg('')
    }

    if (clean.length === 6) {
      if (isEdit) setEditPinLoading(true)
      else setPinLoading(true)

      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`)
        const data = await res.json()
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0]
          const detectedCity = po.District || po.Block || po.Name
          const detectedState = po.State
          if (isEdit) {
            if (detectedCity) setEditCity(detectedCity)
            if (detectedState) setEditState(detectedState)
            setEditPinSuccessMsg(`✓ ${detectedCity}, ${detectedState}`)
          } else {
            if (detectedCity) setCity(detectedCity)
            if (detectedState) setState(detectedState)
            setPinSuccessMsg(`✓ ${detectedCity}, ${detectedState}`)
          }
        }
      } catch {
        // silent
      } finally {
        if (isEdit) setEditPinLoading(false)
        else setPinLoading(false)
      }
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          address_line1: line1,
          address_line2: line2,
          city,
          state,
          pin_code: pinCode,
          is_default: isDefault,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save address')

      toast.success('Address saved successfully!')
      if (isDefault) {
        setAddresses((prev) => [
          data.address,
          ...prev.map((a) => ({ ...a, is_default: false })),
        ])
      } else {
        setAddresses((prev) => [data.address, ...prev])
      }

      setShowAddForm(false)
      setFullName('')
      setPhone('')
      setLine1('')
      setLine2('')
      setCity('')
      setState('')
      setPinCode('')
      setIsDefault(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error saving address')
    } finally {
      setLoading(false)
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
    setEditIsDefault(addr.is_default)
    setEditError(null)
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
    setEditLoading(true)

    try {
      const res = await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAddress.id,
          full_name: editFullName,
          phone: editPhone,
          address_line1: editLine1,
          address_line2: editLine2,
          city: editCity,
          state: editState,
          pin_code: editPinCode,
          is_default: editIsDefault,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update address')

      toast.success('Address updated successfully!')
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === editingAddress.id) {
            return data.address
          }
          if (editIsDefault) {
            return { ...a, is_default: false }
          }
          return a
        })
      )

      setEditingAddress(null)
      router.refresh()
    } catch (err: any) {
      setEditError(err.message || 'Error updating address')
    } finally {
      setEditLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      setSettingDefaultId(id)
      const res = await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, set_default_only: true, is_default: true }),
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
        // If deleted address was default, promote first remaining address to default
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
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-base uppercase tracking-tight font-black">Saved Delivery Addresses</h2>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            {addresses.length} {addresses.length === 1 ? 'address saved' : 'addresses saved'}
          </p>
        </div>
        {!editingAddress && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Close Form' : 'Add New Address'}</span>
          </button>
        )}
      </div>

      {/* Edit Address Modal / Inline Form */}
      {editingAddress && (
        <div className="border-2 border-black p-6 bg-[#F8F8F6] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-black/10 gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Edit Mode</span>
              <h3 className="text-sm font-black uppercase tracking-tight">Edit Saved Address</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDetectLocation(true)}
                disabled={locating}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold bg-white hover:bg-black hover:text-white text-black border border-black px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
              >
                <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Detecting...' : 'Autofill Location'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1.5 text-neutral-600 hover:text-black border border-neutral-300 bg-white"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {editError && (
            <div className="mb-4 p-3 bg-white border-l-4 border-black text-xs text-black flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Aryan Sharma"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                House / Flat / Building / Street Address *
              </label>
              <input
                type="text"
                required
                value={editLine1}
                onChange={(e) => setEditLine1(e.target.value)}
                placeholder="Flat 402, Skyline Residency, Linking Road"
                className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Landmark / Area (Optional)
              </label>
              <input
                type="text"
                value={editLine2}
                onChange={(e) => setEditLine2(e.target.value)}
                placeholder="Near Bandra Post Office"
                className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="Mumbai"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-mono tracking-wider font-bold">
                    6-Digit PIN Code *
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
                  placeholder="400050"
                  className="w-full border border-black p-2.5 text-xs bg-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsDefault}
                  onChange={(e) => setEditIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded-none border border-black accent-black focus:ring-0"
                />
                <span className="text-xs font-bold text-neutral-800">Set as default shipping address</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="border border-neutral-300 px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 cursor-pointer"
              >
                {editLoading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Address Form Modal / Box */}
      {showAddForm && !editingAddress && (
        <div className="border-2 border-black p-6 bg-[#F8F8F6] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-black/10 gap-2">
            <h3 className="text-sm font-black uppercase tracking-tight">Add Shipping Destination</h3>
            <button
              type="button"
              onClick={() => handleDetectLocation(false)}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold bg-white hover:bg-black hover:text-white text-black border border-black px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Detecting Location...' : 'Use Current Location'}</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-white border-l-4 border-black text-xs text-black flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAddAddress} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aryan Sharma"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                House / Flat / Building / Street Address *
              </label>
              <input
                type="text"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Flat 402, Skyline Residency, Linking Road"
                className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Landmark / Area (Optional)
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Near Bandra Post Office"
                className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Mumbai"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full border border-black p-2.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-mono tracking-wider font-bold">
                    6-Digit PIN Code *
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
                  placeholder="400050"
                  className="w-full border border-black p-2.5 text-xs bg-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded-none border border-black accent-black focus:ring-0"
                />
                <span className="text-xs font-bold text-neutral-800">Set as default shipping address</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border border-neutral-300 px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400 cursor-pointer"
              >
                {loading ? 'Saving Address...' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`border p-5 bg-white relative flex flex-col justify-between ${
              addr.is_default ? 'border-2 border-black' : 'border-neutral-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm uppercase">{addr.full_name}</span>
                {addr.is_default && (
                  <span className="bg-black text-white text-[10px] font-mono uppercase px-2 py-0.5 font-bold">
                    Default
                  </span>
                )}
              </div>

              <div className="text-xs text-neutral-700 space-y-1">
                <p>{addr.address_line1}</p>
                {addr.address_line2 && <p>{addr.address_line2}</p>}
                <p>
                  {addr.city}, {addr.state} — <span className="font-mono font-bold">{addr.pin_code}</span>
                </p>
                <p className="font-mono text-neutral-500 pt-1">Phone: {addr.phone}</p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-neutral-200 flex items-center justify-between gap-3">
              {/* Default status or action */}
              <div>
                {!addr.is_default ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={settingDefaultId === addr.id}
                    className="text-xs uppercase tracking-wider font-bold underline hover:text-neutral-600 disabled:opacity-50 cursor-pointer"
                  >
                    {settingDefaultId === addr.id ? 'Setting...' : 'Set as Default'}
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-neutral-500 uppercase font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-black" />
                    <span>Primary</span>
                  </span>
                )}
              </div>

              {/* Actions: Edit & Remove */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(addr)}
                  className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-bold border border-black px-2.5 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-neutral-500 hover:text-black font-bold px-2 py-1 cursor-pointer"
                  title="Remove Address"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {addresses.length === 0 && !showAddForm && (
          <div className="col-span-full py-12 text-center border border-dashed border-neutral-300 p-6">
            <MapPin className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
            <p className="text-xs uppercase font-mono tracking-widest text-neutral-500">
              No saved addresses found.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-block bg-black text-white px-5 py-2 text-xs uppercase tracking-wider font-bold cursor-pointer"
            >
              Add Your First Address
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
