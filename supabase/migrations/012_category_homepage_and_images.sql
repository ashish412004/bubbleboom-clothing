-- Migration 012: Category homepage display settings, auto images, and featured product mapping

-- 1. Add category columns for homepage curation and image automation
ALTER TABLE IF EXISTS public.categories
ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS homepage_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_image BOOLEAN DEFAULT TRUE;

-- 2. Configure default 8 featured categories for the homepage
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 1 WHERE slug = 't-shirts';
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 2 WHERE slug = 'hoodies';
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 3 WHERE slug = 'footwear';
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 4 WHERE slug = 'shirts';
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 5 WHERE slug = 'jeans';
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 6 WHERE slug = 'cargos';
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 7 WHERE slug = 'sweatshirts';
UPDATE public.categories SET show_on_homepage = TRUE, homepage_order = 8 WHERE slug = 'joggers';

-- 3. Ensure other categories are not on homepage by default
UPDATE public.categories SET show_on_homepage = FALSE WHERE slug NOT IN (
  't-shirts', 'hoodies', 'footwear', 'shirts', 'jeans', 'cargos', 'sweatshirts', 'joggers'
);

-- 4. Create index for fast homepage category query
CREATE INDEX IF NOT EXISTS idx_categories_homepage ON public.categories (show_on_homepage, homepage_order) WHERE is_active = TRUE;
