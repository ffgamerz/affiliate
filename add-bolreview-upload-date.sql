-- Migration: Add upload_date column to bolreview_uploads table
-- Run this in Supabase SQL editor

-- Create bolreview_uploads table if it doesn't exist
CREATE TABLE IF NOT EXISTS bolreview_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  upload_date DATE,
  facebook_url TEXT
);

-- Add upload_date column (DATE type) to bolreview_uploads (if table already exists)
ALTER TABLE bolreview_uploads 
ADD COLUMN IF NOT EXISTS upload_date DATE;

-- Optional: Add index for better query performance on upload_date
CREATE INDEX IF NOT EXISTS idx_bolreview_uploads_upload_date 
ON bolreview_uploads (upload_date);

-- Note: For existing records, upload_date will be NULL
-- You can set a default value if needed, e.g.:
-- UPDATE bolreview_uploads SET upload_date = CURRENT_DATE WHERE upload_date IS NULL;