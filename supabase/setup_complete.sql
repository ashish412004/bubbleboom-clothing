-- ==============================================================================
-- BUBBLE BOOM: COMPLETE UNIFIED SUPABASE SETUP & SEED SCHEMA
-- Single-file idempotent script for Supabase SQL Editor
-- Run this script in your Supabase project dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE ENUMS & FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'superadmin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role IN ('admin', 'superadmin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. COLLECTIONS
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_image_url TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  launch_date TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. PRODUCTS, VARIANTS & IMAGES
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  material TEXT,
  fit TEXT,
  wash_care TEXT,
  mrp INTEGER NOT NULL,
  selling_price INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- 8. CARTS & WISHLISTS
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT cart_identity CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wishlist_id, variant_id)
);

-- 9. ORDERS & PAYMENTS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cashfree', 'cod')),
  subtotal INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  shipping_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  coupon_id UUID,
  coupon_discount INTEGER DEFAULT 0,
  billing_address JSONB,
  shipping_address JSONB NOT NULL,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  tracking_number TEXT,
  carrier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  variant_info JSONB NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  mrp INTEGER NOT NULL,
  selling_price INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cashfree_order_id TEXT,
  cf_payment_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  payment_method TEXT NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'released', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  minimum_amount INTEGER DEFAULT 0,
  maximum_discount INTEGER,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. SETTINGS, CONTENT & AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.content_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. INVENTORY & BUSINESS LOGIC PROCEDURES
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  SELECT stock INTO v_current_stock
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  UPDATE public.product_variants
  SET stock = stock - p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_inventory(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.product_variants
  SET stock = stock + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.coupons
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql;

-- 13. AUTH SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. SEED INITIAL STORE CONFIGURATION
INSERT INTO public.store_settings (key, value, description)
VALUES 
(
  'general',
  '{
    "brand_name": "BUBBLE BOOM",
    "tagline": "WEAR THE BOOM",
    "hero_title": "WEAR THE BOOM.",
    "hero_description": "Every style. Every mood. Make it yours.",
    "hero_cta_primary": "SHOP NOW",
    "hero_cta_secondary": "EXPLORE COLLECTIONS",
    "brand_statement": "YOUR STYLE. YOUR RULES.",
    "support_email": "support@bubbleboom.in",
    "currency": "INR",
    "announcement_text": "FREE SHIPPING ON ALL ORDERS ABOVE ₹1,499 | NEW DROPS EVERY FRIDAY",
    "announcement_link": "/shop",
    "announcement_active": true
  }'::JSONB,
  'Store General Settings'
),
(
  'shipping',
  '{
    "free_shipping_threshold_paise": 149900,
    "standard_shipping_paise": 9900,
    "express_shipping_paise": 19900,
    "serviceable_pin_codes": ["*"],
    "cod_enabled": true,
    "cod_fee_paise": 5000,
    "max_cod_amount_paise": 500000
  }'::JSONB,
  'Shipping & Delivery Settings'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 15. SEED INITIAL CATEGORIES
