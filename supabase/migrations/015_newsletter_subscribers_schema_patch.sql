-- 015_newsletter_subscribers_schema_patch.sql
-- Safely add missing columns to existing public.newsletter_subscribers table
-- Compatible with legacy (id, email, is_active, subscribed_at) and new schema

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE
);

-- 2. Add columns if not already present
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'storefront_footer',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Synchronize status and is_active columns for existing records
UPDATE public.newsletter_subscribers
  SET status = CASE WHEN is_active = FALSE THEN 'unsubscribed' ELSE 'active' END
  WHERE status IS NULL;

UPDATE public.newsletter_subscribers
  SET is_active = CASE WHEN status = 'unsubscribed' THEN FALSE ELSE TRUE END
  WHERE is_active IS NULL;

UPDATE public.newsletter_subscribers
  SET created_at = subscribed_at
  WHERE created_at IS NULL AND subscribed_at IS NOT NULL;

-- 4. Indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_email_lower 
  ON public.newsletter_subscribers (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirmation_token 
  ON public.newsletter_subscribers(confirmation_token);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token 
  ON public.newsletter_subscribers(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status 
  ON public.newsletter_subscribers(status);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_is_active 
  ON public.newsletter_subscribers(is_active);

-- 5. RLS Policies
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert newsletter subscriptions" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can request newsletter subscription" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON public.newsletter_subscribers;

-- Public can subscribe
CREATE POLICY "Public can insert newsletter subscriptions"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admins can manage newsletter subscriptions"
  ON public.newsletter_subscribers FOR ALL
  USING (
    COALESCE(
      (auth.jwt() ->> 'email') = 'hhshukla241099@gmail.com',
      false
    )
  );
