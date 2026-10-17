-- Migration 019: Collections featured toggle, mobile image, and SEO fields
-- Bubble Boom Capsule Drops & Collections Management

ALTER TABLE IF EXISTS public.collections 
ADD COLUMN IF NOT EXISTS mobile_banner_image_url TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seo_image_url TEXT;

-- Index for collection product relationships and ordering
CREATE INDEX IF NOT EXISTS idx_collection_products_col_sort 
ON public.collection_products (collection_id, sort_order);

-- Index for collections visibility and sorting
CREATE INDEX IF NOT EXISTS idx_collections_visible_sort 
ON public.collections (is_visible, sort_order);

-- Set Monochrome Kicks as featured
UPDATE public.collections
SET is_featured = TRUE
WHERE slug = 'bubble-boom-monochrome-kicks';