INSERT INTO public.categories (id, name, slug, description, sort_order, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Oversized T-Shirts', 'oversized-tshirts', '240 GSM heavy combed cotton oversized tees with dropped shoulders', 1, true),
  ('c1000000-0000-0000-0000-000000000002', 'Hoodies & Sweatshirts', 'hoodies-sweatshirts', '380 GSM fleece lined hoodies crafted for all-day comfort', 2, true),
  ('c1000000-0000-0000-0000-000000000003', 'Cargo & Bottoms', 'cargo-bottoms', 'Relaxed utility cargos and heavyweight cotton sweatpants', 3, true),
  ('c1000000-0000-0000-0000-000000000004', 'Streetwear Shirts', 'shirts', 'Structured Cuban collar boxy shirts and flannel overshirts', 4, true),
  ('c1000000-0000-0000-0000-000000000005', 'Jackets & Outerwear', 'jackets', 'Tactical windbreakers, coaches jackets, and heavyweight puffers', 5, true),
  ('c1000000-0000-0000-0000-000000000006', 'Accessories', 'accessories', 'Signature star embroidered caps, socks, and canvas totes', 6, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- 16. SEED INITIAL COLLECTIONS
INSERT INTO public.collections (id, name, slug, description, is_visible, sort_order)
VALUES
  ('col10000-0000-0000-0000-000000000001', 'Monochrome Originals', 'monochrome-originals', 'Raw black and stark white foundational silhouettes designed for everyday wear.', true, 1),
  ('col10000-0000-0000-0000-000000000002', 'Urban Essentials', 'urban-essentials', 'Heavyweight boxy cuts with engineered durability and understated star detailing.', true, 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- 17. SEED INITIAL PRODUCTS
INSERT INTO public.products (id, name, slug, description, category_id, material, fit, wash_care, mrp, selling_price, is_published, is_active, tags)
VALUES
  (
    'p1000000-0000-0000-0000-000000000001',
    'Heavyweight Boxy Tee - Pitch Black',
    'heavyweight-boxy-tee-pitch-black',
    'Crafted from 240 GSM 100% combed cotton. Cut in an oversized boxy silhouette with dropped shoulders and reinforced ribbed collar.',
    'c1000000-0000-0000-0000-000000000001',
    '100% Combed Cotton, 240 GSM',
    'Boxy Oversized Fit',
    'Machine wash cold inside out, tumble dry low, do not iron on print',
    1999,
    1299,
    true,
    true,
    ARRAY['tshirt', 'oversized', 'black', 'essential', 'men', 'women']
  ),
  (
    'p1000000-0000-0000-0000-000000000002',
    'Monochrome Star Hoodie',
    'monochrome-star-hoodie',
    '380 GSM diagonal french terry fleece engineered for structured drape. Tonal Bubble Boom star embroidery at left chest.',
    'c1000000-0000-0000-0000-000000000002',
    '100% Cotton French Terry, 380 GSM',
    'Relaxed Drop-Shoulder Fit',
    'Gentle cycle cold, flat dry recommended, warm iron on reverse',
    3499,
    2499,
    true,
    true,
    ARRAY['hoodie', 'sweatshirt', 'black', 'monochrome', 'winter', 'men', 'women']
  ),
  (
    'p1000000-0000-0000-0000-000000000003',
    'Utility Tactical Cargo Pants',
    'utility-tactical-cargo-pants',
    'Relaxed wide-leg cargo pants tailored from rugged ripstop cotton. Features eight functional pockets and adjustable cinch cuffs.',
    'c1000000-0000-0000-0000-000000000003',
    '100% Cotton Ripstop Weave',
    'Relaxed Wide-Leg Straight Cut',
    'Machine wash warm with like colors, tumble dry medium',
    3999,
    2799,
    true,
    true,
    ARRAY['cargo', 'bottoms', 'pants', 'utility', 'black', 'men']
  )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, selling_price = EXCLUDED.selling_price;

-- 18. SEED VARIANTS
INSERT INTO public.product_variants (id, product_id, sku, color, size, stock, is_active)
VALUES
  ('v1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-S', 'Black', 'S', 20, true),
  ('v1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-M', 'Black', 'M', 35, true),
  ('v1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-L', 'Black', 'L', 30, true),
  ('v1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-XL', 'Black', 'XL', 15, true),
  ('v1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000002', 'BB-HOD-BLK-S', 'Black', 'S', 12, true),
  ('v1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000002', 'BB-HOD-BLK-M', 'Black', 'M', 25, true),
  ('v1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000002', 'BB-HOD-BLK-L', 'Black', 'L', 20, true),
  ('v1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000002', 'BB-HOD-BLK-XL', 'Black', 'XL', 10, true),
  ('v1000000-0000-0000-0000-000000000009', 'p1000000-0000-0000-0000-000000000003', 'BB-CRG-BLK-30', 'Black', '30', 15, true),
  ('v1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000003', 'BB-CRG-BLK-32', 'Black', '32', 20, true),
  ('v1000000-0000-0000-0000-000000000011', 'p1000000-0000-0000-0000-000000000003', 'BB-CRG-BLK-34', 'Black', '34', 18, true)
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock;

-- 19. SEED IMAGES
INSERT INTO public.product_images (id, product_id, image_url, alt_text, sort_order)
VALUES
  ('i1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80', 'Heavyweight Boxy Tee Front', 0),
  ('i1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&q=80', 'Monochrome Star Hoodie Front', 0),
  ('i1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&q=80', 'Tactical Cargo Pants Front', 0)
ON CONFLICT (id) DO NOTHING;

-- 20. SEED INITIAL COUPONS
INSERT INTO public.coupons (code, description, discount_type, discount_value, minimum_amount, maximum_discount, is_active)
VALUES
  ('BOOM10', '10% off storewide on orders above ₹999', 'percentage', 10, 999, 500, true),
  ('FIRSTBOOM', '₹200 flat discount on orders above ₹1,499', 'fixed', 200, 1499, 200, true)
ON CONFLICT (code) DO NOTHING;

-- 21. PRODUCT IMAGES STORAGE BUCKET & RLS POLICIES
ALTER TABLE public.product_images 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- 3. Storage RLS Policies for product-images bucket
-- Note: RLS is already enabled on storage.objects by Supabase by default.

DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Read Product Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin Insert Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;
CREATE POLICY "Admin Insert Product Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = (SELECT COALESCE(current_setting('app.admin_email', true), 'hhshukla241099@gmail.com'))
  )
);

DROP POLICY IF EXISTS "Admin Update Product Images" ON storage.objects;
CREATE POLICY "Admin Update Product Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = (SELECT COALESCE(current_setting('app.admin_email', true), 'hhshukla241099@gmail.com'))
  )
);

DROP POLICY IF EXISTS "Admin Delete Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;
CREATE POLICY "Admin Delete Product Images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = (SELECT COALESCE(current_setting('app.admin_email', true), 'hhshukla241099@gmail.com'))
  )
);

-- ==============================================================================
-- SETUP COMPLETE! ALL 21 SECTIONS, PROCEDURES, TRIGGERS & SEED DATA ARE READY.
-- ==============================================================================
