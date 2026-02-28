npx supabase login-- ============================================================
-- RedZone — Clean Messaging Rebuild Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Drop old tables we no longer need
DROP TABLE IF EXISTS public.squad_requests CASCADE;

-- 2. Drop stale columns from messages
--    (these columns were added in old migrations and are no longer used)
ALTER TABLE public.messages DROP COLUMN IF EXISTS receiver_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS chat_type;
ALTER TABLE public.messages DROP COLUMN IF EXISTS squad_id;

-- 3. Rename content → message_text (new clean column name)
--    Guard: only rename if content column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'content'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN content TO message_text;
  END IF;
END$$;

-- 4. Make sure message_text is NOT NULL
ALTER TABLE public.messages ALTER COLUMN message_text SET NOT NULL;

-- 5. Make sure chat_id is NOT NULL (every message must belong to a chat)
ALTER TABLE public.messages ALTER COLUMN chat_id SET NOT NULL;

-- 6. Ensure unique constraint on chats (user1, user2)
--    (was already added in earlier migration, this is idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'chats'
      AND constraint_name = 'chats_user1_id_user2_id_key'
  ) THEN
    ALTER TABLE public.chats ADD CONSTRAINT chats_user1_id_user2_id_key UNIQUE (user1_id, user2_id);
  END IF;
END$$;

-- 7. RLS — enable and create open dev policies
ALTER TABLE public.chats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "Allow all on chats"    ON public.chats;
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;

CREATE POLICY "rz_chats_select"   ON public.chats    FOR SELECT USING (true);
CREATE POLICY "rz_chats_insert"   ON public.chats    FOR INSERT WITH CHECK (true);
CREATE POLICY "rz_messages_select" ON public.messages FOR SELECT USING (true);
CREATE POLICY "rz_messages_insert" ON public.messages FOR INSERT WITH CHECK (true);

-- 8. Enable realtime (idempotent — safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;
END$$;

-- ============================================================
-- Done! Tables are now:
--   chats    (id, user1_id, user2_id, created_at)
--   messages (id, chat_id, sender_id, message_text, created_at)
-- ============================================================
