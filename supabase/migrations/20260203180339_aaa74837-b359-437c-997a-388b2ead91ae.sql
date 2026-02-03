-- Add ticket_number column to proposals table for syncing with external API
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_ticket_number ON public.proposals(ticket_number);