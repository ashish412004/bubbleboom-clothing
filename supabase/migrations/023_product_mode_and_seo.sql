-- Migration 023: Product Mode Classification (Test / Live) & SEO Preparation
-- Bubble Boom E-Commerce - Product Classification Synchronization

-- 1. Safely add product_mode and is_test columns to products if not exists
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_mode TEXT DEFAULT 'test' CHECK (product_mode IN ('test', 'live'));

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT true;

-- 2. Create index for fast filtering of live products in sitemap and feeds
CREATE INDEX IF NOT EXISTS idx_products_mode_published 
ON public.products (product_mode, is_published, is_active);

-- 3. Synchronize existing products:
-- Preserve explicitly tagged live items ('mode:live', 'live-product') as LIVE.
-- All other products safely remain TEST (is_test = true, product_mode = 'test').
UPDATE public.products
SET 
  product_mode = CASE 
    WHEN tags IS NOT NULL AND ('mode:live' = ANY(tags) OR 'live-product' = ANY(tags)) THEN 'live'
    ELSE 'test'
  END,
  is_test = CASE 
    WHEN tags IS NOT NULL AND ('mode:live' = ANY(tags) OR 'live-product' = ANY(tags)) THEN false
    ELSE true
  END
WHERE product_mode IS NULL OR is_test IS NULL;

-- 4. Immediately reload PostgREST schema cache so API and editor instantly recognize columns
NOTIFY pgrst, 'reload schema';
