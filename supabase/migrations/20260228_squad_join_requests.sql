-- ============================================================
-- RedZone — Squad Join Requests Table
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Create the squad_join_requests table
-- (The frontend already references this table; this migration makes it official)
CREATE TABLE IF NOT EXISTS public.squad_join_requests (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id   UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Prevent duplicate requests: one user can only have one request per squad
  CONSTRAINT squad_join_requests_squad_user_unique UNIQUE (squad_id, user_id)
);

-- Enable RLS
ALTER TABLE public.squad_join_requests ENABLE ROW LEVEL SECURITY;

-- Open policy (same pattern as rest of the app — no Supabase Auth used)
DROP POLICY IF EXISTS "rz_sjr_all" ON public.squad_join_requests;
CREATE POLICY "rz_sjr_all"
  ON public.squad_join_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime so owners see new requests instantly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'squad_join_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_join_requests;
  END IF;
END$$;

-- ============================================================
-- Done! Table: squad_join_requests
--   (id, squad_id, user_id, status, created_at)
-- ============================================================
