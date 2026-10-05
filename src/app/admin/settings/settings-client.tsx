'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Save, CheckCircle2 } from 'lucide-react'

interface SettingsClientProps {
  initialShipping: any
  initialOrders: any
  initialGeneral: any
}

export function SettingsClient({ initialShipping, initialOrders, initialGeneral }: SettingsClientProps) {
  const [loading, setLoading] = useState(false)

  // Shipping
  const [freeThreshold, setFreeThreshold] = useState(
    Math.round((initialShipping?.free_shipping_threshold_paise || 149900) / 100)
  )
  const [standardShipping, setStandardShipping] = useState(
    Math.round((initialShipping?.standard_shipping_paise || 9900) / 100)
  )
  const [codEnabled, setCodEnabled] = useState(initialShipping?.cod_enabled ?? true)
  const [codFee, setCodFee] = useState(
    Math.round((initialShipping?.cod_fee_paise || 5000) / 100)
  )
  const [maxCodAmount, setMaxCodAmount] = useState(
    Math.round((initialShipping?.max_cod_amount_paise || 500000) / 100)
  )

  // Orders
  const [returnDays, setReturnDays] = useState(initialOrders?.return_window_days || 7)

  // General
  const [supportEmail, setSupportEmail] = useState(initialGeneral?.support_email || 'bubbleboomstore2026@gmail.com')
  const [storeName, setStoreName] = useState(initialGeneral?.store_name || 'BUBBLE BOOM')

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Save shipping settings
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'shipping',
          value: {
            free_shipping_threshold_paise: Number(freeThreshold) * 100,
            standard_shipping_paise: Number(standardShipping) * 100,
            cod_enabled: Boolean(codEnabled),
            cod_fee_paise: Number(codFee) * 100,
            max_cod_amount_paise: Number(maxCodAmount) * 100,
          },
        }),
      })

      // 2. Save order settings
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'orders',
          value: {
            return_window_days: Number(returnDays),
            auto_cancel_unpaid_hours: 24,
          },
        }),
      })

      // 3. Save general settings
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'general',
          value: {
            store_name: storeName,
            support_email: supportEmail,
            currency: 'INR',
          },
        }),
      })

      toast.success('Central store settings committed successfully!')
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
      {/* Shipping & Delivery Rules */}
      <div className="border border-black bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-tight pb-2 border-b border-neutral-200">
          Shipping &amp; Logistics Financial Rules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Free Delivery Subtotal Threshold (₹) *
            </label>
            <input
              type="number"
              required
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(Number(e.target.value))}
              className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
            />
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
              Cart subtotal required to qualify for zero shipping (Internal: ₹{freeThreshold} = {freeThreshold * 100} paise)
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Standard Shipping Fee (₹) *
            </label>
            <input
              type="number"
              required
              value={standardShipping}
              onChange={(e) => setStandardShipping(Number(e.target.value))}
              className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
            />
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
              Charged when subtotal is below free shipping threshold
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-200">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={codEnabled}
              onChange={(e) => setCodEnabled(e.target.checked)}
              className="h-4 w-4 rounded-none border border-black accent-black"
            />
            <span className="text-xs font-bold text-black uppercase font-mono">
              Enable Cash on Delivery (COD)
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                COD Handling Convenience Fee (₹)
              </label>
              <input
                type="number"
                value={codFee}
                onChange={(e) => setCodFee(Number(e.target.value))}
                className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
                Maximum COD Cart Value Limit (₹)
              </label>
              <input
                type="number"
                value={maxCodAmount}
                onChange={(e) => setMaxCodAmount(Number(e.target.value))}
                className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders & Returns Policy Rules */}
      <div className="border border-black bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-tight pb-2 border-b border-neutral-200">
          Order &amp; Return Windows
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Customer Return Eligibility Window (Days from Delivery)
            </label>
            <input
              type="number"
              required
              min="1"
              max="30"
              value={returnDays}
              onChange={(e) => setReturnDays(Number(e.target.value))}
              className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
            />
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
              Default is 7 days from courier delivery timestamp.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Official Customer Support Email
            </label>
            <input
              type="email"
              required
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full border border-black p-2.5 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving Settings...' : 'Save All Settings'}</span>
        </button>
      </div>
    </form>
  )
}
