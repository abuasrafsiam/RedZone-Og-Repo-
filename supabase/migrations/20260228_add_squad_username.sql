-- Add squad_username column for unique squad identity
ALTER TABLE public.squads
ADD COLUMN IF NOT EXISTS squad_username TEXT;

-- Create unique constraint on squad_username (case-insensitive)
ALTER TABLE public.squads
ADD CONSTRAINT unique_squad_username UNIQUE (LOWER(squad_username));

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_squads_squad_username ON public.squads(LOWER(squad_username));

-- Add a check constraint to ensure username format
ALTER TABLE public.squads
ADD CONSTRAINT valid_squad_username CHECK (
  squad_username IS NULL OR (
    LENGTH(squad_username) >= 3 AND 
    LENGTH(squad_username) <= 20 AND
    squad_username ~ '^[a-zA-Z0-9_-]+$'
  )
);

-- Add function to automatically lowercase and trim username
CREATE OR REPLACE FUNCTION public.set_squad_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.squad_username IS NOT NULL THEN
    NEW.squad_username := LOWER(TRIM(NEW.squad_username));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set squad_username on insert/update
DROP TRIGGER IF EXISTS squad_username_trigger ON public.squads;
CREATE TRIGGER squad_username_trigger
BEFORE INSERT OR UPDATE ON public.squads
FOR EACH ROW
EXECUTE FUNCTION public.set_squad_username();

