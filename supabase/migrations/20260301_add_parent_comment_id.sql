-- Add parent_comment_id column to comments table for nested replies
-- This migration enables threaded comment functionality

-- Add the parent_comment_id column to comments table if it doesn't exist
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for faster lookups of replies
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_comment_id);

-- Create index for comments by post_id and parent_comment_id combination for efficient filtering
CREATE INDEX IF NOT EXISTS idx_comments_post_parent ON public.comments(post_id, parent_comment_id);
