import { createServiceClient } from '@/lib/supabase/server'
import { ReturnsInspector } from './returns-inspector'

export const dynamic = 'force-dynamic'

export default async function AdminReturnsPage() {
  const supabase = await createServiceClient()
  const { data: returns } = await supabase
    .from('returns')
    .select('*')
    .order('created_at', { ascending: false })

  // Enrich with order_number
  const enrichedReturns = await Promise.all(
    (returns || []).map(async (ret) => {
      const { data: ord } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', ret.order_id)
        .maybeSingle()

      return {
        ...ret,
        order: ord ? { order_number: ord.order_number } : null,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Return Inspections &amp; Quality Decisions</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Review customer returns within the 7-day window, audit item condition, decide restock eligibility, and release refunds.
        </p>
      </div>

      <ReturnsInspector initialReturns={enrichedReturns} />
    </div>
  )
}
