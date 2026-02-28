
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_name TEXT NOT NULL,
  required_rank TEXT NOT NULL DEFAULT 'Bronze',
  looking_for_role TEXT NOT NULL DEFAULT 'Any',
  language TEXT NOT NULL DEFAULT 'English',
  play_time TEXT NOT NULL DEFAULT 'Anytime',
  description TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.squad_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on squads" ON public.squads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on squad_join_requests" ON public.squad_join_requests FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_join_requests;
