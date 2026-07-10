-- Update created_at dengan tiktok_upload_date
-- Run this in Supabase SQL editor

UPDATE videos 
SET created_at = tiktok_upload_date
WHERE tiktok_upload_date IS NOT NULL;

-- Jika mahu update semua rekod (termasuk yang NULL), gunakan:
-- UPDATE videos 
-- SET created_at = COALESCE(tiktok_upload_date, CURRENT_DATE);

-- Semak data yang telah diupdate
SELECT id, title, created_at, tiktok_upload_date 
FROM videos 
ORDER BY created_at DESC, id DESC
LIMIT 10;