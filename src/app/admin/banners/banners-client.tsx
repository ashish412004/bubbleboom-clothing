'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Save, Check } from 'lucide-react'

export function BannersClient({ initialBanners }: { initialBanners: any }) {
  const [loading, setLoading] = useState(false)
  const [announcementText, setAnnouncementText] = useState(
    initialBanners?.announcement_text ||
      'FREE EXPRESS SHIPPING ACROSS INDIA ON ORDERS OVER ₹1,499 | USE CODE FIRSTBOOM'
  )
  const [announcementActive, setAnnouncementActive] = useState(
    initialBanners?.announcement_active ?? true
  )
  const [heroHeading, setHeroHeading] = useState(
    initialBanners?.hero_heading || 'WEAR THE BOOM.'
  )
  const [heroSubheading, setHeroSubheading] = useState(
    initialBanners?.hero_subheading || 'Every style. Every mood. Make it yours.'
  )
  const [brandStatement, setBrandStatement] = useState(
    initialBanners?.brand_statement || 'YOUR STYLE. YOUR RULES.'
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'banners',
          value: {
            announcement_text: announcementText,
            announcement_active: announcementActive,
            hero_heading: heroHeading,
            hero_subheading: heroSubheading,
            brand_statement: brandStatement,
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to save banners')
      toast.success('Announcement bar and homepage copy updated!')
    } catch {
      toast.error('Error saving copy settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      {/* Announcement Bar */}
      <div className="border border-black bg-white p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-black" />
            <h2 className="text-sm font-black uppercase tracking-tight">Top Announcement Bar</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={announcementActive}
              onChange={(e) => setAnnouncementActive(e.target.checked)}
              className="h-4 w-4 rounded-none border border-black accent-black"
            />
            <span className="text-xs font-mono uppercase font-bold">Visible</span>
          </label>
        </div>

        <div>
          <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
            Announcement Bar Text (Always Uppercase)
          </label>
          <input
            type="text"
            required
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            className="w-full border border-black p-2.5 text-xs font-mono uppercase focus:outline-none"
          />
        </div>

        {/* Live Preview */}
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block mb-1">
            Live Preview
          </span>
          <div className="bg-black text-white py-2 px-4 text-center font-mono text-[11px] font-bold tracking-wider">
            {announcementText}
          </div>
        </div>
      </div>

      {/* Editorial Homepage Copy */}
      <div className="border border-black bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-tight pb-2 border-b border-neutral-200">
          Homepage Hero &amp; Brand Copy
        </h2>

        <div>
          <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
            Hero Heading (Main Tagline)
          </label>
          <input
            type="text"
            required
            value={heroHeading}
            onChange={(e) => setHeroHeading(e.target.value)}
            className="w-full border border-black p-2.5 text-sm font-black uppercase tracking-tight focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
            Hero Sub-Description
          </label>
          <input
            type="text"
            required
            value={heroSubheading}
            onChange={(e) => setHeroSubheading(e.target.value)}
            className="w-full border border-black p-2.5 text-xs focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-mono tracking-wider font-bold mb-1">
            Brand Statement Manifesto Banner
          </label>
          <input
            type="text"
            required
            value={brandStatement}
            onChange={(e) => setBrandStatement(e.target.value)}
            className="w-full border border-black p-2.5 text-sm font-black uppercase tracking-tight focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Committing...' : 'Commit Copy Changes'}</span>
        </button>
      </div>
    </form>
  )
}
