-- ============================================================
-- RedZone — Admin Panel System Migration (SIMPLIFIED)
-- Date: March 1, 2026
-- Creates only the essential tables for admin functionality
-- ============================================================

-- ============================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('global', 'user', 'rank')),
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_rank TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  icon_type TEXT NOT NULL DEFAULT 'info' CHECK (icon_type IN ('info', 'success', 'warning', 'error')),
  action_url TEXT,
  action_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on notifications" ON public.notifications;
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON public.notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- 2. APP SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on app_settings" ON public.app_settings;
CREATE POLICY "Allow all on app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);

-- ============================================================
-- 3. ANNOUNCEMENT STATS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcement_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clicked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on announcement_stats" ON public.announcement_stats;
CREATE POLICY "Allow all on announcement_stats" ON public.announcement_stats FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. ADD ADMIN COLUMNS TO USERS (if not exist)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_vip'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_vip BOOLEAN NOT NULL DEFAULT false;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned);
CREATE INDEX IF NOT EXISTS idx_users_is_vip ON public.users(is_vip);

-- ============================================================
-- 5. SEED DEFAULT APP SETTINGS
-- ============================================================
INSERT INTO public.app_settings (key, value) VALUES
  ('app_name', 'RedZone'),
  ('maintenance_mode', 'false'),
  ('primary_color', 'hsl(0,85%,50%)'),
  ('chat_enabled', 'true'),
  ('signup_enabled', 'true'),
  ('ads_enabled', 'true'),
  ('home_banner_text', ''),
  ('popup_message', ''),
  ('signup_ranks', 'Platinum,Diamond,Heroic,Master,Grand Master'),
  ('signup_roles', 'Rusher,Support,Bomber,Sniper')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DONE!
-- ============================================================
-- Tables created:
--   ✓ notifications (with priority, icon_type, action URL support)
--   ✓ app_settings (global configuration)
--   ✓ announcement_stats (analytics)
--   ✓ users enhanced (is_admin, is_banned, is_vip columns)
--
-- All tables have RLS enabled and are synced via realtime
-- ============================================================
