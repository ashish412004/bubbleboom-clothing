-- Migration 011: Performance Optimization Indexes
-- Created for Bubble Boom e-commerce website speed and query optimization.

-- 1. Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_published_active_created 
  ON products(is_published, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_category_published 
  ON products(category_id, is_published, is_active);

CREATE INDEX IF NOT EXISTS idx_products_slug_active 
  ON products(slug, is_published, is_active);

CREATE INDEX IF NOT EXISTS idx_products_price 
  ON products(selling_price);

-- 2. Variants & Images Indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_lookup 
  ON product_variants(product_id, is_active, stock);

CREATE INDEX IF NOT EXISTS idx_product_variants_size_color 
  ON product_variants(product_id, color, size, is_active);

CREATE INDEX IF NOT EXISTS idx_product_images_lookup 
  ON product_images(product_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_product_images_color 
  ON product_images(product_id, color);

-- 3. Collections & Categories Indexes
CREATE INDEX IF NOT EXISTS idx_collection_products_composite 
  ON collection_products(collection_id, product_id);

CREATE INDEX IF NOT EXISTS idx_collections_slug_visible 
  ON collections(slug, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS idx_categories_slug_active 
  ON categories(slug, is_active, sort_order);

-- 4. Cart & Checkout Indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_id 
  ON carts(user_id);

CREATE INDEX IF NOT EXISTS idx_carts_session_id 
  ON carts(session_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id 
  ON cart_items(cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id 
  ON cart_items(variant_id);

-- 5. Orders & Customer Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
  ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_order_number 
  ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
  ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_addresses_user_default 
  ON addresses(user_id, is_default);
