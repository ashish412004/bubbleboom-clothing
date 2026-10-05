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

-- ==============================================================================
-- SETUP COMPLETE! ALL 20 TABLES, PROCEDURES, TRIGGERS & SEED DATA ARE READY.
-- ==============================================================================
