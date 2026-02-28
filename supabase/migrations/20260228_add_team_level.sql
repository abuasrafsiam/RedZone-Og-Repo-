-- Add team_level column to squads table
ALTER TABLE public.squads
ADD COLUMN IF NOT EXISTS team_level TEXT NOT NULL DEFAULT 'T2';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_squads_team_level ON public.squads(team_level);

-- Add constraint to ensure valid team levels
ALTER TABLE public.squads
ADD CONSTRAINT valid_team_level CHECK (team_level IN ('T1', 'T2', 'T3'));
