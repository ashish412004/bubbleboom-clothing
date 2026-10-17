-- Migration 023: Product Mode Classification (Test / Live) & SEO Preparation
-- Enables separating development/test merchandise from live inventory without deleting test products.

-- 1. Safely add product_mode and is_test columns to products if not exists
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_mode TEXT DEFAULT 'test' CHECK (product_mode IN ('test', 'live')),
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT true;

-- 2. Create index for fast filtering of live products in sitemap and feeds
CREATE INDEX IF NOT EXISTS idx_products_mode_published 
ON public.products (product_mode, is_published, is_active);

-- 3. Update existing products to have product_mode = 'test' if NULL
UPDATE public.products
SET product_mode = 'test', is_test = true
WHERE product_mode IS NULL OR is_test IS NULL;
