'use client'

import { useState } from 'react'

const TEE_MEASUREMENTS = {
  in: [
    { size: 'S', chest: '42', length: '28', shoulder: '20.5', sleeve: '8.5' },
    { size: 'M', chest: '44', length: '29', shoulder: '21.5', sleeve: '9.0' },
    { size: 'L', chest: '46', length: '30', shoulder: '22.5', sleeve: '9.5' },
    { size: 'XL', chest: '48', length: '31', shoulder: '23.5', sleeve: '10.0' },
    { size: 'XXL', chest: '50', length: '32', shoulder: '24.5', sleeve: '10.5' },
  ],
  cm: [
    { size: 'S', chest: '106.7', length: '71.1', shoulder: '52.1', sleeve: '21.6' },
    { size: 'M', chest: '111.8', length: '73.7', shoulder: '54.6', sleeve: '22.9' },
    { size: 'L', chest: '116.8', length: '76.2', shoulder: '57.2', sleeve: '24.1' },
    { size: 'XL', chest: '121.9', length: '78.7', shoulder: '59.7', sleeve: '25.4' },
    { size: 'XXL', chest: '127.0', length: '81.3', shoulder: '62.2', sleeve: '26.7' },
  ],
}

const HOODIE_MEASUREMENTS = {
  in: [
    { size: 'S', chest: '44', length: '27.5', shoulder: '21', sleeve: '24' },
    { size: 'M', chest: '46', length: '28.5', shoulder: '22', sleeve: '24.5' },
    { size: 'L', chest: '48', length: '29.5', shoulder: '23', sleeve: '25' },
    { size: 'XL', chest: '50', length: '30.5', shoulder: '24', sleeve: '25.5' },
    { size: 'XXL', chest: '52', length: '31.5', shoulder: '25', sleeve: '26' },
  ],
  cm: [
    { size: 'S', chest: '111.8', length: '69.8', shoulder: '53.3', sleeve: '61.0' },
    { size: 'M', chest: '116.8', length: '72.4', shoulder: '55.9', sleeve: '62.2' },
    { size: 'L', chest: '121.9', length: '74.9', shoulder: '58.4', sleeve: '63.5' },
    { size: 'XL', chest: '127.0', length: '77.5', shoulder: '61.0', sleeve: '64.8' },
    { size: 'XXL', chest: '132.1', length: '80.0', shoulder: '63.5', sleeve: '66.0' },
  ],
}

const PANTS_MEASUREMENTS = {
  in: [
    { size: '30 (S)', waist: '30 - 32', hip: '40', inseam: '30', outseam: '41' },
    { size: '32 (M)', waist: '32 - 34', hip: '42', inseam: '30.5', outseam: '41.5' },
    { size: '34 (L)', waist: '34 - 36', hip: '44', inseam: '31', outseam: '42' },
    { size: '36 (XL)', waist: '36 - 38', hip: '46', inseam: '31.5', outseam: '42.5' },
  ],
  cm: [
    { size: '30 (S)', waist: '76.2 - 81.3', hip: '101.6', inseam: '76.2', outseam: '104.1' },
    { size: '32 (M)', waist: '81.3 - 86.4', hip: '106.7', inseam: '77.5', outseam: '105.4' },
    { size: '34 (L)', waist: '86.4 - 91.4', hip: '111.8', inseam: '78.7', outseam: '106.7' },
    { size: '36 (XL)', waist: '91.4 - 96.5', hip: '116.8', inseam: '80.0', outseam: '108.0' },
  ],
}

