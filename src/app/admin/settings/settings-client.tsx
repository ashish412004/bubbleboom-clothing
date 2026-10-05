'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Save, AlertTriangle, CheckCircle2, Truck, RotateCcw, ShieldCheck } from 'lucide-react'

interface SettingsClientProps {
  initialShipping: any
  initialOrders: any
  initialGeneral: any
  initialExchange?: any
}

export function SettingsClient({
  initialShipping,
  initialOrders,
  initialGeneral,
  initialExchange,
}: SettingsClientProps) {
  const [loading, setLoading] = useState(false)

  // 1. Shipping & Logistics Financials
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

  // 2. Real Delivery Date Rules & Processing Times
  const [deliveryRulesEnabled, setDeliveryRulesEnabled] = useState(
    initialShipping?.delivery_rules_enabled ?? true
  )
  const [processingDaysMin, setProcessingDaysMin] = useState(
    initialShipping?.processing_days_min ?? 1
  )
  const [processingDaysMax, setProcessingDaysMax] = useState(
    initialShipping?.processing_days_max ?? 2
  )
  const [transitDaysMin, setTransitDaysMin] = useState(
    initialShipping?.transit_days_min ?? 2
  )
  const [transitDaysMax, setTransitDaysMax] = useState(
    initialShipping?.transit_days_max ?? 4
  )
  const [serviceablePins, setServiceablePins] = useState(
    Array.isArray(initialShipping?.serviceable_pin_codes)
      ? initialShipping.serviceable_pin_codes.join(', ')
      : '*'
  )
  const [codExcludedPins, setCodExcludedPins] = useState(
    Array.isArray(initialShipping?.cod_excluded_pin_codes)
      ? initialShipping.cod_excluded_pin_codes.join(', ')
      : ''
  )

  // 3. Exchange Policy Settings
  const [policyConfigured, setPolicyConfigured] = useState(
    initialExchange?.policy_configured ?? true
  )
  const [exchangeWindowDays, setExchangeWindowDays] = useState(
    initialExchange?.exchange_window_days ?? 7
  )
  const [itemConditions, setItemConditions] = useState(
    initialExchange?.item_conditions ||
      'Unworn, unwashed, and undamaged with original tags intact'
  )
  const [applicableFee, setApplicableFee] = useState(
    Math.round((initialExchange?.applicable_fee_paise || 0) / 100)
  )
  const [excludedTags, setExcludedTags] = useState(
    Array.isArray(initialExchange?.excluded_tags)
      ? initialExchange.excluded_tags.join(', ')
      : 'final-sale, non-exchangeable, archive-sale'
  )
  const [policyPageUrl, setPolicyPageUrl] = useState(
    initialExchange?.policy_page_url || '/returns-refunds'
  )

  // 4. Orders & General
  const [returnDays, setReturnDays] = useState(initialOrders?.return_window_days || 7)
  const [supportEmail, setSupportEmail] = useState(
    initialGeneral?.support_email || 'bubbleboomstore2026@gmail.com'
  )
  const [storeName, setStoreName] = useState(initialGeneral?.store_name || 'BUBBLE BOOM')

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const pinCodesArray = serviceablePins
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean)

      const codExcludedArray = codExcludedPins
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean)

      const excludedTagsArray = excludedTags
        .split(',')
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean)

      // 1. Save shipping & delivery settings
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
            delivery_rules_enabled: Boolean(deliveryRulesEnabled),
            processing_days_min: Number(processingDaysMin),
            processing_days_max: Number(processingDaysMax),
            transit_days_min: Number(transitDaysMin),
            transit_days_max: Number(transitDaysMax),
            serviceable_pin_codes: pinCodesArray.length > 0 ? pinCodesArray : ['*'],
            cod_excluded_pin_codes: codExcludedArray,
          },
        }),
      })

      // 2. Save exchange settings
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'exchange',
          value: {
            policy_configured: Boolean(policyConfigured),
            exchange_window_days: Number(exchangeWindowDays),
            item_conditions: itemConditions.trim(),
            applicable_fee_paise: Number(applicableFee) * 100,
            excluded_tags: excludedTagsArray,
            excluded_product_ids: initialExchange?.excluded_product_ids || [],
            excluded_categories: initialExchange?.excluded_categories || [],
            policy_page_url: policyPageUrl.trim(),
          },
        }),
      })

      // 3. Save order settings
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

      // 4. Save general settings
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

      toast.success('Store shipping, delivery rules, and exchange settings saved!')
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
      {/* 1. SHIPPING & LOGISTICS FINANCIALS */}
      <div className="border border-black bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
          <Truck className="w-4 h-4 text-black" />
          <h2 className="text-sm font-black uppercase tracking-tight">
            Shipping &amp; Logistics Financial Rules
          </h2>
        </div>

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
              Orders ₹{freeThreshold} and above ship free at checkout &amp; product pages.
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
              Charged when subtotal is below the free shipping threshold.
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
              Enable Cash on Delivery (COD) Storewide
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

      {/* 2. REAL DELIVERY DATE ESTIMATES & PROCESSING TIME */}
      <div className="border border-black bg-white p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-black" />
            <h2 className="text-sm font-black uppercase tracking-tight">
              Real Delivery Estimates &amp; Processing Schedules
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-2 py-0.5 font-bold">
            Data-Backed
          </span>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={deliveryRulesEnabled}
              onChange={(e) => setDeliveryRulesEnabled(e.target.checked)}
              className="h-4 w-4 rounded-none border border-black accent-black"
            />
            <span className="text-xs font-bold text-black uppercase font-mono">
              Enable Live Delivery Date Estimates on Product Pages
            </span>
          </label>
          {!deliveryRulesEnabled && (
            <p className="text-[11px] font-mono text-neutral-600 bg-neutral-50 p-2 border border-neutral-200">
              ℹ️ When disabled, product pages display &ldquo;Delivery estimate currently unavailable&rdquo; instead of fabricated dates.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Dispatch Processing Window (Days) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={processingDaysMin}
                  onChange={(e) => setProcessingDaysMin(Number(e.target.value))}
                  className="w-full border border-black p-2 text-xs font-mono"
                  placeholder="Min"
                />
                <span className="text-[10px] text-neutral-500 font-mono">Min Days</span>
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={processingDaysMax}
                  onChange={(e) => setProcessingDaysMax(Number(e.target.value))}
                  className="w-full border border-black p-2 text-xs font-mono"
                  placeholder="Max"
                />
                <span className="text-[10px] text-neutral-500 font-mono">Max Days</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Courier Transit Window (Days) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={transitDaysMin}
                  onChange={(e) => setTransitDaysMin(Number(e.target.value))}
                  className="w-full border border-black p-2 text-xs font-mono"
                  placeholder="Min"
                />
                <span className="text-[10px] text-neutral-500 font-mono">Min Transit</span>
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={transitDaysMax}
                  onChange={(e) => setTransitDaysMax(Number(e.target.value))}
                  className="w-full border border-black p-2 text-xs font-mono"
                  placeholder="Max"
                />
                <span className="text-[10px] text-neutral-500 font-mono">Max Transit</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Serviceable PIN Codes (* = All India)
            </label>
            <input
              type="text"
              value={serviceablePins}
              onChange={(e) => setServiceablePins(e.target.value)}
              placeholder="* or 110001, 400001, 560001"
              className="w-full border border-black p-2 text-xs font-mono"
            />
            <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
              Enter * for all India, or comma-separated PINs / prefixes.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              COD Excluded PIN Codes (Optional)
            </label>
            <input
              type="text"
              value={codExcludedPins}
              onChange={(e) => setCodExcludedPins(e.target.value)}
              placeholder="e.g. 190001, 795001"
              className="w-full border border-black p-2 text-xs font-mono"
            />
            <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
              PIN codes where Cash on Delivery is not serviceable.
            </span>
          </div>
        </div>
      </div>

      {/* 3. EXCHANGE POLICY RULES */}
      <div className="border border-black bg-white p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-black" />
            <h2 className="text-sm font-black uppercase tracking-tight">
              Product Exchange &amp; Returns Policy
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-black text-white px-2 py-0.5 font-bold">
            Storefront
          </span>
        </div>

        {/* Configuration Flag Warning */}
        {!policyConfigured ? (
          <div className="p-3 bg-neutral-100 border-l-4 border-black text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-black shrink-0 mt-0.5" />
            <div>
              <strong className="block text-black uppercase">
                Exchange Policy Currently Unconfigured
              </strong>
              <span>
                Product pages will only show a generic link to the policy page. Specific exchange windows and free terms will not be promised until you enable and configure this policy.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-neutral-50 border border-neutral-200 text-xs font-mono flex items-center gap-2 text-black">
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
            <span>Exchange policy is active and displaying verified terms on product pages.</span>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={policyConfigured}
              onChange={(e) => setPolicyConfigured(e.target.checked)}
              className="h-4 w-4 rounded-none border border-black accent-black"
            />
            <span className="text-xs font-bold text-black uppercase font-mono">
              Mark Policy as Configured (Displays Full Exchange Summary)
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Exchange Window (Days from Delivery) *
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={exchangeWindowDays}
              onChange={(e) => setExchangeWindowDays(Number(e.target.value))}
              className="w-full border border-black p-2.5 text-xs font-mono"
            />
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
              Number of days customer has to request size exchange after delivery.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Exchange Convenience Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              value={applicableFee}
              onChange={(e) => setApplicableFee(Number(e.target.value))}
              className="w-full border border-black p-2.5 text-xs font-mono"
            />
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
              Set to 0 for Free Exchange, or enter reverse pickup fee.
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
            Required Item Conditions
          </label>
          <input
            type="text"
            value={itemConditions}
            onChange={(e) => setItemConditions(e.target.value)}
            className="w-full border border-black p-2.5 text-xs font-mono"
          />
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
            e.g. Unworn, unwashed, and undamaged with original tags intact
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Excluded Product Tags (Comma Separated)
            </label>
            <input
              type="text"
              value={excludedTags}
              onChange={(e) => setExcludedTags(e.target.value)}
              className="w-full border border-black p-2.5 text-xs font-mono"
            />
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
              Items carrying these tags will display as Final Sale / Non-exchangeable.
            </span>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Official Exchange Policy URL
            </label>
            <input
              type="text"
              value={policyPageUrl}
              onChange={(e) => setPolicyPageUrl(e.target.value)}
              className="w-full border border-black p-2.5 text-xs font-mono"
            />
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
              Default is /returns-refunds
            </span>
          </div>
        </div>
      </div>

      {/* 4. ORDERS & GENERAL SETTINGS */}
      <div className="border border-black bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-tight pb-2 border-b border-neutral-200">
          General Brand Support
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
              Store Brand Name
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
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
