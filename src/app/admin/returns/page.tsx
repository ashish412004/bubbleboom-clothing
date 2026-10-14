import { getAllReturns } from '@/lib/returns'
import { ReturnsInspector } from './returns-inspector'

export const dynamic = 'force-dynamic'

export default async function AdminReturnsPage() {
  const returns = await getAllReturns()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Returns, Exchanges &amp; Reverse Pickups</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Complete operational pipeline: Review claims within the 7-day guarantee, book reverse couriers, record warehouse inspection, restock variants, dispatch exchanges and execute refunds.
        </p>
      </div>

      <ReturnsInspector initialReturns={returns} />
    </div>
  )
}
