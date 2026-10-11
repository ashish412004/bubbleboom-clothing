-- 008_newsletter_subscribers_complete.sql
-- Idempotent schema verification and upgrade for newsletter_subscribers table
-- Ensures columns, unique constraints, and Row Level Security policies are active.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed')),
  confirmation_token TEXT UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_token TEXT UNIQUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  consent_given BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'storefront_footer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case-insensitive unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_email_lower 
  ON public.newsletter_subscribers (LOWER(email));

-- Fast token lookup indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirmation_token 
  ON public.newsletter_subscribers(confirmation_token);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token 
  ON public.newsletter_subscribers(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status 
  ON public.newsletter_subscribers(status);

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Anyone can request newsletter subscription" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON public.newsletter_subscribers;

-- Public inserts restricted to pending status only
CREATE POLICY "Anyone can request newsletter subscription"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (status = 'pending');

-- Only admins can view, update, delete subscriber records directly
CREATE POLICY "Admins can manage newsletter subscriptions"
  ON public.newsletter_subscribers FOR ALL
  USING (
    COALESCE(
      (auth.jwt() ->> 'email') = 'hhshukla241099@gmail.com',
      false
    )
  );
