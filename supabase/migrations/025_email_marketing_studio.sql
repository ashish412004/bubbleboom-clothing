-- ==============================================================================
-- Migration 025: Email Marketing Studio & Customer Marketing Consent Schema
-- Bubble Boom E-Commerce - Production Marketing Campaign Management
--
-- Objective:
-- 1. Add marketing consent fields to customer profiles.
-- 2. Ensure newsletter_subscribers table supports opt-out tracking.
-- 3. Create marketing_campaigns and campaign_recipients tables with full audit fields.
-- 4. Apply strict Row Level Security (RLS) allowing only verified admins.
-- 5. Completely idempotent and pure DDL SQL compatible with Supabase SQL Editor.
-- ==============================================================================

-- 1. Ensure marketing consent columns in public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_marketing_consent 
  ON public.profiles(marketing_consent);

-- 2. Ensure public.newsletter_subscribers has all lifecycle columns
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'signup'
);

ALTER TABLE public.newsletter_subscribers 
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'signup';

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active 
  ON public.newsletter_subscribers(is_active);

-- 3. Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  sender_name TEXT DEFAULT 'Bubble Boom',
  audience_type TEXT DEFAULT 'all_opted_in',
  template_id TEXT DEFAULT 'drop_soon',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status 
  ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at 
  ON public.marketing_campaigns(created_at DESC);

-- 4. Campaign Recipients Tracking Table
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign 
  ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email 
  ON public.campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status 
  ON public.campaign_recipients(status);

-- 5. Row Level Security Policies
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "campaigns_admin_all" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "campaign_recipients_admin_all" ON public.campaign_recipients;

-- Admin-only full access
CREATE POLICY "campaigns_admin_all"
  ON public.marketing_campaigns FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "campaign_recipients_admin_all"
  ON public.campaign_recipients FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
