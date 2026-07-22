-- Migration: Remove UNIQUE constraint to allow multiple uploads per video
-- Run this in Supabase SQL editor

-- Remove the unique constraint on video_id column
ALTER TABLE bolreview_uploads 
DROP CONSTRAINT IF EXISTS bolreview_uploads_video_id_key;

-- Add index for better query performance (keeps the index but without unique constraint)
CREATE INDEX IF NOT EXISTS idx_bolreview_uploads_video_id 
ON bolreview_uploads (video_id);