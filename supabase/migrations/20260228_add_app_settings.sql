-- Create app_settings table for global application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all for viewing and updating (adjust based on auth requirements)
CREATE POLICY "Allow all on app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('ads_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
