-- Migration 005: Bubble Boom Complete Schema Extensions
-- Implements all missing tables, atomic reservation lifecycle, outbox jobs, content pages, store settings, and role separation.

-- 1. USER ROLES (Separate from profiles to prevent privilege escalation via profile updates)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'superadmin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Security Definer function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. INVENTORY RESERVATIONS TABLE (Atomic checkout reservations with automatic expiry)
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'released', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_variant ON inventory_reservations(variant_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON inventory_reservations(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_reservations_order ON inventory_reservations(order_id);

-- 3. STORE SETTINGS TABLE (Centralized business rules and brand config)
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed default store settings for Bubble Boom
INSERT INTO store_settings (key, value, description)
VALUES 
(
  'general',
  '{
    "brand_name": "BUBBLE BOOM",
    "tagline": "WEAR THE BOOM",
    "support_email": "support@bubbleboom.in",
    "support_phone": "+91 98765 43210",
    "currency": "INR",
    "country": "India"
  }'::JSONB,
  'General brand contact and identification'
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
  'Shipping rates, free delivery thresholds and COD rules'
),
(
  'orders',
  '{
    "reservation_hold_minutes": 15,
    "return_window_days": 7,
    "cancellation_allowed_states": ["pending", "confirmed"],
    "return_allowed_states": ["delivered"]
  }'::JSONB,
  'Order lifecycle, return window and reservation timeout'
)
ON CONFLICT (key) DO NOTHING;

-- 4. CONTENT & POLICY PAGES TABLE (Editable legal, size-guide, and about content)
CREATE TABLE IF NOT EXISTS content_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. NEWSLETTER SUBSCRIBERS TABLE (Explicit consent tracking)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT DEFAULT 'storefront_footer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. DROP PRODUCTS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS drop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(drop_id, product_id)
);

-- 7. REFUNDS TABLE (Detailed Cashfree online and manual COD refund tracking)
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_id UUID REFERENCES returns(id) ON DELETE SET NULL,
  cashfree_refund_id TEXT UNIQUE,
  cf_refund_id TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  refund_type TEXT NOT NULL CHECK (refund_type IN ('cashfree', 'cod_manual', 'store_credit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'manual_review')),
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);

-- 8. OUTBOX JOBS (Transactional Outbox for resilient emails and background processing)
CREATE TABLE IF NOT EXISTS outbox_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_jobs(status, scheduled_at) WHERE status = 'pending';

-- 9. ATOMIC INVENTORY RESERVATION FUNCTIONS
-- Calculates real available stock considering active non-expired reservations
CREATE OR REPLACE FUNCTION get_variant_available_stock(p_variant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_stock_on_hand INTEGER := 0;
  v_reserved INTEGER := 0;
BEGIN
  -- Get physical stock on hand
  SELECT stock INTO v_stock_on_hand
  FROM product_variants
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate active non-expired reserved quantity
  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
  FROM inventory_reservations
  WHERE variant_id = p_variant_id
    AND status = 'active'
    AND expires_at > NOW();

  RETURN GREATEST(0, v_stock_on_hand - v_reserved);
END;
$$ LANGUAGE plpgsql STABLE;

-- Atomically create a stock reservation with row locking
CREATE OR REPLACE FUNCTION reserve_stock_atomic(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_order_id UUID,
  p_session_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_hold_minutes INTEGER DEFAULT 15
)
RETURNS UUID AS $$
DECLARE
  v_stock_on_hand INTEGER;
  v_active_reserved INTEGER;
  v_available INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Lock the variant row to serialize concurrent checkouts
  SELECT stock INTO v_stock_on_hand
  FROM product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found';
  END IF;

  -- Count currently active reservations that have not yet expired
  SELECT COALESCE(SUM(quantity), 0) INTO v_active_reserved
  FROM inventory_reservations
  WHERE variant_id = p_variant_id
    AND status = 'active'
    AND expires_at > NOW();

  v_available := v_stock_on_hand - v_active_reserved;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock: requested %, available %', p_quantity, v_available;
  END IF;

  -- Insert reservation
  INSERT INTO inventory_reservations (
    variant_id,
    quantity,
    order_id,
    session_id,
    user_id,
    status,
    expires_at
  ) VALUES (
    p_variant_id,
    p_quantity,
    p_order_id,
    p_session_id,
    p_user_id,
    'active',
    NOW() + (p_hold_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- Confirm reservation and decrement actual stock upon verified payment
CREATE OR REPLACE FUNCTION confirm_stock_reservation(
  p_order_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, variant_id, quantity
    FROM inventory_reservations
    WHERE order_id = p_order_id AND status = 'active'
    FOR UPDATE
  LOOP
    -- Decrement stock on hand
    UPDATE product_variants
    SET stock = GREATEST(0, stock - r.quantity),
        updated_at = NOW()
    WHERE id = r.variant_id;

    -- Record inventory movement
    INSERT INTO inventory_movements (
      variant_id,
      movement_type,
      quantity,
      reference_id,
      reference_type,
      created_by,
      created_at
    ) VALUES (
      r.variant_id,
      'sale',
      -r.quantity,
      p_order_id,
      'order',
      p_created_by,
      NOW()
    );

    -- Mark reservation confirmed
    UPDATE inventory_reservations
    SET status = 'confirmed',
        updated_at = NOW()
    WHERE id = r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Release reservations for a cancelled/abandoned checkout
CREATE OR REPLACE FUNCTION release_stock_reservation(
  p_order_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory_reservations
  SET status = 'released',
      updated_at = NOW()
  WHERE order_id = p_order_id AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Background cleanup job for expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE inventory_reservations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active' AND expires_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 10. ROW LEVEL SECURITY FOR EXTENDED TABLES
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_jobs ENABLE ROW LEVEL SECURITY;

-- user_roles RLS: Only admins can manage roles, users can view own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to user_roles"
  ON user_roles FOR ALL
  USING (public.is_admin());

-- store_settings RLS: Public read, Admin write
CREATE POLICY "Anyone can read store settings"
  ON store_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update store settings"
  ON store_settings FOR ALL
  USING (public.is_admin());

-- content_pages RLS: Public read published, Admin write
CREATE POLICY "Anyone can read published content pages"
  ON content_pages FOR SELECT
  USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can manage content pages"
  ON content_pages FOR ALL
  USING (public.is_admin());

-- newsletter_subscribers RLS: Anyone can subscribe, Admin can view
CREATE POLICY "Anyone can insert newsletter subscription"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view newsletter subscriptions"
  ON newsletter_subscribers FOR SELECT
  USING (public.is_admin());

-- drop_products RLS: Public read, Admin write
CREATE POLICY "Anyone can read drop products"
  ON drop_products FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage drop products"
  ON drop_products FOR ALL
  USING (public.is_admin());

-- refunds RLS: Users can view own order refunds, Admins can view/edit all
CREATE POLICY "Users can view own order refunds"
  ON refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = refunds.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage refunds"
  ON refunds FOR ALL
  USING (public.is_admin());

-- inventory_reservations RLS: Service role / Admin only
CREATE POLICY "Admins can view reservations"
  ON inventory_reservations FOR SELECT
  USING (public.is_admin());

-- outbox_jobs RLS: Admins only
CREATE POLICY "Admins can view outbox jobs"
  ON outbox_jobs FOR SELECT
  USING (public.is_admin());
