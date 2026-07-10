-- Migration: Add platform URL columns to videos table
-- Run this in Supabase SQL editor

-- Add new columns for each platform
ALTER TABLE videos 
ADD COLUMN youtube_url TEXT,
ADD COLUMN youtube_upload_date DATE,
ADD COLUMN facebook_url TEXT,
ADD COLUMN facebook_upload_date DATE,
ADD COLUMN instagram_url TEXT,
ADD COLUMN instagram_upload_date DATE,
ADD COLUMN shopee_url TEXT,
ADD COLUMN shopee_upload_date DATE,
ADD COLUMN threads_url TEXT,
ADD COLUMN threads_upload_date DATE,
ADD COLUMN tiktok_url TEXT,
ADD COLUMN tiktok_upload_date DATE;

-- Optional: Drop the old video_platforms table if no longer needed
-- Uncomment the line below after migrating existing data
-- DROP TABLE video_platforms;