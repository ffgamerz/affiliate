-- Migration: Create videos table with platform URL columns
-- Run this in Supabase SQL editor

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at DATE DEFAULT CURRENT_DATE,
  tiktok_url TEXT,
  tiktok_upload_date DATE,
  tiktok_product_url TEXT,
  youtube_url TEXT,
  youtube_upload_date DATE,
  facebook_url TEXT,
  facebook_upload_date DATE,
  instagram_url TEXT,
  instagram_upload_date DATE,
  shopee_url TEXT,
  shopee_upload_date DATE,
  shopee_product_url TEXT,
  threads_url TEXT,
  threads_upload_date DATE
);

-- Disable RLS for public access (run this if you want all data to be accessible)
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled, add a policy for public access:
-- ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public access" ON videos FOR ALL USING (true);
-- CREATE POLICY "Allow public insert" ON videos FOR INSERT WITH CHECK (true);

-- Reuploads table - dynamic, 1 row per platform per reupload
CREATE TABLE IF NOT EXISTS reuploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT,
  upload_date DATE,
  notes TEXT,
  created_at DATE DEFAULT CURRENT_DATE
);

-- Enable RLS and allow authenticated users full access
ALTER TABLE reuploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users all operations on reuploads"
  ON reuploads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Performance indexes for common filter columns
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_upload_date ON videos(youtube_upload_date);
CREATE INDEX IF NOT EXISTS idx_videos_tiktok_upload_date ON videos(tiktok_upload_date);
CREATE INDEX IF NOT EXISTS idx_videos_facebook_upload_date ON videos(facebook_upload_date);
CREATE INDEX IF NOT EXISTS idx_videos_instagram_upload_date ON videos(instagram_upload_date);
CREATE INDEX IF NOT EXISTS idx_videos_shopee_upload_date ON videos(shopee_upload_date);
CREATE INDEX IF NOT EXISTS idx_videos_threads_upload_date ON videos(threads_upload_date);
CREATE INDEX IF NOT EXISTS idx_reuploads_video_id ON reuploads(video_id);
CREATE INDEX IF NOT EXISTS idx_reuploads_upload_date ON reuploads(upload_date);

-- Additional indexes for stat card queries (platform + upload_date combinations)
CREATE INDEX IF NOT EXISTS idx_reuploads_platform_date ON reuploads(platform, upload_date);
CREATE INDEX IF NOT EXISTS idx_reuploads_video_platform_date ON reuploads(video_id, platform, upload_date);
