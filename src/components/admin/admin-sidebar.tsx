'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  Package,
  Layers,
  Archive,
  Ticket,
  Sliders,
  RotateCcw,
  Megaphone,
  Settings,
  History,
  Store,
  ExternalLink,
  Mail,
} from 'lucide-react'

const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders & Shipments', icon: Package },
  { href: '/admin/products', label: 'Product Catalog', icon: Layers },
  { href: '/admin/inventory', label: 'Stock & Inventory', icon: Archive },
  { href: '/admin/categories', label: 'Categories', icon: Sliders },
  { href: '/admin/collections', label: 'Capsule Drops', icon: Layers },
  { href: '/admin/coupons', label: 'Coupons & Promos', icon: Ticket },
  { href: '/admin/subscribers', label: 'Newsletter Squad', icon: Mail },
  { href: '/admin/returns', label: 'Returns Inspection', icon: RotateCcw },
  { href: '/admin/banners', label: 'Announcement Bars', icon: Megaphone },
  { href: '/admin/settings', label: 'Store Settings', icon: Settings },
  { href: '/admin/audit-logs', label: 'Audit Trail', icon: History },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-64 bg-black text-white flex-col min-h-screen border-r border-neutral-800 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative invert">
            <Image
              src="/images/brand/bubble-boom-icon.png"
              alt="Bubble Boom Monogram"
              fill
              sizes="32px"
              className="object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight uppercase">BUBBLE BOOM</div>
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 block uppercase">
              Admin Terminal
            </span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {ADMIN_LINKS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-xs font-mono tracking-wider transition-colors ${
                isActive
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer / Storefront Return */}
      <div className="p-4 border-t border-neutral-800">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span>Live Storefront</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  )
}
