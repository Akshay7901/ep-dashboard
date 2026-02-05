-- Allow Reviewer 1 to insert proposals (for lazy sync from API)
CREATE POLICY "Reviewer 1 can insert proposals for sync" 
ON public.proposals 
FOR INSERT 
WITH CHECK (is_reviewer_1());

-- Also allow Reviewer 2 to trigger sync when needed (e.g., when adding comments)
-- Actually, since we need both reviewers to be able to trigger sync, let's use is_reviewer()
DROP POLICY IF EXISTS "Reviewer 1 can insert proposals for sync" ON public.proposals;

CREATE POLICY "Reviewers can insert proposals for sync" 
ON public.proposals 
FOR INSERT 
WITH CHECK (is_reviewer());