-- Migration 017: Website Performance Optimization, Fast Cart Atomic RPC & Composite Indexes
-- Bubble Boom Performance Engineering

-- 1. High-Performance Composite Indexes for Storefront & Catalog
CREATE INDEX IF NOT EXISTS idx_products_published_active_category
  ON products(is_published, is_active, category_id);

CREATE INDEX IF NOT EXISTS idx_products_slug_published_active
  ON products(slug, is_published, is_active);

CREATE INDEX IF NOT EXISTS idx_categories_slug_active
  ON categories(slug, is_active);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_variant
  ON cart_items(cart_id, variant_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_id_active_stock
  ON product_variants(id, is_active, stock);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wl_variant
  ON wishlist_items(wishlist_id, variant_id);

-- 2. Atomic Add-To-Cart Stored Procedure (Collapses 4 sequential network round-trips into 1 single DB execution)
CREATE OR REPLACE FUNCTION add_to_cart_atomic(
  p_variant_id UUID,
  p_quantity INT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id UUID;
  v_variant RECORD;
  v_existing_qty INT := 0;
  v_new_qty INT;
  v_item_id UUID;
BEGIN
  -- Caller authorization safety check: if invoked directly by non-service_role, prevent arbitrary p_user_id override
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    p_user_id := auth.uid();
  ELSIF current_setting('request.jwt.claim.role', true) = 'anon' THEN
    p_user_id := NULL;
  END IF;

  -- Validate input quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'Quantity must be greater than zero');
  END IF;

  -- 1. Validate variant & product in a single join query
  SELECT v.id, v.stock, v.is_active, p.is_published, p.is_active AS prod_active
  INTO v_variant
  FROM product_variants v
  JOIN products p ON p.id = v.product_id
  WHERE v.id = p_variant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Variant not found');
  END IF;

  IF NOT v_variant.is_active OR NOT v_variant.prod_active OR NOT v_variant.is_published THEN
    RETURN jsonb_build_object('error', 'Product is currently not available');
  END IF;

  -- 2. Find or create cart atomically
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_cart_id FROM carts WHERE user_id = p_user_id LIMIT 1;
    IF v_cart_id IS NULL THEN
      INSERT INTO carts (user_id, session_id, updated_at)
      VALUES (p_user_id, p_session_id, NOW())
      RETURNING id INTO v_cart_id;
    END IF;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT id INTO v_cart_id FROM carts WHERE session_id = p_session_id LIMIT 1;
    IF v_cart_id IS NULL THEN
      INSERT INTO carts (session_id, updated_at)
      VALUES (p_session_id, NOW())
      RETURNING id INTO v_cart_id;
    END IF;
  ELSE
    RETURN jsonb_build_object('error', 'Either user ID or session ID is required');
  END IF;

  -- 3. Check existing quantity for stock limit enforcement
  SELECT quantity INTO v_existing_qty FROM cart_items
  WHERE cart_id = v_cart_id AND variant_id = p_variant_id;

  v_existing_qty := COALESCE(v_existing_qty, 0);
  v_new_qty := v_existing_qty + p_quantity;

  IF v_new_qty > v_variant.stock THEN
    RETURN jsonb_build_object(
      'error', format('Only %s item(s) available in stock.', v_variant.stock),
      'available_stock', v_variant.stock
    );
  END IF;

  -- 4. Atomic Upsert cart item
  INSERT INTO cart_items (cart_id, variant_id, quantity, updated_at)
  VALUES (v_cart_id, p_variant_id, v_new_qty, NOW())
  ON CONFLICT (cart_id, variant_id)
  DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()
  RETURNING id INTO v_item_id;

  -- Update cart updated_at timestamp
  UPDATE carts SET updated_at = NOW() WHERE id = v_cart_id;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_item_id,
      'cart_id', v_cart_id,
      'variant_id', p_variant_id,
      'quantity', v_new_qty
    )
  );
END;
$$;

-- Restrict execution permissions on atomic RPC function to secure service_role
REVOKE EXECUTE ON FUNCTION add_to_cart_atomic(UUID, INT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_to_cart_atomic(UUID, INT, UUID, TEXT) TO service_role;

-- 3. Ensure Carts & Cart Items RLS allow guest session access
DROP POLICY IF EXISTS "Users can view own carts" ON carts;
CREATE POLICY "Users can view own carts"
  ON carts FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can insert own carts" ON carts;
CREATE POLICY "Users can insert own carts"
  ON carts FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can update own carts" ON carts;
CREATE POLICY "Users can update own carts"
  ON carts FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (
        (auth.uid() IS NOT NULL AND carts.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND carts.session_id IS NOT NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (
        (auth.uid() IS NOT NULL AND carts.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND carts.session_id IS NOT NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (
        (auth.uid() IS NOT NULL AND carts.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND carts.session_id IS NOT NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (
        (auth.uid() IS NOT NULL AND carts.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND carts.session_id IS NOT NULL)
      )
    )
  );
