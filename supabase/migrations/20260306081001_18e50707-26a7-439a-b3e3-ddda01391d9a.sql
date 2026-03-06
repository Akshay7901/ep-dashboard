
CREATE TABLE public.assignment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_number)
);

ALTER TABLE public.assignment_notes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (both reviewer roles need access)
CREATE POLICY "Anyone can read assignment notes"
  ON public.assignment_notes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to insert/update (decision reviewer stores notes)
CREATE POLICY "Anyone can insert assignment notes"
  ON public.assignment_notes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update assignment notes"
  ON public.assignment_notes FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete assignment notes"
  ON public.assignment_notes FOR DELETE
  TO anon, authenticated
  USING (true);
