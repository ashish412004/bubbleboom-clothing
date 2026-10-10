-- Migration 010: Footwear category, Capsule collection images, and product-to-collection relations

-- 1. Ensure mobile_banner_image_url column exists on collections
ALTER TABLE IF EXISTS public.collections 
ADD COLUMN IF NOT EXISTS mobile_banner_image_url TEXT;

-- 2. Upsert standard categories with Footwear
INSERT INTO public.categories (id, name, slug, description, sort_order, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'T-Shirts', 't-shirts', 'Relaxed and boxy silhouette tees', 1, true),
  ('c1000000-0000-0000-0000-000000000004', 'Shirts', 'shirts', 'Boxy cut shirts and overshirts', 2, true),
  ('c1000000-0000-0000-0000-000000000002', 'Hoodies', 'hoodies', 'Streetwear hoodies and pullovers', 3, true),
  ('c1000000-0000-0000-0000-000000000012', 'Sweatshirts', 'sweatshirts', 'Crewnecks and heavyweight sweatshirts', 4, true),
  ('c1000000-0000-0000-0000-000000000013', 'Jeans', 'jeans', 'Baggy and relaxed cut streetwear denim', 5, true),
  ('c1000000-0000-0000-0000-000000000003', 'Cargos', 'cargos', 'Utility tactical cargos and relaxed bottoms', 6, true),
  ('c1000000-0000-0000-0000-000000000014', 'Joggers', 'joggers', 'Heavyweight fleece track pants and joggers', 7, true),
  ('c1000000-0000-0000-0000-000000000015', 'Shorts', 'shorts', 'Drop-crotch and heavyweight fleece shorts', 8, true),
  ('c1000000-0000-0000-0000-000000000010', 'Footwear', 'footwear', 'Streetwear kicks, chunky sneakers and slides', 9, true),
  ('c1000000-0000-0000-0000-000000000006', 'Accessories', 'accessories', 'Caps, beanies, socks and lifestyle gear', 10, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- 3. Migrate sneakers from accessories to Footwear category
UPDATE public.products
SET category_id = 'c1000000-0000-0000-0000-000000000010'
WHERE (slug ILIKE '%sneaker%' OR slug ILIKE '%kicks%' OR slug ILIKE '%shoe%' OR name ILIKE '%sneaker%' OR name ILIKE '%kicks%')
  AND (category_id = 'c1000000-0000-0000-0000-000000000006' OR category_id IS NULL);

-- 4. Set Monochrome Kicks campaign banner image if not set
UPDATE public.collections
SET banner_image_url = 'https://gcolfeickvmvgxjviplx.supabase.co/storage/v1/object/public/product-images/products/prod-1791666473871-9isu30-bubble-boom-black-white-chunky-sneaker.png'
WHERE slug = 'bubble-boom-monochrome-kicks' AND (banner_image_url IS NULL OR banner_image_url = '');
