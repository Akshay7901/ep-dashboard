-- Drop the existing policy
DROP POLICY IF EXISTS "Reviewer 1 can update non-locked proposals" ON public.proposals;

-- Create new policy that allows Reviewer 1 to update proposals that are not currently locked
-- The key fix: WITH CHECK should allow the final state to be 'locked' (to enable locking)
-- but prevent updates on already-locked proposals
CREATE POLICY "Reviewer 1 can update non-locked proposals" 
ON public.proposals 
FOR UPDATE 
USING (is_reviewer_1() AND (status <> 'locked'::proposal_status))
WITH CHECK (is_reviewer_1());