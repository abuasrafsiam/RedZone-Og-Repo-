
-- Add squad_logo column to squads
ALTER TABLE public.squads ADD COLUMN squad_logo TEXT;

-- Create squad_members table
CREATE TABLE public.squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_in_squad TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);

-- Add squad_id and chat_type to messages
ALTER TABLE public.messages ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN chat_type TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- RLS for squad_members
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on squad_members" ON public.squad_members FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for squad logos
INSERT INTO storage.buckets (id, name, public) VALUES ('squad-logos', 'squad-logos', true);

-- Storage RLS
CREATE POLICY "Allow public read squad logos" ON storage.objects FOR SELECT USING (bucket_id = 'squad-logos');
CREATE POLICY "Allow insert squad logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'squad-logos');

-- Add squad_members to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
