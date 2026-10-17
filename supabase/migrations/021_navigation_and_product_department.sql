-- Migration 021: Admin-Controlled Navigation Menu System & Product Department
-- Adds department field to products and initializes navigation settings

-- 1. Safely add department column to products if not exists
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'unisex';

-- Create an index on department and is_published for fast filtering
CREATE INDEX IF NOT EXISTS idx_products_department 
ON public.products (department, is_published, is_active);

-- 2. Create navigation_items table for relational integrity
CREATE TABLE IF NOT EXISTS public.navigation_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'link',
  url TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  show_on_desktop BOOLEAN NOT NULL DEFAULT true,
  show_on_mobile BOOLEAN NOT NULL DEFAULT true,
  auto_hide_empty BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  target TEXT DEFAULT '_self',
  dropdown_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on navigation_items
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

-- Public can read enabled navigation items
CREATE POLICY "Public navigation items select"
  ON public.navigation_items FOR SELECT
  USING (true);

-- Admins can manage all navigation items
CREATE POLICY "Admins manage navigation items"
  ON public.navigation_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 3. Seed navigation default into store_settings if not present
INSERT INTO public.store_settings (key, value, description)
VALUES (
  'navigation',
  '{
    "items": [
      {
        "id": "nav-shop-all",
        "name": "Shop All",
        "type": "link",
        "url": "/shop",
        "sort_order": 1,
        "is_visible": true,
        "show_on_desktop": true,
        "show_on_mobile": true,
        "auto_hide_empty": false,
        "is_default": true
      },
      {
        "id": "nav-new-arrivals",
        "name": "New Arrivals",
        "type": "link",
        "url": "/shop?sort=newest",
        "sort_order": 2,
        "is_visible": true,
        "show_on_desktop": true,
        "show_on_mobile": true,
        "auto_hide_empty": false,
        "is_default": true
      },
      {
        "id": "nav-men",
        "name": "Men",
        "type": "department",
        "url": "/shop?category=men",
        "sort_order": 3,
        "is_visible": true,
        "show_on_desktop": true,
        "show_on_mobile": true,
        "auto_hide_empty": true,
        "is_default": true,
        "dropdown_items": [
          { "id": "sub-men-tshirts", "label": "T-Shirts", "url": "/shop?category=t-shirts&department=men", "sort_order": 1, "is_visible": true, "show_on_desktop": true, "show_on_mobile": true },
          { "id": "sub-men-hoodies", "label": "Hoodies", "url": "/shop?category=hoodies&department=men", "sort_order": 2, "is_visible": true, "show_on_desktop": true, "show_on_mobile": true },
          { "id": "sub-men-cargos", "label": "Cargos", "url": "/shop?category=cargos&department=men", "sort_order": 3, "is_visible": true, "show_on_desktop": true, "show_on_mobile": true },
          { "id": "sub-men-shirts", "label": "Shirts", "url": "/shop?category=shirts&department=men", "sort_order": 4, "is_visible": true, "show_on_desktop": true, "show_on_mobile": true }
        ]
      },
      {
        "id": "nav-women",
        "name": "Women",
        "type": "department",
        "url": "/shop?category=women",
        "sort_order": 4,
        "is_visible": true,
        "show_on_desktop": true,
        "show_on_mobile": true,
        "auto_hide_empty": true,
        "is_default": true,
        "dropdown_items": [
          { "id": "sub-women-tshirts", "label": "T-Shirts", "url": "/shop?category=t-shirts&department=women", "sort_order": 1, "is_visible": true, "show_on_desktop": true, "show_on_mobile": true },
          { "id": "sub-women-hoodies", "label": "Hoodies", "url": "/shop?category=hoodies&department=women", "sort_order": 2, "is_visible": true, "show_on_desktop": true, "show_on_mobile": true }
        ]
      },
      {
        "id": "nav-footwear",
        "name": "Footwear",
        "type": "category",
        "url": "/shop?category=footwear",
        "sort_order": 5,
        "is_visible": true,
        "show_on_desktop": true,
        "show_on_mobile": true,
        "auto_hide_empty": true,
        "is_default": true
      },
      {
        "id": "nav-collections",
        "name": "Collections",
        "type": "collection",
        "url": "/collections",
        "sort_order": 6,
        "is_visible": true,
        "show_on_desktop": true,
        "show_on_mobile": true,
        "auto_hide_empty": false,
        "is_default": true
      },
      {
        "id": "nav-sale",
        "name": "Sale",
        "type": "sale",
        "url": "/shop?sale=true",
        "sort_order": 7,
        "is_visible": true,
        "show_on_desktop": true,
        "show_on_mobile": true,
        "auto_hide_empty": true,
        "is_default": true
      }
    ]
  }'::jsonb,
  'Public storefront header and mobile navigation configuration'
)
ON CONFLICT (key) DO NOTHING;