export function SizeGuideClient() {
  const [unit, setUnit] = useState<'in' | 'cm'>('in')

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Unit Switcher */}
      <div className="flex items-center justify-between pb-6 border-b border-neutral-300">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-neutral-500">Bubble Boom Sizing Matrix</span>
          <h2 className="text-2xl font-black uppercase tracking-tight mt-1">Silhouette Measurements</h2>
        </div>

        <div className="flex items-center border border-black p-0.5 bg-white">
          <button
            onClick={() => setUnit('in')}
            className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors ${
              unit === 'in' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Inches (&quot;)
          </button>
          <button
            onClick={() => setUnit('cm')}
            className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors ${
              unit === 'cm' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Centimeters (cm)
          </button>
        </div>
      </div>

      {/* Oversized T-Shirts */}
      <div className="border border-black bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black uppercase tracking-tight">Oversized &amp; Boxy Tees (Drop-Shoulder)</h3>
          <span className="text-[10px] uppercase font-mono bg-[#F8F8F6] border border-black px-2 py-0.5">
            Fit: Generously Boxy
          </span>
        </div>
        <p className="text-xs text-neutral-600 mb-4">
          Crafted with 240 GSM combed cotton. Designed to hang off the shoulders naturally. For a fitted look, order one size down.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100">
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Chest Width ({unit})</th>
                <th className="py-2.5 px-3">Body Length ({unit})</th>
                <th className="py-2.5 px-3">Shoulder ({unit})</th>
                <th className="py-2.5 px-3">Sleeve Length ({unit})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {TEE_MEASUREMENTS[unit].map((row) => (
                <tr key={row.size} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-3 font-bold text-black">{row.size}</td>
                  <td className="py-2.5 px-3">{row.chest}</td>
                  <td className="py-2.5 px-3">{row.length}</td>
                  <td className="py-2.5 px-3">{row.shoulder}</td>
                  <td className="py-2.5 px-3">{row.sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Heavyweight Hoodies */}
      <div className="border border-black bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black uppercase tracking-tight">Heavyweight French Terry Hoodies</h3>
          <span className="text-[10px] uppercase font-mono bg-[#F8F8F6] border border-black px-2 py-0.5">
            Weight: 450 GSM
          </span>
        </div>
        <p className="text-xs text-neutral-600 mb-4">
          Double-layered crossover hood with ribbed cuffs and hem. True streetwear cut with relaxed chest room.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100">
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Chest Circumference ({unit})</th>
                <th className="py-2.5 px-3">Body Length ({unit})</th>
                <th className="py-2.5 px-3">Shoulder ({unit})</th>
                <th className="py-2.5 px-3">Sleeve ({unit})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {HOODIE_MEASUREMENTS[unit].map((row) => (
                <tr key={row.size} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-3 font-bold text-black">{row.size}</td>
                  <td className="py-2.5 px-3">{row.chest}</td>
                  <td className="py-2.5 px-3">{row.length}</td>
                  <td className="py-2.5 px-3">{row.shoulder}</td>
                  <td className="py-2.5 px-3">{row.sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relaxed Cargo Pants */}
      <div className="border border-black bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black uppercase tracking-tight">Relaxed Cargo &amp; Utility Bottoms</h3>
          <span className="text-[10px] uppercase font-mono bg-[#F8F8F6] border border-black px-2 py-0.5">
            Fit: Straight / Wide Leg
          </span>
        </div>
        <p className="text-xs text-neutral-600 mb-4">
          Constructed with heavyweight cotton ripstop and elasticated waistband with drawstring.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100">
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Waist Stretched ({unit})</th>
                <th className="py-2.5 px-3">Hip ({unit})</th>
                <th className="py-2.5 px-3">Inseam ({unit})</th>
                <th className="py-2.5 px-3">Total Outseam ({unit})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {PANTS_MEASUREMENTS[unit].map((row) => (
                <tr key={row.size} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-3 font-bold text-black">{row.size}</td>
                  <td className="py-2.5 px-3">{row.waist}</td>
                  <td className="py-2.5 px-3">{row.hip}</td>
                  <td className="py-2.5 px-3">{row.inseam}</td>
                  <td className="py-2.5 px-3">{row.outseam}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Measuring Instructions */}
      <div className="border-2 border-black p-6 bg-[#F8F8F6]">
        <h3 className="text-sm font-black uppercase tracking-tight mb-3">How to Measure for the Perfect Fit</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-neutral-700">
          <div>
            <strong className="text-black uppercase block mb-1 font-mono">1. Chest</strong>
            Measure flat from armpit to armpit across the fullest part of your chest, multiplying by 2 for total circumference.
          </div>
          <div>
            <strong className="text-black uppercase block mb-1 font-mono">2. Length</strong>
            Measure from the highest point of the shoulder collar straight down to the bottom hem of the shirt or hoodie.
          </div>
          <div>
            <strong className="text-black uppercase block mb-1 font-mono">3. Shoulder</strong>
            Measure from the outer edge of one shoulder seam straight across the back neck to the opposite shoulder seam.
          </div>
        </div>
      </div>
    </div>
  )
}
