-- 007_newsletter_double_optin.sql
-- Upgrades newsletter_subscribers table with double opt-in verification tokens,
-- secure status tracking, token expiration, unsubscribe tokens, and strict RLS policies.

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed')),
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create performant lookup indices
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirmation_token ON newsletter_subscribers(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

-- Enable Row Level Security
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Clean up any prior broad policies
DROP POLICY IF EXISTS "Anyone can insert newsletter subscription" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can view newsletter subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can request newsletter subscription" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON newsletter_subscribers;

-- Public users can only insert pending subscriptions
CREATE POLICY "Anyone can request newsletter subscription"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (status = 'pending');

-- Only verified admins can view, search, and manage subscriptions
CREATE POLICY "Admins can manage newsletter subscriptions"
  ON newsletter_subscribers FOR ALL
  USING (public.is_admin());
