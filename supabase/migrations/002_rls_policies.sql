-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ADDRESSES RLS
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CATEGORIES RLS (Public read, Admin write)
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- COLLECTIONS RLS (Public read visible, Admin write)
CREATE POLICY "Public can view visible collections"
  ON collections FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Admins can manage collections"
  ON collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- COLLECTION_PRODUCTS RLS
CREATE POLICY "Public can view collection products"
  ON collection_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE id = collection_id AND is_visible = true
    )
  );

CREATE POLICY "Admins can manage collection products"
  ON collection_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PRODUCTS RLS (Public read published, Admin write)
CREATE POLICY "Public can view published products"
  ON products FOR SELECT
  USING (is_published = true AND is_active = true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PRODUCT_IMAGES RLS
CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE id = product_id AND is_published = true AND is_active = true
    )
  );

CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PRODUCT_VARIANTS RLS
CREATE POLICY "Public can view active product variants"
  ON product_variants FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM products
      WHERE id = product_id AND is_published = true AND is_active = true
    )
  );

CREATE POLICY "Admins can manage product variants"
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INVENTORY_MOVEMENTS RLS (Admin only)
CREATE POLICY "Admins can manage inventory movements"
  ON inventory_movements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CARTS RLS
CREATE POLICY "Users can view own carts"
  ON carts FOR SELECT
  USING (user_id = auth.uid() OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can insert own carts"
  ON carts FOR INSERT
  WITH CHECK (user_id = auth.uid() OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can update own carts"
  ON carts FOR UPDATE
  USING (user_id = auth.uid() OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Admins can view all carts"
  ON carts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CART_ITEMS RLS
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE id = cart_id AND (user_id = auth.uid() OR session_id = current_setting('app.session_id', true))
    )
  );

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE id = cart_id AND (user_id = auth.uid() OR session_id = current_setting('app.session_id', true))
    )
  );

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE id = cart_id AND (user_id = auth.uid() OR session_id = current_setting('app.session_id', true))
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE id = cart_id AND (user_id = auth.uid() OR session_id = current_setting('app.session_id', true))
    )
  );

CREATE POLICY "Admins can view all cart items"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- WISHLISTS RLS
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wishlist"
  ON wishlists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own wishlist"
  ON wishlists FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wishlists"
  ON wishlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- WISHLIST_ITEMS RLS
CREATE POLICY "Users can view own wishlist items"
  ON wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE id = wishlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own wishlist items"
  ON wishlist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE id = wishlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own wishlist items"
  ON wishlist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE id = wishlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all wishlist items"
  ON wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ORDERS RLS
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ORDER_ITEMS RLS
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PAYMENTS RLS
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PAYMENT_EVENTS RLS (Service role only for webhooks)
CREATE POLICY "Service role can manage payment events"
  ON payment_events FOR ALL
  USING (auth.role() = 'service_role');

-- COUPONS RLS (Public read active, Admin write)
CREATE POLICY "Public can view active coupons"
  ON coupons FOR SELECT
  USING (
    is_active = true AND
    start_date <= NOW() AND
    expiry_date >= NOW()
  );

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- COUPON_USAGE RLS
CREATE POLICY "Users can view own coupon usage"
  ON coupon_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all coupon usage"
  ON coupon_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- REVIEWS RLS
CREATE POLICY "Public can view approved reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reviews"
  ON reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RETURNS RLS
CREATE POLICY "Users can view own returns"
  ON returns FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own returns"
  ON returns FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all returns"
  ON returns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update returns"
  ON returns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RETURN_ITEMS RLS
CREATE POLICY "Users can view own return items"
  ON return_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM returns
      WHERE id = return_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all return items"
  ON return_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- SHIPMENTS RLS
CREATE POLICY "Users can view own shipments"
  ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all shipments"
  ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update shipments"
  ON shipments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- SHIPMENT_EVENTS RLS
CREATE POLICY "Users can view own shipment events"
  ON shipment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shipments
      WHERE id = shipment_id AND
      EXISTS (
        SELECT 1 FROM orders
        WHERE id = shipments.order_id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view all shipment events"
  ON shipment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- BANNERS RLS (Public read active, Admin write)
CREATE POLICY "Public can view active banners"
  ON banners FOR SELECT
  USING (
    is_active = true AND
    (start_date IS NULL OR start_date <= NOW()) AND
    (end_date IS NULL OR end_date >= NOW())
  );

CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DROPS RLS (Public read, Admin write)
CREATE POLICY "Public can view drops"
  ON drops FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage drops"
  ON drops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RESTOCK_REQUESTS RLS
CREATE POLICY "Users can insert restock requests"
  ON restock_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all restock requests"
  ON restock_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update restock requests"
  ON restock_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ADMIN_AUDIT_LOGS RLS (Admin only)
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
