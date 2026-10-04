import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { ReturnsInspector } from './returns-inspector'
import { MOCK_RETURNS } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default async function AdminReturnsPage() {
  let enrichedReturns: any[] = MOCK_RETURNS.map((ret) => ({
    ...ret,
    order: { order_number: ret.orders.order_number },
  }))

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: returns } = await supabase
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false })

      if (returns && returns.length > 0) {
        enrichedReturns = await Promise.all(
          returns.map(async (ret) => {
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
      }
    } catch {
      // Fallback
    }
  }

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
