-- Create role enum
CREATE TYPE public.reviewer_role AS ENUM ('reviewer_1', 'reviewer_2');

-- Create proposal status enum
CREATE TYPE public.proposal_status AS ENUM (
  'submitted',
  'under_review', 
  'approved',
  'finalised',
  'rejected',
  'locked'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role reviewer_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_phone TEXT,
  description TEXT,
  status proposal_status DEFAULT 'submitted' NOT NULL,
  value NUMERIC(12,2),
  contract_sent BOOLEAN DEFAULT false,
  contract_sent_at TIMESTAMP WITH TIME ZONE,
  finalised_at TIMESTAMP WITH TIME ZONE,
  finalised_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create proposal attachments table
CREATE TABLE public.proposal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create reviewer comments table
CREATE TABLE public.reviewer_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT,
  review_form_data JSONB DEFAULT '{}'::jsonb,
  submitted_for_authorization BOOLEAN DEFAULT false,
  is_duplicate_of UUID REFERENCES public.reviewer_comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create workflow logs for audit trail
CREATE TABLE public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_status proposal_status,
  new_status proposal_status,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS reviewer_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Helper function: Check if user is reviewer_1
CREATE OR REPLACE FUNCTION public.is_reviewer_1()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'reviewer_1'
  )
$$;

-- Helper function: Check if user is reviewer_2
CREATE OR REPLACE FUNCTION public.is_reviewer_2()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'reviewer_2'
  )
$$;

-- Helper function: Check if user is any reviewer
CREATE OR REPLACE FUNCTION public.is_reviewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IS NOT NULL
  )
$$;

-- Helper function: Check if proposal is locked
CREATE OR REPLACE FUNCTION public.is_proposal_locked(p_proposal_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals
    WHERE id = p_proposal_id AND status = 'locked'
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Proposals RLS policies
CREATE POLICY "Reviewers can view all proposals"
  ON public.proposals FOR SELECT
  TO authenticated
  USING (public.is_reviewer());

CREATE POLICY "Reviewer 1 can update non-locked proposals"
  ON public.proposals FOR UPDATE
  TO authenticated
  USING (public.is_reviewer_1() AND status != 'locked')
  WITH CHECK (public.is_reviewer_1() AND status != 'locked');

-- Proposal attachments RLS policies
CREATE POLICY "Reviewers can view attachments"
  ON public.proposal_attachments FOR SELECT
  TO authenticated
  USING (public.is_reviewer());

CREATE POLICY "Reviewers can add attachments to non-locked proposals"
  ON public.proposal_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_reviewer() AND 
    NOT public.is_proposal_locked(proposal_id)
  );

-- Reviewer comments RLS policies
CREATE POLICY "Reviewers can view all comments"
  ON public.reviewer_comments FOR SELECT
  TO authenticated
  USING (public.is_reviewer());

CREATE POLICY "Reviewer 1 can create comments on non-locked proposals"
  ON public.reviewer_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_reviewer_1() AND 
    NOT public.is_proposal_locked(proposal_id)
  );

CREATE POLICY "Reviewer 2 can create comments on under review proposals"
  ON public.reviewer_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_reviewer_2() AND 
    EXISTS (
      SELECT 1 FROM public.proposals 
      WHERE id = proposal_id AND status = 'under_review'
    )
  );

CREATE POLICY "Reviewer 1 can update comments on non-locked proposals"
  ON public.reviewer_comments FOR UPDATE
  TO authenticated
  USING (
    public.is_reviewer_1() AND 
    NOT public.is_proposal_locked(proposal_id)
  )
  WITH CHECK (
    public.is_reviewer_1() AND 
    NOT public.is_proposal_locked(proposal_id)
  );

-- Workflow logs RLS policies
CREATE POLICY "Reviewers can view workflow logs"
  ON public.workflow_logs FOR SELECT
  TO authenticated
  USING (public.is_reviewer());

CREATE POLICY "Reviewers can create workflow logs"
  ON public.workflow_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_reviewer());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviewer_comments_updated_at
  BEFORE UPDATE ON public.reviewer_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();