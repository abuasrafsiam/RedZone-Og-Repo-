
-- Create chats table for direct messaging
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);

-- Add chat_id column to messages, make old columns nullable
ALTER TABLE public.messages ADD COLUMN chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE;

-- Enable realtime for chats
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
