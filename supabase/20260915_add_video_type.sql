-- Migration: add video_type to videos (voice / no voice)
-- Run in Supabase SQL Editor

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'voice'
  CHECK (video_type IN ('voice', 'no_voice'));

COMMENT ON COLUMN videos.video_type IS 'Video type: voice (ada suara) / no_voice (tiada suara)';
