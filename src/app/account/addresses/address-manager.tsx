'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, MapPin, Check, AlertCircle } from 'lucide-react'

interface Address {
  id: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pin_code: string
  country: string
  is_default: boolean
}

export function AddressManager({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
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

  const handlePinChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    setPinCode(clean)
    setPinSuccessMsg('')

    if (clean.length === 6) {
      setPinLoading(true)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`)
        const data = await res.json()
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0]
          const detectedCity = po.District || po.Block || po.Name
          const detectedState = po.State
          if (detectedCity) setCity(detectedCity)
          if (detectedState) setState(detectedState)
          setPinSuccessMsg(`✓ ${detectedCity}, ${detectedState}`)
        }
      } catch {
        // silent
      } finally {
        setPinLoading(false)
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
      // Reset form
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

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return

    try {
      const res = await fetch(`/api/addresses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete address')

      setAddresses((prev) => prev.filter((a) => a.id !== id))
      toast.success('Address removed')
      router.refresh()
    } catch {
      toast.error('Could not delete address')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
        <h2 className="text-base uppercase tracking-tight font-black">Saved Delivery Addresses</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Close Form' : 'Add New Address'}</span>
        </button>
      </div>

      {/* Add Address Form Modal / Box */}
      {showAddForm && (
        <div className="border-2 border-black p-6 bg-[#F8F8F6] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
          <h3 className="text-sm font-black uppercase tracking-tight mb-4">Add Shipping Destination</h3>

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
                  onChange={(e) => handlePinChange(e.target.value)}
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
                className="border border-neutral-300 px-5 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:bg-neutral-400"
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

            <div className="pt-4 mt-4 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => handleDeleteAddress(addr.id)}
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-500 hover:text-black font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
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
              className="mt-4 inline-block bg-black text-white px-5 py-2 text-xs uppercase tracking-wider font-bold"
            >
              Add Your First Address
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
