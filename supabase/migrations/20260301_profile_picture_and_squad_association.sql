-- Profile Picture and Squad Association Fix
-- Ensures all necessary columns exist for profile pictures and squad associations

-- Ensure users table has profile_picture_url column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create squad_members table if it doesn't exist (for squad associations)
CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_in_squad TEXT DEFAULT 'Member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS squad_members_user_id_idx ON public.squad_members(user_id);
CREATE INDEX IF NOT EXISTS squad_members_squad_id_idx ON public.squad_members(squad_id);

-- Ensure squads table has necessary columns for display
ALTER TABLE public.squads
ADD COLUMN IF NOT EXISTS squad_name TEXT,
ADD COLUMN IF NOT EXISTS squad_username TEXT,
ADD COLUMN IF NOT EXISTS squad_logo TEXT,
ADD COLUMN IF NOT EXISTS team_level TEXT DEFAULT 'T1',
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add RLS policies for squad_members if not exists
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "anyone_can_read_squad_members" ON public.squad_members;
DROP POLICY IF EXISTS "squad_creators_can_manage_members" ON public.squad_members;

-- Create new policies
CREATE POLICY "anyone_can_read_squad_members"
  ON public.squad_members FOR SELECT
  USING (true);

CREATE POLICY "squad_creators_can_insert_members"
  ON public.squad_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.squads
      WHERE squads.id = squad_members.squad_id
      AND squads.created_by = auth.uid()
    )
  );

CREATE POLICY "squad_creators_can_update_members"
  ON public.squad_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.squads
      WHERE squads.id = squad_members.squad_id
      AND squads.created_by = auth.uid()
    )
  );

CREATE POLICY "squad_creators_can_delete_members"
  ON public.squad_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.squads
      WHERE squads.id = squad_members.squad_id
      AND squads.created_by = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.squad_members TO authenticated;
GRANT ALL ON public.squads TO authenticated;
GRANT ALL ON public.users TO authenticated;
