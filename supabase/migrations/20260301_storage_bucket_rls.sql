-- Storage Bucket RLS Policies
-- This migration sets up RLS policies for storage buckets to allow file uploads

-- Create profile-pictures bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create squad-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('squad-logos', 'squad-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create post-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profile_pictures_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_pictures_authenticated_edit" ON storage.objects;
DROP POLICY IF EXISTS "squad_logos_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "squad_logos_authenticated_edit" ON storage.objects;
DROP POLICY IF EXISTS "post_images_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "post_images_authenticated_edit" ON storage.objects;

-- Profile pictures bucket policies
CREATE POLICY "profile_pictures_authenticated_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_authenticated_edit"
  ON storage.objects FOR ALL
  USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');

-- Squad logos bucket policies
CREATE POLICY "squad_logos_authenticated_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'squad-logos');

CREATE POLICY "squad_logos_authenticated_edit"
  ON storage.objects FOR ALL
  USING (bucket_id = 'squad-logos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'squad-logos' AND auth.role() = 'authenticated');

-- Post images bucket policies
CREATE POLICY "post_images_authenticated_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "post_images_authenticated_edit"
  ON storage.objects FOR ALL
  USING (bucket_id = 'post-images' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');
