-- Create notifications table for admin-sent notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'global', -- 'global', 'user', 'rank'
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_rank TEXT, -- e.g., 'Heroic', 'Diamond', etc.
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow all for viewing and updating
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON public.notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_rank ON public.notifications(target_rank);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
