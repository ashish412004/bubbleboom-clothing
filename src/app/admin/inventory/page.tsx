import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { InventoryTable } from './inventory-table'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  const mockVariants = MOCK_PRODUCTS.flatMap((p) =>
    p.variants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      stock: v.stock,
      product: { name: p.name },
    }))
  )

  let variantsList = mockVariants
  const reservedMap: Record<string, number> = {}
  let movements: any[] = [
    {
      id: 'mov_1',
      variant: {
        sku: 'BB-TEE-BLK-M',
        color: 'Black',
        size: 'M',
        product: { name: 'Bubble Boom Heavyweight Boxy Tee' },
      },
      movement_type: 'audit_adjustment',
      quantity_change: 10,
      reason: 'Physical warehouse count reconciliation',
      created_at: '2026-10-04T11:00:00Z',
    },
  ]

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()

      // 1. Fetch variants with products
      const { data: variants } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          color,
          size,
          stock,
          product:products(name)
        `)
        .order('stock', { ascending: true })

      if (variants && variants.length > 0) {
        variantsList = variants
      }

      // 2. Fetch active reservations to compute reserved counts
      const now = new Date().toISOString()
      const { data: reservations } = await supabase
        .from('inventory_reservations')
        .select('variant_id, quantity')
        .eq('status', 'active')
        .gt('expires_at', now)

      reservations?.forEach((r) => {
        reservedMap[r.variant_id] = (reservedMap[r.variant_id] || 0) + r.quantity
      })

      // 3. Fetch recent movements
      const { data: movs } = await supabase
        .from('inventory_movements')
        .select('*, variant:product_variants(sku, color, size, product:products(name))')
        .order('created_at', { ascending: false })
        .limit(10)

      if (movs && movs.length > 0) {
        movements = movs
      }
    } catch {
      // Fallback
    }
  }

  const inventoryItems = variantsList.map((v: any) => {
    const reserved = reservedMap[v.id] || 0
    return {
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      stock: v.stock,
      reserved,
      available: Math.max(0, v.stock - reserved),
      product_name: v.product?.name || 'Unknown Product',
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Inventory &amp; Stock Levels</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Atomic reservation monitoring, physical stock-on-hand, and audited manual adjustments.
        </p>
      </div>

      <InventoryTable initialVariants={inventoryItems} />

      {/* Audit Movements Log */}
      <div className="border border-black bg-white p-6">
        <h2 className="text-sm font-black uppercase tracking-tight pb-3 mb-4 border-b border-neutral-200">
          Recent Stock Movements Log
        </h2>

        {movements && movements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 uppercase">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Change</th>
                  <th className="py-2">Reason / Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 text-neutral-500">
                      {new Date(m.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 font-bold">
                      {m.variant?.product?.name} ({m.variant?.color}/{m.variant?.size})
                    </td>
                    <td className="py-2.5 uppercase font-bold text-neutral-700">{m.movement_type}</td>
                    <td className="py-2.5 font-bold font-mono">
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} units
                    </td>
                    <td className="py-2.5 text-neutral-600">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-mono text-neutral-500">
            No inventory movement records yet.
          </div>
        )}
      </div>
    </div>
  )
}
