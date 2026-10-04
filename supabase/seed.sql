-- Bubble Boom Development Seed Data
-- Run this in Supabase SQL Editor to populate initial categories, collections, products, variants, banners, and policy pages.

-- 1. STORE SETTINGS
INSERT INTO store_settings (key, value, description)
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
    "support_phone": "+91 98765 43210",
    "currency": "INR",
    "country": "India",
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
),
(
  'orders',
  '{
    "reservation_hold_minutes": 15,
    "return_window_days": 7,
    "cancellation_allowed_states": ["pending", "confirmed"],
    "return_allowed_states": ["delivered"]
  }'::JSONB,
  'Order Rules'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. CATEGORIES
INSERT INTO categories (id, name, slug, description, sort_order, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Oversized T-Shirts', 'oversized-tshirts', '240 GSM heavy combed cotton oversized tees with dropped shoulders', 1, true),
  ('c1000000-0000-0000-0000-000000000002', 'Hoodies & Sweatshirts', 'hoodies-sweatshirts', '380 GSM fleece lined hoodies crafted for all-day comfort', 2, true),
  ('c1000000-0000-0000-0000-000000000003', 'Cargo & Bottoms', 'cargo-bottoms', 'Relaxed utility cargos and heavyweight cotton sweatpants', 3, true),
  ('c1000000-0000-0000-0000-000000000004', 'Streetwear Shirts', 'shirts', 'Structured Cuban collar boxy shirts and flannel overshirts', 4, true),
  ('c1000000-0000-0000-0000-000000000005', 'Jackets & Outerwear', 'jackets', 'Tactical windbreakers, coaches jackets, and heavyweight puffers', 5, true),
  ('c1000000-0000-0000-0000-000000000006', 'Accessories', 'accessories', 'Signature star embroidered caps, socks, and canvas totes', 6, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. COLLECTIONS
INSERT INTO collections (id, name, slug, description, is_visible, sort_order, banner_image_url)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Monochrome Originals', 'monochrome-originals', 'Timeless black, white, and neutral grey silhouettes featuring the iconic Bubble Boom star monogram.', true, 1, '/images/brand/bubble-boom-logo-white.png'),
  ('d1000000-0000-0000-0000-000000000002', 'Urban Essentials Drop', 'urban-essentials', 'Daily rotation staples built with heavy 100% French terry and combed cotton.', true, 2, '/images/brand/bubble-boom-logo-black.png')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- 4. PRODUCTS
INSERT INTO products (id, name, slug, description, category_id, material, fit, wash_care, mrp, selling_price, is_active, is_published, tags)
VALUES
(
  'p1000000-0000-0000-0000-000000000001',
  'Bubble Boom Heavyweight Boxy Tee',
  'bubble-boom-heavyweight-boxy-tee',
  'Crafted from custom 240 GSM 100% French combed cotton. Features the signature Bubble Boom rounded puff print across the front with the iconic 4-point star accent. Dropped shoulder relaxed fit tailored for Indian climate.',
  'c1000000-0000-0000-0000-000000000001',
  '100% French Combed Cotton (240 GSM)',
  'Relaxed Boxy Fit',
  'Machine wash cold inside out, tumble dry low, do not iron on print',
  1999,
  1299,
  true,
  true,
  ARRAY['bestseller', 'oversized', 'tee', 'cotton', 'unisex']
),
(
  'p1000000-0000-0000-0000-000000000002',
  'Starlight Monogram Fleece Hoodie',
  'starlight-monogram-fleece-hoodie',
  'Ultra-plush 380 GSM fleece lined hoodie with high density double-layered hood. Features the embroidered B star monogram on the chest and ribbed heavyweight cuffs.',
  'c1000000-0000-0000-0000-000000000002',
  '100% Cotton Fleece (380 GSM)',
  'Oversized Streetwear Fit',
  'Dry clean or gentle cold machine wash, line dry in shade',
  3499,
  2499,
  true,
  true,
  ARRAY['hoodie', 'winter', 'bestseller', 'heavyweight']
),
(
  'p1000000-0000-0000-0000-000000000003',
  'Tactical Relaxed Cargo Pants',
  'tactical-relaxed-cargo-pants',
  'Engineered with durable cotton ripstop featuring 6 functional utility pockets, adjustable ankle drawcords, and an elasticated waistband with quick-release belt loops.',
  'c1000000-0000-0000-0000-000000000003',
  '98% Cotton Ripstop, 2% Elastane',
  'Relaxed Straight Fit',
  'Machine wash warm with similar darks, hang to dry',
  2999,
  1999,
  true,
  true,
  ARRAY['cargos', 'bottoms', 'pants', 'utility']
),
(
  'p1000000-0000-0000-0000-000000000004',
  'Boom Star Structured Overshirt',
  'boom-star-structured-overshirt',
  'Heavyweight woven cotton twill button-down shirt designed to be styled as a light jacket or standalone top. Clean monochrome buttons and minimal star chest embroidery.',
  'c1000000-0000-0000-0000-000000000004',
  '100% Heavy Twill Cotton',
  'Boxy Overshirt Fit',
  'Cool iron, machine wash cold',
  2799,
  1799,
  true,
  true,
  ARRAY['shirt', 'overshirt', 'layering']
),
(
  'p1000000-0000-0000-0000-000000000005',
  'Acid Washed Vintage Tee',
  'acid-washed-vintage-tee',
  'Individually hand-washed 240 GSM cotton tee creating unique subtle charcoal highs and lows. Subtle tonal Bubble Boom lettering at the nape.',
  'c1000000-0000-0000-0000-000000000001',
  '100% Combed Cotton Vintage Wash',
  'Oversized Drop-Shoulder',
  'Wash separately for first wash, cold gentle cycle',
  1899,
  1199,
  true,
  true,
  ARRAY['vintage', 'acidwash', 'oversized']
),
(
  'p1000000-0000-0000-0000-000000000006',
  'Boom Monogram Embroidered 6-Panel Cap',
  'boom-monogram-embroidered-cap',
  'Structured 6-panel silhouette with curved brim and matte metal brass buckle adjuster. Featuring 3D puff embroidery of the Bubble Boom B-Star monogram.',
  'c1000000-0000-0000-0000-000000000006',
  '100% Cotton Chino Twill',
  'Adjustable Universal Fit',
  'Spot clean with damp cloth only',
  1199,
  799,
  true,
  true,
  ARRAY['cap', 'accessories', 'monogram']
)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  selling_price = EXCLUDED.selling_price,
  mrp = EXCLUDED.mrp,
  is_published = EXCLUDED.is_published,
  is_active = EXCLUDED.is_active;

-- 5. VARIANTS
INSERT INTO product_variants (id, product_id, sku, color, size, stock, is_active)
VALUES
  -- Boxy Tee (Black)
  ('v1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-S', 'Black', 'S', 25, true),
  ('v1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-M', 'Black', 'M', 35, true),
  ('v1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-L', 'Black', 40, true),
  ('v1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-BLK-XL', 'Black', 'XL', 20, true),
  -- Boxy Tee (White)
  ('v1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-WHT-S', 'White', 'S', 15, true),
  ('v1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-WHT-M', 'White', 'M', 30, true),
  ('v1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000001', 'BB-TEE-WHT-L', 'White', 'L', 25, true),
  -- Hoodie (Black)
  ('v1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000002', 'BB-HD-BLK-M', 'Black', 'M', 20, true),
  ('v1000000-0000-0000-0000-000000000009', 'p1000000-0000-0000-0000-000000000002', 'BB-HD-BLK-L', 'Black', 'L', 25, true),
  ('v1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000002', 'BB-HD-BLK-XL', 'Black', 'XL', 15, true),
  -- Cargos (Black)
  ('v1000000-0000-0000-0000-000000000011', 'p1000000-0000-0000-0000-000000000003', 'BB-CRG-BLK-30', 'Black', '30', 15, true),
  ('v1000000-0000-0000-0000-000000000012', 'p1000000-0000-0000-0000-000000000003', 'BB-CRG-BLK-32', 'Black', '32', 20, true),
  ('v1000000-0000-0000-0000-000000000013', 'p1000000-0000-0000-0000-000000000003', 'BB-CRG-BLK-34', 'Black', '34', 18, true),
  -- Overshirt
  ('v1000000-0000-0000-0000-000000000014', 'p1000000-0000-0000-0000-000000000004', 'BB-SHT-BLK-M', 'Black', 'M', 15, true),
  ('v1000000-0000-0000-0000-000000000015', 'p1000000-0000-0000-0000-000000000004', 'BB-SHT-BLK-L', 'Black', 'L', 20, true),
  -- Acid Wash Tee
  ('v1000000-0000-0000-0000-000000000016', 'p1000000-0000-0000-0000-000000000005', 'BB-AVT-CHR-M', 'Charcoal Washed', 'M', 18, true),
  ('v1000000-0000-0000-0000-000000000017', 'p1000000-0000-0000-0000-000000000005', 'BB-AVT-CHR-L', 'Charcoal Washed', 'L', 22, true),
  -- Cap
  ('v1000000-0000-0000-0000-000000000018', 'p1000000-0000-0000-0000-000000000006', 'BB-CAP-BLK-ONE', 'Black', 'One Size', 50, true)
ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock, is_active = EXCLUDED.is_active;

-- 6. PRODUCT IMAGES (Using high resolution development images and brand assets)
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
VALUES
  ('p1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80', 'Bubble Boom Boxy Tee Front', 1),
  ('p1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1000&q=80', 'Bubble Boom Boxy Tee Fit', 2),
  ('p1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&q=80', 'Starlight Fleece Hoodie Black', 1),
  ('p1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=1000&q=80', 'Starlight Fleece Hoodie Detail', 2),
  ('p1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&q=80', 'Tactical Cargo Pants', 1),
  ('p1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80', 'Boom Star Overshirt', 1),
  ('p1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1000&q=80', 'Acid Wash Tee Front', 1),
  ('p1000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1000&q=80', 'Boom Star Embroidered Cap', 1)
ON CONFLICT DO NOTHING;

-- 7. LINK PRODUCTS TO COLLECTIONS
INSERT INTO collection_products (collection_id, product_id, sort_order)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 1),
  ('d1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000002', 2),
  ('d1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000006', 3),
  ('d1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000003', 1),
  ('d1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000004', 2),
  ('d1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000005', 3)
ON CONFLICT DO NOTHING;

-- 8. COUPONS
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_amount, maximum_discount, start_date, expiry_date, usage_limit, per_customer_limit, is_active)
VALUES
  ('BOOM10', '10% off on all orders above ₹999', 'percentage', 10, 999, 500, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days', 1000, 1, true),
  ('FIRSTBOOM', '₹200 flat discount for first time shoppers on orders above ₹1,499', 'fixed', 200, 1499, 200, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days', 500, 1, true)
ON CONFLICT (code) DO NOTHING;

-- 9. CONTENT PAGES
INSERT INTO content_pages (slug, title, content_html, is_published)
VALUES
(
  'about',
  'About Bubble Boom',
  '<h2>WEAR THE BOOM.</h2><p>Born from the pulse of Indian youth culture, BUBBLE BOOM represents unapologetic self-expression, uncompromising quality, and raw creative energy. We craft heavyweight everyday silhouettes built with premium French combed cotton, reinforced seams, and modern relaxed cuts.</p><p>Every garment is designed in India for all genders, prioritizing both silhouette and substance.</p>',
  true
),
(
  'contact',
  'Contact Customer Care',
  '<h2>Get In Touch</h2><p>For order queries, tracking help, or bulk inquiries, reach out to our team:</p><ul><li>Email: support@bubbleboom.in</li><li>WhatsApp & Phone: +91 98765 43210 (Mon-Sat, 10:00 AM - 6:00 PM IST)</li><li>Headquarters: New Delhi, India</li></ul>',
  true
),
(
  'size-guide',
  'Size & Fit Guide',
  '<h2>Fit Philosophy</h2><p>Bubble Boom garments are engineered with relaxed, drop-shoulder proportions. If you prefer a tailored fit, size down one size. For the intended relaxed streetwear silhouette, choose your regular size.</p><h3>T-Shirts (Inches)</h3><table><thead><tr><th>Size</th><th>Chest</th><th>Length</th><th>Shoulder</th></tr></thead><tbody><tr><td>S</td><td>42</td><td>28</td><td>21</td></tr><tr><td>M</td><td>44</td><td>29</td><td>22</td></tr><tr><td>L</td><td>46</td><td>30</td><td>23</td></tr><tr><td>XL</td><td>48</td><td>31</td><td>24</td></tr></tbody></table>',
  true
),
(
  'shipping-policy',
  'Shipping & Delivery Policy',
  '<h2>Delivery Information</h2><p>We ship to all serviceable PIN codes across India via premier express logistics partners.</p><ul><li><strong>Standard Delivery:</strong> 3-5 business days across metro cities; 4-7 days for other regions.</li><li><strong>Free Shipping:</strong> Automatically applied to all orders above ₹1,499.</li><li><strong>Cash on Delivery (COD):</strong> Available for eligible PIN codes with a ₹50 verification handling fee.</li></ul>',
  true
),
(
  'returns-refunds',
  'Returns & Refunds Policy',
  '<h2>7-Day Easy Return Policy</h2><p>Items in their original, unwashed, and unworn condition with tags intact can be returned within 7 days of delivery.</p><ul><li><strong>Return Process:</strong> Request a return directly from your Order Details page.</li><li><strong>Inspection & Restock:</strong> Once received, our inspection team verifies condition within 48 hours.</li><li><strong>Refund Processing:</strong> Prepaid orders are refunded via Cashfree directly to the source payment method within 5-7 business days. COD refunds are processed via customer bank transfer or UPI payout.</li></ul>',
  true
),
(
  'privacy-policy',
  'Privacy Policy',
  '<h2>Your Privacy Matters</h2><p>Bubble Boom respects your privacy. We collect only necessary details (shipping address, email, phone) to fulfill your orders and improve your shopping experience. We never sell your personal information or store card details directly on our servers.</p>',
  true
),
(
  'terms',
  'Terms of Service',
  '<h2>Terms & Conditions</h2><p>By placing an order on Bubble Boom, you agree to our policies. All prices are inclusive of applicable GST. Cashfree Payments serves as our authorized payment provider for all online transactions.</p>',
  true
)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html;
