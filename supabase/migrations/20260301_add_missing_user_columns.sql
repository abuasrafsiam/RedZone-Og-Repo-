-- Safe migration: Add missing columns to users table only if they don't exist
-- This handles cases where the initial schema wasn't correctly applied

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Bronze';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS kd_ratio TEXT DEFAULT '1.0';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Rusher';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS play_time TEXT DEFAULT 'Anytime';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Now update any NULL values to defaults
UPDATE public.users SET rank = 'Bronze' WHERE rank IS NULL;
UPDATE public.users SET kd_ratio = '1.0' WHERE kd_ratio IS NULL;
UPDATE public.users SET role = 'Rusher' WHERE role IS NULL;
UPDATE public.users SET play_time = 'Anytime' WHERE play_time IS NULL;
UPDATE public.users SET language = 'English' WHERE language IS NULL;
UPDATE public.users SET is_vip = false WHERE is_vip IS NULL;
UPDATE public.users SET is_admin = false WHERE is_admin IS NULL;
UPDATE public.users SET is_banned = false WHERE is_banned IS NULL;
