-- ============================================================
-- RedZone — Add Squad Messaging Support
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add squad_id column (if it doesn't exist)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE;

-- 2. Add chat_type column to distinguish between direct and squad messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS chat_type TEXT DEFAULT 'direct' 
CHECK (chat_type IN ('direct', 'squad'));

-- 3. Make receiver_id nullable for squad messages (squad messages don't have a single receiver)
ALTER TABLE public.messages
ALTER COLUMN receiver_id DROP NOT NULL;

-- 4. Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies if they exist
DROP POLICY IF EXISTS "rz_messages_select" ON public.messages;
DROP POLICY IF EXISTS "rz_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;

-- 6. Create open policies for development (no auth required)
CREATE POLICY "rz_messages_select"
  ON public.messages
  FOR SELECT
  USING (true);

CREATE POLICY "rz_messages_insert"
  ON public.messages
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "rz_messages_update"
  ON public.messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "rz_messages_delete"
  ON public.messages
  FOR DELETE
  USING (true);

-- 7. Enable realtime for messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END$$;

-- ============================================================
-- Done! Messages table now supports:
--   - Direct messages: chat_id + receiver_id (squad_id = NULL)
--   - Squad messages: chat_id = NULL + squad_id (receiver_id = NULL)
-- ============================================================
