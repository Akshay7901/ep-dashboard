
-- Add column to store assigned reviewer emails locally
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS assigned_reviewer_emails text[] DEFAULT '{}';
