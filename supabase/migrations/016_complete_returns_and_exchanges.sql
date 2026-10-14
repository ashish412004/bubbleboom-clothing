-- Migration 016: Complete Returns, Exchanges, Refunds, and Reverse Pickup System
-- Bubble Boom Streetwear Store

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Returns & Exchanges Master Table
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_reference TEXT UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'return' CHECK (request_type IN ('return', 'exchange')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN (
      'requested',
      'approved',
      'rejected',
      'pickup_scheduled',
      'in_transit',
      'received',
      'inspected',
      'refund_processing',
      'refunded',
      'exchange_dispatched',
      'completed',
      'cancelled'
    )
  ),
  reason TEXT NOT NULL,
  customer_notes TEXT,
  images TEXT[] DEFAULT '{}',
  refund_amount INTEGER NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  refund_status TEXT DEFAULT 'pending' CHECK (
    refund_status IN ('pending', 'processing', 'successful', 'failed', 'manual_review', 'not_applicable')
  ),
  pickup_status TEXT DEFAULT 'pending' CHECK (
    pickup_status IN ('pending', 'scheduled', 'out_for_pickup', 'picked_up', 'failed', 'cancelled')
  ),
  courier_name TEXT,
  reverse_awb TEXT,
  tracking_url TEXT,
  pickup_scheduled_date DATE,
  received_at TIMESTAMP WITH TIME ZONE,
  inspection_result TEXT CHECK (inspection_result IN ('pass', 'fail', 'partial_pass', NULL)),
  restock_decision BOOLEAN DEFAULT TRUE,
  inspection_notes TEXT,
  rejection_reason TEXT,
  bank_details JSONB DEFAULT NULL,
  exchange_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Return & Exchange Line Items Table
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  original_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  exchange_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  inspection_status TEXT DEFAULT 'pending' CHECK (
    inspection_status IN ('pending', 'passed', 'failed', 'restocked', 'discarded')
  ),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Refunds Table (Cashfree & Verified COD Manual Payouts)
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL,
  cashfree_refund_id TEXT UNIQUE,
  cf_refund_id TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  refund_type TEXT NOT NULL CHECK (refund_type IN ('cashfree', 'cod_manual', 'store_credit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'successful', 'failed', 'manual_review')
  ),
  reason TEXT NOT NULL,
  notes TEXT,
  bank_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_returns_order ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_request_type ON public.returns(request_type);
CREATE INDEX IF NOT EXISTS idx_returns_reference ON public.returns(return_reference);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item ON public.return_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_return ON public.refunds(return_id);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Returns Policies
DROP POLICY IF EXISTS "Users can view own returns" ON public.returns;
CREATE POLICY "Users can view own returns"
  ON public.returns FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = returns.order_id AND orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create own returns" ON public.returns;
CREATE POLICY "Users can create own returns"
  ON public.returns FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = returns.order_id AND orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all returns" ON public.returns;
CREATE POLICY "Admins can manage all returns"
  ON public.returns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Return items Policies
DROP POLICY IF EXISTS "Users can view own return items" ON public.return_items;
CREATE POLICY "Users can view own return items"
  ON public.return_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.returns
      WHERE returns.id = return_items.return_id AND (
        returns.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.orders
          WHERE orders.id = returns.order_id AND orders.user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create own return items" ON public.return_items;
CREATE POLICY "Users can create own return items"
  ON public.return_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns
      WHERE returns.id = return_items.return_id AND (
        returns.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.orders
          WHERE orders.id = returns.order_id AND orders.user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all return items" ON public.return_items;
CREATE POLICY "Admins can manage all return items"
  ON public.return_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Refunds Policies
DROP POLICY IF EXISTS "Users can view own order refunds" ON public.refunds;
CREATE POLICY "Users can view own order refunds"
  ON public.refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = refunds.order_id AND orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage refunds" ON public.refunds;
CREATE POLICY "Admins can manage refunds"
  ON public.refunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );
