-- 013_email_notification_outbox.sql
-- Dedicated email notification outbox table for reliable transactional order email automation

CREATE TABLE IF NOT EXISTS public.email_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('order_placed', 'order_confirmed', 'order_packed', 'order_shipped', 'out_for_delivery', 'order_delivered', 'order_cancelled', 'refund_completed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  unique_event_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_id TEXT
);

-- Indexes for efficient polling, worker retrieval, and order lookups
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_attempts ON public.email_notification_outbox(status, attempts);
CREATE INDEX IF NOT EXISTS idx_email_outbox_order_id ON public.email_notification_outbox(order_id);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at ON public.email_notification_outbox(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_unique_event ON public.email_notification_outbox(unique_event_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_notification_outbox ENABLE ROW LEVEL SECURITY;

-- 1. Server-side service role has full access
DROP POLICY IF EXISTS "Service role full access on email_notification_outbox" ON public.email_notification_outbox;
CREATE POLICY "Service role full access on email_notification_outbox"
  ON public.email_notification_outbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Authenticated Admins have read and update access
DROP POLICY IF EXISTS "Admins can view email notification outbox" ON public.email_notification_outbox;
CREATE POLICY "Admins can view email notification outbox"
  ON public.email_notification_outbox
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can retry email notifications" ON public.email_notification_outbox;
CREATE POLICY "Admins can retry email notifications"
  ON public.email_notification_outbox
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
