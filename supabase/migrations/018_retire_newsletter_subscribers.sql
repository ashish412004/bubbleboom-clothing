-- ==============================================================================
-- 018_retire_newsletter_subscribers.sql
-- Optional Cleanup Migration for Bubble Boom Newsletter System Retirement
--
-- IMPORTANT SAFETY NOTE:
-- In accordance with safety rules, this migration is NOT executed automatically.
-- Run this script in the Supabase SQL Editor only after confirming that legacy
-- subscriber records do not need to be archived.
-- ==============================================================================

-- 1. Drop existing Row-Level Security policies on public.newsletter_subscribers
DROP POLICY IF EXISTS "Public can insert newsletter subscriptions" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can request newsletter subscription" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON public.newsletter_subscribers;

-- 2. Drop associated indexes
DROP INDEX IF EXISTS public.uq_newsletter_subscribers_email_lower;
DROP INDEX IF EXISTS public.idx_newsletter_subscribers_confirmation_token;
DROP INDEX IF EXISTS public.idx_newsletter_subscribers_unsubscribe_token;
DROP INDEX IF EXISTS public.idx_newsletter_subscribers_status;
DROP INDEX IF EXISTS public.idx_newsletter_subscribers_is_active;

-- 3. Optionally drop the table (or keep it as an archive by renaming if desired)
-- Uncomment the DROP statement below when ready to permanently remove the table:
-- DROP TABLE IF EXISTS public.newsletter_subscribers;

-- Alternatively, archive before dropping:
-- CREATE TABLE IF NOT EXISTS public.newsletter_subscribers_archive AS 
--   SELECT * FROM public.newsletter_subscribers;
-- DROP TABLE IF EXISTS public.newsletter_subscribers;
