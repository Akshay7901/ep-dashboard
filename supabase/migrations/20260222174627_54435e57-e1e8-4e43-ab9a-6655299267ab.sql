
-- Drop functions with CASCADE to handle any remaining policy dependencies
DROP FUNCTION IF EXISTS public.is_proposal_locked(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_reviewer_1() CASCADE;
DROP FUNCTION IF EXISTS public.is_reviewer_2() CASCADE;
DROP FUNCTION IF EXISTS public.is_reviewer() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS public.proposal_status CASCADE;
DROP TYPE IF EXISTS public.reviewer_role CASCADE;
