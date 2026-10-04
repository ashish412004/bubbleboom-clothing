import { createServiceClient } from '@/lib/supabase/server'
import { CouponManager } from './coupon-manager'

export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  const supabase = await createServiceClient()
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Coupons &amp; Discounts</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Create promotional discount codes with minimum cart spend thresholds and usage limits.
        </p>
      </div>

      <CouponManager initialCoupons={coupons || []} />
    </div>
  )
}
