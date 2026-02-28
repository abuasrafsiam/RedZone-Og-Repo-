-- ============================================================
-- RedZone — Fix Admin Tables (Announcements & Ads)
-- Date: March 1, 2026
-- Ensures announcements and ads tables have required columns
-- ============================================================

-- ============================================================
-- 1. CREATE OR VERIFY ANNOUNCEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add optional columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'target_user_id'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'target_rank'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN target_rank TEXT;
  END IF;
END$$;

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on announcements" ON public.announcements;
CREATE POLICY "Allow all on announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- ============================================================
-- 2. CREATE OR VERIFY ADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  redirect_url TEXT,
  position TEXT NOT NULL DEFAULT 'home',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ads
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ads" ON public.ads;
CREATE POLICY "Allow all on ads" ON public.ads FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
  END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON public.ads(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_position ON public.ads(position);

-- ============================================================
-- 3. ENSURE CHATS TABLE EXISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on chats" ON public.chats;
CREATE POLICY "Allow all on chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;
END$$;

-- ============================================================
-- DONE!
-- ============================================================
-- Tables verified/created:
--   ✓ announcements (with is_active, title, message, created_at)
--   ✓ ads (with is_active, image_url, position)
--   ✓ chats (with user1_id, user2_id)
--
-- All tables have RLS enabled and realtime sync
-- ============================================================
