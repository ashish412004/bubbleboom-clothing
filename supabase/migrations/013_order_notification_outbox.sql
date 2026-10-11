-- 013_order_notification_outbox.sql
-- Create dedicated outbox_jobs table for transactional email queueing, delivery audit, and retry management

CREATE TABLE IF NOT EXISTS public.outbox_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'simulated', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  message_id TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Efficient indexing for worker retrieval and admin history logs
CREATE INDEX IF NOT EXISTS idx_outbox_jobs_status ON public.outbox_jobs(status);
CREATE INDEX IF NOT EXISTS idx_outbox_jobs_created_at ON public.outbox_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.outbox_jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on outbox_jobs" ON public.outbox_jobs;
CREATE POLICY "Service role full access on outbox_jobs"
  ON public.outbox_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
