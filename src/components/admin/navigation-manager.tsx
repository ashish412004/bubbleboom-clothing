'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Layers,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Save,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag,
  FolderPlus,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { NavigationItem, NavigationSubItem, NavigationItemType } from '@/types/navigation'

interface NavigationManagerProps {
  initialItems?: NavigationItem[]
  categories?: Array<{ id: string; name: string; slug: string }>
  collections?: Array<{ id: string; name: string; slug: string }>
}

export function NavigationManager({
  initialItems = [],
  categories = [],
  collections = [],
}: NavigationManagerProps) {
  const [items, setItems] = useState<NavigationItem[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Modals state
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [expandedSubmenuId, setExpandedSubmenuId] = useState<string | null>(null)

  // Submenu editing state
  const [editingSubmenuParentId, setEditingSubmenuParentId] = useState<string | null>(null)
  const [editingSubmenuItem, setEditingSubmenuItem] = useState<NavigationSubItem | null>(null)
  const [isAddSubmenuOpen, setIsAddSubmenuOpen] = useState(false)

  // Load items from API if not provided
  useEffect(() => {
    if (initialItems.length === 0) {
      loadItems()
    }
  }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/navigation')
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items)
      } else {
        toast.error(data.error || 'Failed to load navigation')
      }
    } catch (err: any) {
      toast.error('Network error loading navigation')
    } finally {
      setLoading(false)
    }
  }

  // Save changes directly to Supabase
  const handleSaveAll = async (itemsToSave: NavigationItem[] = items) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave }),
      })
      const data = await res.json()
      if (data.success) {
        setItems(data.items)
        setHasUnsavedChanges(false)
        toast.success('Navigation menu saved and published instantly!', { duration: 3000 })
      } else {
        toast.error(data.error || 'Failed to save navigation')
      }
    } catch (err: any) {
      toast.error('Error saving changes to database')
    } finally {
      setLoading(false)
    }
  }

  // Move up / down
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return

    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp

    // Update sort orders
    const reordered = newItems.map((it, idx) => ({ ...it, sort_order: idx + 1 }))
    setItems(reordered)
    setHasUnsavedChanges(true)
    handleSaveAll(reordered)
  }

  // Toggle master visibility
  const toggleVisibility = (id: string) => {
    const updated = items.map((it) => (it.id === id ? { ...it, is_visible: !it.is_visible } : it))
    setItems(updated)
    handleSaveAll(updated)
  }

  // Toggle desktop visibility
  const toggleDesktop = (id: string) => {
    const updated = items.map((it) =>
      it.id === id ? { ...it, show_on_desktop: !it.show_on_desktop } : it
    )
    setItems(updated)
    handleSaveAll(updated)
  }

  // Toggle mobile visibility
  const toggleMobile = (id: string) => {
    const updated = items.map((it) =>
      it.id === id ? { ...it, show_on_mobile: !it.show_on_mobile } : it
    )
    setItems(updated)
    handleSaveAll(updated)
  }

  // Toggle auto-hide when empty
  const toggleAutoHide = (id: string) => {
    const updated = items.map((it) =>
      it.id === id ? { ...it, auto_hide_empty: !it.auto_hide_empty } : it
    )
    setItems(updated)
    handleSaveAll(updated)
  }

  // Delete / Archive item
  const handleDeleteItem = async (item: NavigationItem) => {
    const confirmMsg = item.is_default
      ? `Archive and hide "${item.name}" from public storefront? (Your products and categories will NOT be deleted)`
      : `Delete custom navigation item "${item.name}"?`

    if (!confirm(confirmMsg)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/navigation?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setItems(data.items)
        toast.success(item.is_default ? 'Item archived and hidden' : 'Custom menu item removed')
      } else {
        toast.error(data.error || 'Failed to remove item')
      }
    } catch {
      toast.error('Network error deleting item')
    } finally {
      setLoading(false)
    }
  }

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!confirm('Reset navigation menu to Bubble Boom defaults? (Shop All, New Arrivals, Men, Women, Footwear, Collections, Sale)')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      const data = await res.json()
      if (data.success) {
        setItems(data.items)
        setHasUnsavedChanges(false)
        toast.success('Navigation menu reset to original defaults!')
      } else {
        toast.error(data.error || 'Failed to reset')
      }
    } catch {
      toast.error('Network error resetting navigation')
    } finally {
      setLoading(false)
    }
  }

  // Save edited or new item
  const handleSaveModalItem = (itemData: Partial<NavigationItem>) => {
    if (!itemData.name || !itemData.url) {
      toast.error('Menu Name and Destination URL are required')
      return
    }

    let updatedList: NavigationItem[]
    if (editingItem) {
      // Update existing
      updatedList = items.map((it) =>
        it.id === editingItem.id ? ({ ...it, ...itemData } as NavigationItem) : it
      )
    } else {
      // Add new
      const maxOrder = items.reduce((max, it) => Math.max(max, it.sort_order), 0)
      const newItem: NavigationItem = {
        id: `nav-custom-${Date.now()}`,
        name: itemData.name.trim(),
        type: itemData.type || 'custom',
        url: itemData.url.trim(),
        is_visible: itemData.is_visible ?? true,
        show_on_desktop: itemData.show_on_desktop ?? true,
        show_on_mobile: itemData.show_on_mobile ?? true,
        auto_hide_empty: itemData.auto_hide_empty ?? false,
        sort_order: maxOrder + 1,
        is_default: false,
        badge: itemData.badge || null,
        target: itemData.target || '_self',
        dropdown_items: itemData.dropdown_items || [],
      }
      updatedList = [...items, newItem]
    }

    setItems(updatedList)
    setEditingItem(null)
    setIsAddModalOpen(false)
    handleSaveAll(updatedList)
  }

  // Submenu handlers
  const handleSaveSubmenuItem = (subData: Partial<NavigationSubItem>) => {
    if (!editingSubmenuParentId || !subData.label || !subData.url) {
      toast.error('Submenu Label and URL are required')
      return
    }

    const parentItem = items.find((it) => it.id === editingSubmenuParentId)
    if (!parentItem) return

    const existingSubs = parentItem.dropdown_items || []
    let updatedSubs: NavigationSubItem[]

    if (editingSubmenuItem) {
      updatedSubs = existingSubs.map((s) =>
        s.id === editingSubmenuItem.id ? ({ ...s, ...subData } as NavigationSubItem) : s
      )
    } else {
      const maxSubOrder = existingSubs.reduce((max, s) => Math.max(max, s.sort_order), 0)
      const newSub: NavigationSubItem = {
        id: `sub-${Date.now()}`,
        label: subData.label.trim(),
        url: subData.url.trim(),
        sort_order: maxSubOrder + 1,
        is_visible: subData.is_visible ?? true,
        show_on_desktop: subData.show_on_desktop ?? true,
        show_on_mobile: subData.show_on_mobile ?? true,
      }
      updatedSubs = [...existingSubs, newSub]
    }

    const updatedItems = items.map((it) =>
      it.id === editingSubmenuParentId ? { ...it, dropdown_items: updatedSubs } : it
    )

    setItems(updatedItems)
    setEditingSubmenuItem(null)
    setIsAddSubmenuOpen(false)
    handleSaveAll(updatedItems)
  }

  const handleDeleteSubmenuItem = (parentId: string, subId: string) => {
    const parentItem = items.find((it) => it.id === parentId)
    if (!parentItem) return

    const updatedSubs = (parentItem.dropdown_items || []).filter((s) => s.id !== subId)
    const updatedItems = items.map((it) =>
      it.id === parentId ? { ...it, dropdown_items: updatedSubs } : it
    )

    setItems(updatedItems)
    handleSaveAll(updatedItems)
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-neutral-500 mb-1">
            <span>Store Settings</span>
            <span>/</span>
            <span className="text-black">Navigation &amp; Menus</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            Storefront Navigation &amp; Menus
          </h1>
          <p className="text-xs text-neutral-600 font-mono mt-0.5">
            Manage public desktop navbar and mobile hamburger menu in real-time. Changes sync to Supabase without rebuilds.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={loading}
            className="border border-neutral-300 hover:border-black bg-white text-neutral-700 hover:text-black px-3.5 py-2 text-xs uppercase font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restore original 7 default menu items"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null)
              setIsAddModalOpen(true)
            }}
            disabled={loading}
            className="bg-black hover:bg-neutral-800 text-white px-4 py-2 text-xs uppercase font-bold tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Main Items Table */}
      <div className="border border-black bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 border-b border-black font-mono uppercase text-[11px] font-black text-neutral-800 select-none">
                <th className="py-3 px-3 w-16 text-center">Order</th>
                <th className="py-3 px-4">Menu Label &amp; Type</th>
                <th className="py-3 px-4">Destination URL</th>
                <th className="py-3 px-3 text-center">Catalog Stock</th>
                <th className="py-3 px-3 text-center">Master</th>
                <th className="py-3 px-3 text-center">Desktop</th>
                <th className="py-3 px-3 text-center">Mobile</th>
                <th className="py-3 px-3 text-center">Auto-Hide</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item, index) => {
                const isSubmenuOpen = expandedSubmenuId === item.id
                const subCount = item.dropdown_items?.length || 0
                const isItemEffectivelyHidden =
                  !item.is_visible || (item.auto_hide_empty && item.eligible_count === 0)

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      !item.is_visible
                        ? 'bg-neutral-50/60 opacity-60'
                        : isItemEffectivelyHidden
                        ? 'bg-amber-50/30'
                        : ''
                    }`}
                  >
                    {/* Sort Order & Move Arrows */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono font-bold text-xs w-4">{item.sort_order}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => moveItem(index, 'up')}
                            disabled={index === 0 || loading}
                            aria-label={`Move ${item.name} up`}
                            className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(index, 'down')}
                            disabled={index === items.length - 1 || loading}
                            aria-label={`Move ${item.name} down`}
                            className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Menu Name, Type & Submenu Badge */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase text-xs tracking-wider text-black">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="bg-black text-white text-[9px] font-mono px-1.5 py-0.5 uppercase tracking-widest font-bold rounded-xs">
                            {item.badge}
                          </span>
                        )}
                        {item.is_default && (
                          <span className="bg-neutral-200 text-neutral-700 text-[9px] font-mono px-1 py-0.2 rounded-xs uppercase">
                            Core
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono uppercase text-neutral-500">
                          Type: <strong className="text-neutral-700">{item.type}</strong>
                        </span>
                        {subCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedSubmenuId(isSubmenuOpen ? null : item.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-600 hover:text-black underline cursor-pointer"
                          >
                            <Layers className="w-3 h-3" />
                            <span>{subCount} dropdown sub-items</span>
                            {isSubmenuOpen ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Destination URL */}
                    <td className="py-3 px-4">
                      <a
                        href={item.url}
                        target={item.target || '_self'}
                        className="inline-flex items-center gap-1 text-xs font-mono text-neutral-700 hover:text-black hover:underline max-w-[200px] truncate"
                        title={item.url}
                      >
                        <span className="truncate">{item.url}</span>
                        {item.target === '_blank' && <ExternalLink className="w-3 h-3 shrink-0" />}
                      </a>
                    </td>

                    {/* Number of Eligible Products */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          typeof item.eligible_count === 'number' && item.eligible_count > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}
                        title="Authoritative live count of published and active products matching this menu"
                      >
                        {typeof item.eligible_count === 'number'
                          ? `${item.eligible_count} ${item.eligible_count === 1 ? 'item' : 'items'}`
                          : '—'}
                      </span>
                    </td>

                    {/* Master Visibility Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleVisibility(item.id)}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                          item.is_visible
                            ? 'bg-black text-white hover:bg-neutral-800'
                            : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
                        }`}
                        title={item.is_visible ? 'Published & Active' : 'Hidden by Admin'}
                      >
                        {item.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </td>

                    {/* Desktop Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleDesktop(item.id)}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                          item.show_on_desktop
                            ? 'text-black bg-neutral-100 hover:bg-neutral-200'
                            : 'text-neutral-300 hover:text-neutral-500'
                        }`}
                        title={item.show_on_desktop ? 'Visible on Desktop' : 'Hidden on Desktop'}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Mobile Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleMobile(item.id)}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                          item.show_on_mobile
                            ? 'text-black bg-neutral-100 hover:bg-neutral-200'
                            : 'text-neutral-300 hover:text-neutral-500'
                        }`}
                        title={item.show_on_mobile ? 'Visible on Mobile' : 'Hidden on Mobile'}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Auto-Hide Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleAutoHide(item.id)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-full border transition-colors cursor-pointer ${
                          item.auto_hide_empty
                            ? 'border-black bg-black text-white font-bold'
                            : 'border-neutral-300 text-neutral-400 hover:text-black'
                        }`}
                        title={
                          item.auto_hide_empty
                            ? 'Auto-hide enabled: Menu will disappear automatically if catalog has 0 published products'
                            : 'Auto-hide disabled: Menu stays visible regardless of catalog count'
                        }
                      >
                        {item.auto_hide_empty ? 'AUTO' : 'OFF'}
                      </button>
                    </td>

                    {/* Actions: Edit, Manage Submenu, Delete */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubmenuParentId(item.id)
                            setExpandedSubmenuId(item.id)
                            setIsAddSubmenuOpen(true)
                          }}
                          className="p-1 text-neutral-600 hover:text-black transition-colors rounded-xs cursor-pointer"
                          title="Add Submenu Dropdown"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item)
                            setIsAddModalOpen(true)
                          }}
                          className="p-1 text-neutral-600 hover:text-black transition-colors rounded-xs cursor-pointer"
                          title="Edit Menu Properties"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 text-neutral-400 hover:text-red-600 transition-colors rounded-xs cursor-pointer"
                          title={item.is_default ? 'Archive / Hide Default Menu' : 'Delete Custom Item'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Submenus Manager Row */}
      {expandedSubmenuId && (() => {
        const parent = items.find((it) => it.id === expandedSubmenuId)
        if (!parent) return null
        const subs = parent.dropdown_items || []

        return (
          <div className="border border-black bg-neutral-50 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-300">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-black" />
                <span className="font-black uppercase text-xs tracking-wider">
                  Dropdown Submenus for &quot;{parent.name}&quot;
                </span>
                <span className="text-neutral-500 font-mono text-[11px]">({subs.length} items)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubmenuParentId(parent.id)
                    setEditingSubmenuItem(null)
                    setIsAddSubmenuOpen(true)
                  }}
                  className="bg-black hover:bg-neutral-800 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Submenu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedSubmenuId(null)}
                  className="p-1 text-neutral-400 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {subs.length === 0 ? (
              <p className="text-xs text-neutral-500 font-mono py-2 italic">
                No dropdown submenus configured yet. Click &quot;Add Submenu&quot; to add links under {parent.name}.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subs.map((sub, sIdx) => (
                  <div
                    key={sub.id}
                    className="border border-neutral-300 bg-white p-3 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-xs uppercase text-black">{sub.label}</span>
                        <p className="text-[10px] font-mono text-neutral-500 truncate max-w-[180px]">
                          {sub.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubmenuParentId(parent.id)
                            setEditingSubmenuItem(sub)
                            setIsAddSubmenuOpen(true)
                          }}
                          className="p-1 text-neutral-500 hover:text-black cursor-pointer"
                          title="Edit Submenu"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmenuItem(parent.id, sub.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                          title="Delete Submenu"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[10px] font-mono text-neutral-500">
                      <span>Order #{sub.sort_order}</span>
                      <div className="flex items-center gap-2">
                        <span>{sub.show_on_desktop ? 'Desktop: YES' : 'Desktop: NO'}</span>
                        <span>{sub.show_on_mobile ? 'Mobile: YES' : 'Mobile: NO'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Add / Edit Menu Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-black max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-black">
              <h2 className="font-black uppercase text-sm tracking-wider">
                {editingItem ? `Edit Menu Item: ${editingItem.name}` : 'Add New Navigation Item'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null)
                  setIsAddModalOpen(false)
                }}
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const formData = new FormData(form)
                handleSaveModalItem({
                  name: String(formData.get('name') || ''),
                  type: String(formData.get('type') || 'custom') as NavigationItemType,
                  url: String(formData.get('url') || ''),
                  badge: formData.get('badge') ? String(formData.get('badge')) : null,
                  is_visible: formData.get('is_visible') === 'on',
                  show_on_desktop: formData.get('show_on_desktop') === 'on',
                  show_on_mobile: formData.get('show_on_mobile') === 'on',
                  auto_hide_empty: formData.get('auto_hide_empty') === 'on',
                  target: (formData.get('target') || '_self') as '_self' | '_blank',
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs uppercase font-mono font-bold mb-1">
                  Menu Label / Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingItem?.name || ''}
                  placeholder="e.g. HOODIES, CARGOS, SALE"
                  className="w-full border border-black p-2.5 text-xs uppercase font-extrabold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold mb-1">
                    Menu Type
                  </label>
                  <select
                    name="type"
                    defaultValue={editingItem?.type || 'category'}
                    className="w-full border border-black p-2.5 text-xs bg-white font-mono focus:outline-none"
                  >
                    <option value="link">Page Link</option>
                    <option value="category">Category</option>
                    <option value="collection">Collection</option>
                    <option value="department">Department</option>
                    <option value="sale">Sale Promotion</option>
                    <option value="custom">Custom Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono font-bold mb-1">
                    Badge Text (Optional)
                  </label>
                  <input
                    type="text"
                    name="badge"
                    defaultValue={editingItem?.badge || ''}
                    placeholder="e.g. HOT, NEW, 40% OFF"
                    className="w-full border border-black p-2.5 text-xs uppercase font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold mb-1">
                  Destination URL *
                </label>
                <input
                  type="text"
                  name="url"
                  required
                  defaultValue={editingItem?.url || '/shop'}
                  placeholder="e.g. /shop?category=hoodies"
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
                {/* Fast presets for categories and collections */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] font-mono text-neutral-400 py-0.5">Presets:</span>
                  {categories.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget.closest('form')?.querySelector('input[name="url"]') as HTMLInputElement
                        if (input) input.value = `/shop?category=${c.slug}`
                      }}
                      className="text-[10px] font-mono bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded-xs"
                    >
                      {c.name}
                    </button>
                  ))}
                  {collections.slice(0, 2).map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget.closest('form')?.querySelector('input[name="url"]') as HTMLInputElement
                        if (input) input.value = `/collections/${col.slug}`
                      }}
                      className="text-[10px] font-mono bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded-xs"
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="border border-neutral-200 p-3 space-y-2 bg-neutral-50 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_visible"
                    defaultChecked={editingItem ? editingItem.is_visible : true}
                    className="accent-black"
                  />
                  <span className="font-bold">Published (Master Storefront Visibility)</span>
                </label>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="show_on_desktop"
                      defaultChecked={editingItem ? editingItem.show_on_desktop : true}
                      className="accent-black"
                    />
                    <span>Show on Desktop Navbar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="show_on_mobile"
                      defaultChecked={editingItem ? editingItem.show_on_mobile : true}
                      className="accent-black"
                    />
                    <span>Show on Mobile Hamburger</span>
                  </label>
                </div>

                <div className="pt-1 border-t border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="auto_hide_empty"
                      defaultChecked={editingItem ? editingItem.auto_hide_empty : false}
                      className="accent-black"
                    />
                    <div>
                      <span className="font-bold">Auto-Hide When No Products Available</span>
                      <p className="text-[10px] text-neutral-500">
                        Hides automatically if catalog has 0 published products. Manual hide always takes priority.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null)
                    setIsAddModalOpen(false)
                  }}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase border border-neutral-300 hover:border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black hover:bg-neutral-800 text-white px-5 py-2 text-xs uppercase font-bold tracking-wider cursor-pointer"
                >
                  {loading ? 'Saving...' : editingItem ? 'Update Menu Item' : 'Create Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Submenu Modal */}
      {isAddSubmenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-black">
              <h2 className="font-black uppercase text-sm tracking-wider">
                {editingSubmenuItem ? 'Edit Dropdown Submenu' : 'Add Dropdown Submenu'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingSubmenuItem(null)
                  setIsAddSubmenuOpen(false)
                }}
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const formData = new FormData(form)
                handleSaveSubmenuItem({
                  label: String(formData.get('label') || ''),
                  url: String(formData.get('url') || ''),
                  is_visible: formData.get('is_visible') === 'on',
                  show_on_desktop: formData.get('show_on_desktop') === 'on',
                  show_on_mobile: formData.get('show_on_mobile') === 'on',
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs uppercase font-mono font-bold mb-1">
                  Submenu Label *
                </label>
                <input
                  type="text"
                  name="label"
                  required
                  defaultValue={editingSubmenuItem?.label || ''}
                  placeholder="e.g. T-Shirts, Hoodies, Sneakers"
                  className="w-full border border-black p-2.5 text-xs uppercase font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold mb-1">
                  Destination URL *
                </label>
                <input
                  type="text"
                  name="url"
                  required
                  defaultValue={editingSubmenuItem?.url || '/shop'}
                  placeholder="e.g. /shop?category=t-shirts"
                  className="w-full border border-black p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="border border-neutral-200 p-3 space-y-2 bg-neutral-50 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_visible"
                    defaultChecked={editingSubmenuItem ? editingSubmenuItem.is_visible : true}
                    className="accent-black"
                  />
                  <span className="font-bold">Published</span>
                </label>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="show_on_desktop"
                      defaultChecked={editingSubmenuItem ? editingSubmenuItem.show_on_desktop : true}
                      className="accent-black"
                    />
                    <span>Desktop</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="show_on_mobile"
                      defaultChecked={editingSubmenuItem ? editingSubmenuItem.show_on_mobile : true}
                      className="accent-black"
                    />
                    <span>Mobile</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubmenuItem(null)
                    setIsAddSubmenuOpen(false)
                  }}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase border border-neutral-300 hover:border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black hover:bg-neutral-800 text-white px-5 py-2 text-xs uppercase font-bold tracking-wider cursor-pointer"
                >
                  Save Submenu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
