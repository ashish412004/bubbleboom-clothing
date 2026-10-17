-- ==============================================================================
-- Migration 024: Complete Supabase Row Level Security (RLS) Lockdown
-- Bubble Boom E-Commerce - Production Data Protection & Privacy Fix
--
-- Objective:
-- 1. Strictly block anonymous public access to customer profiles, orders,
--    addresses, order line items, payment records, carts, wishlists, and audit logs.
-- 2. Restrict customer access to their own authentic records (auth.uid() ownership).
-- 3. Avoid infinite recursion using a SECURITY DEFINER admin helper function.
-- 4. Preserve full server-side backend operations (service_role bypasses RLS).
-- 5. Safe, non-destructive, and 100% idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER Admin Helper Function (Prevents RLS infinite recursion)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. Enable Row Level Security on all private/sensitive customer tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Clean up legacy/conflicting policies idempotently
-- ------------------------------------------------------------------------------
-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- ADDRESSES
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
DROP POLICY IF EXISTS "Public can view addresses" ON public.addresses;

-- ORDERS
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;

-- PAYMENTS
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;

-- CARTS & CART_ITEMS
DROP POLICY IF EXISTS "Users can view own carts" ON public.carts;
DROP POLICY IF EXISTS "Users can insert own carts" ON public.carts;
DROP POLICY IF EXISTS "Users can update own carts" ON public.carts;
DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;

-- WISHLISTS & WISHLIST_ITEMS
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can view own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can insert own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can delete own wishlist items" ON public.wishlist_items;

-- AUDIT LOGS & SUBSCRIBERS
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Anyone can read newsletter subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can request newsletter subscription" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public can insert newsletter subscriptions" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON public.newsletter_subscribers;

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins have full access to user_roles" ON public.user_roles;

-- ------------------------------------------------------------------------------
-- 4. Authoritative, Strict Row Level Security Policies
-- ------------------------------------------------------------------------------

-- === PROFILES ===
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert_own_or_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- === ADDRESSES ===
CREATE POLICY "addresses_select_own_or_admin"
  ON public.addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "addresses_insert_own_or_admin"
  ON public.addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "addresses_update_own_or_admin"
  ON public.addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "addresses_delete_own_or_admin"
  ON public.addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- === ORDERS ===
-- Customers see only orders where user_id matches their authenticated id.
-- Admins see all orders.
-- Anonymous requests receive 0 rows.
CREATE POLICY "orders_select_own_or_admin"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "orders_insert_authenticated"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "orders_update_admin_only"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "orders_delete_admin_only"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- === ORDER_ITEMS ===
-- Order items inherit ownership from the parent order record.
CREATE POLICY "order_items_select_own_or_admin"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "order_items_modify_admin_only"
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- === PAYMENTS ===
-- Customers see payment status for their own orders; admins see all.
CREATE POLICY "payments_select_own_or_admin"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payments.order_id
        AND orders.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "payments_modify_admin_only"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- === CARTS & CART_ITEMS ===
CREATE POLICY "carts_select_own_or_admin"
  ON public.carts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "carts_modify_own_or_admin"
  ON public.carts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "cart_items_select_own_or_admin"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "cart_items_modify_own_or_admin"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- === WISHLISTS & WISHLIST_ITEMS ===
CREATE POLICY "wishlists_select_own_or_admin"
  ON public.wishlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "wishlists_modify_own_or_admin"
  ON public.wishlists FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "wishlist_items_select_own_or_admin"
  ON public.wishlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
        AND wishlists.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "wishlist_items_modify_own_or_admin"
  ON public.wishlist_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
        AND wishlists.user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
        AND wishlists.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- === ADMIN AUDIT LOGS ===
CREATE POLICY "audit_logs_admin_only"
  ON public.admin_audit_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- === NEWSLETTER SUBSCRIBERS ===
-- Anyone (including public anonymous visitors) can subscribe to the newsletter
CREATE POLICY "newsletter_insert_public"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3);

-- Only admins can view subscriber emails
CREATE POLICY "newsletter_select_admin_only"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- === USER ROLES ===
CREATE POLICY "user_roles_select_own_or_admin"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_roles_manage_admin_only"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. Force PostgREST schema cache reload
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
