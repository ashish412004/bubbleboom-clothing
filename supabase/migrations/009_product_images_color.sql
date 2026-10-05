-- Migration 009: Add color column to product_images for colour-to-gallery mapping
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS color TEXT;

-- Index for fast colour-based lookups and joins
CREATE INDEX IF NOT EXISTS idx_product_images_product_color ON public.product_images(product_id, color);
