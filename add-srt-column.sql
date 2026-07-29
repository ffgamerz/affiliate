-- Migration: Add `srt` column to videos table for storing SRT/subtitle content
-- Run this in Supabase SQL editor
-- Also ensure `description` column exists (should already exist from migrations.sql)

ALTER TABLE videos ADD COLUMN IF NOT EXISTS srt TEXT;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'videos' 
  AND column_name IN ('srt', 'description');
