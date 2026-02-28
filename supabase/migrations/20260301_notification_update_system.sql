-- Update notifications table with new fields for the notification system
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_label TEXT DEFAULT 'Learn More';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'; -- 'low', 'normal', 'high', 'urgent'
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS icon_type TEXT DEFAULT 'info'; -- 'info', 'warning', 'success', 'error'

-- Create app_versions table for version control and updates
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_code INTEGER NOT NULL UNIQUE,
  version_name TEXT NOT NULL,
  update_message TEXT NOT NULL,
  download_url TEXT NOT NULL,
  force_update BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on app_versions
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Allow all to view app_versions
CREATE POLICY "Allow all to view app_versions" ON public.app_versions FOR SELECT USING (true);

-- Allow authenticated users to view (for checking updates)
CREATE POLICY "Allow all on app_versions" ON public.app_versions FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_versions;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_app_versions_active ON public.app_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_app_versions_version_code ON public.app_versions(version_code);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON public.notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Insert a default current app version
INSERT INTO public.app_versions (version_code, version_name, update_message, download_url, force_update, is_active)
VALUES (1, '1.0.0', 'Welcome to RedZone Gaming!', 'https://github.com/abuasrafsiam/RedZone-Og-Repo-', false, true)
ON CONFLICT (version_code) DO NOTHING;
