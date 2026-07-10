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