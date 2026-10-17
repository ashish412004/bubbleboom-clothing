-- Migration 022: Add color and is_primary to product_images for colour variant multi-image galleries
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Performance index for colour gallery queries and primary cover image lookup
CREATE INDEX IF NOT EXISTS idx_product_images_product_color ON public.product_images(product_id, color);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, color, is_primary);
