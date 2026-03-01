-- Comprehensive RLS Policies for Posts and Related Tables
-- This migration ensures authenticated users can create, read, and interact with posts

-- Enable RLS on all necessary tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old generic policies
DROP POLICY IF EXISTS "Allow all on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow all on comments" ON public.comments;
DROP POLICY IF EXISTS "Allow all on post_likes" ON public.post_likes;

-- ═════════════════════════════ POSTS POLICIES ═════════════════════════════
-- Anyone can read posts
CREATE POLICY "posts_public_read"
  ON public.posts FOR SELECT
  USING (true);

-- Authenticated users can create posts
CREATE POLICY "posts_authenticated_create"
  ON public.posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "posts_user_update"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "posts_user_delete"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- ═════════════════════════════ COMMENTS POLICIES ═════════════════════════════
-- Anyone can read comments
CREATE POLICY "comments_public_read"
  ON public.comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "comments_authenticated_create"
  ON public.comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "comments_user_update"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "comments_user_delete"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ═════════════════════════════ POST LIKES POLICIES ═════════════════════════════
-- Anyone can read post likes
CREATE POLICY "post_likes_public_read"
  ON public.post_likes FOR SELECT
  USING (true);

-- Authenticated users can like posts
CREATE POLICY "post_likes_authenticated_create"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "post_likes_user_delete"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ═════════════════════════════ USERS PROFILE POLICIES ═════════════════════════════
-- Anyone can read user profiles (public display)
CREATE POLICY "users_public_read"
  ON public.users FOR SELECT
  USING (true);

-- Authenticated users can update their own profile
CREATE POLICY "users_self_update"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
