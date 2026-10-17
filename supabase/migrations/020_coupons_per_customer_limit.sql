-- Migration 020: Fix Coupons Schema, Add per_customer_limit & Atomic Concurrency Guard
-- Bubble Boom E-Commerce - Safe, Idempotent Database Migration

-- 1. Add missing per_customer_limit column with check constraint
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS per_customer_limit INTEGER CHECK (per_customer_limit > 0);

-- 2. Add product & collection applicability array columns if missing
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS applicable_products UUID[] DEFAULT '{}';

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS applicable_collections UUID[] DEFAULT '{}';

-- 3. Make user_id nullable in coupon_usage to support guest customer checkout
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupon_usage' 
      AND column_name = 'user_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.coupon_usage ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- 4. Add guest customer identifiers to coupon_usage for per-customer tracking
ALTER TABLE public.coupon_usage
ADD COLUMN IF NOT EXISTS customer_email TEXT;

ALTER TABLE public.coupon_usage
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Index for speedy per-customer and order lookup
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_email ON public.coupon_usage(coupon_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_phone ON public.coupon_usage(coupon_id, customer_phone);

-- 5. Atomic, concurrency-safe usage increment function
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.coupons
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id
    AND (usage_limit IS NULL OR usage_count < usage_limit);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- 6. Insert / Upsert DIWALI2026 coupon with authoritative constraints
INSERT INTO public.coupons (
  code,
  description,
  discount_type,
  discount_value,
  minimum_amount,
  maximum_discount,
  start_date,
  expiry_date,
  usage_limit,
  usage_count,
  per_customer_limit,
  is_active
) VALUES (
  'DIWALI2026',
  'Diwali Festive Offer - Flat ₹100 Off on orders above ₹999',
  'fixed',
  100,
  999,
  100,
  NOW(),
  '2026-11-30 23:59:59+05:30',
  100,
  0,
  1,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  minimum_amount = EXCLUDED.minimum_amount,
  maximum_discount = EXCLUDED.maximum_discount,
  expiry_date = EXCLUDED.expiry_date,
  usage_limit = EXCLUDED.usage_limit,
  per_customer_limit = EXCLUDED.per_customer_limit,
  is_active = TRUE,
  updated_at = NOW();

-- 7. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
