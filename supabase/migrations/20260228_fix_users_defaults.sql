-- Ensure users table has correct defaults and structure
-- This migration ensures all users have proper rank, role, language, and other fields with defaults

-- Step 1: Update any users with NULL or missing values to use defaults
UPDATE public.users 
SET rank = COALESCE(rank, 'Bronze')
WHERE rank IS NULL;

UPDATE public.users 
SET kd_ratio = COALESCE(kd_ratio, '1.0')
WHERE kd_ratio IS NULL;

UPDATE public.users 
SET role = COALESCE(role, 'Rusher')
WHERE role IS NULL;

UPDATE public.users 
SET language = COALESCE(language, 'English')
WHERE language IS NULL;

UPDATE public.users 
SET play_time = COALESCE(play_time, 'Anytime')
WHERE play_time IS NULL;

UPDATE public.users 
SET is_vip = COALESCE(is_vip, false)
WHERE is_vip IS NULL;

UPDATE public.users 
SET is_admin = COALESCE(is_admin, false)
WHERE is_admin IS NULL;

UPDATE public.users 
SET is_banned = COALESCE(is_banned, false)
WHERE is_banned IS NULL;

-- Step 2: Verify the table structure (show what columns exist)
-- SELECT column_name, data_type, is_nullable, column_default  
-- FROM information_schema.columns  
-- WHERE table_name = 'users' AND table_schema = 'public'  
-- ORDER BY column_name;
