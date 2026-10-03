-- Migration: set status = 'publish' for all existing platforms that already have a URL
-- Run AFTER supabase/20261003_add_video_status.sql (status columns must exist first)
-- Run this in the Supabase SQL Editor
--
-- A platform is treated as "publish" when its URL column has a real link:
--   - not NULL
--   - not empty / whitespace
--   - not the placeholder words 'schedule' / 'draft'
-- Rows without a URL are left untouched (status stays NULL = blank).

UPDATE videos
SET youtube_status = 'publish'
WHERE youtube_url IS NOT NULL
  AND TRIM(youtube_url) <> ''
  AND LOWER(TRIM(youtube_url)) NOT IN ('schedule', 'draft');

UPDATE videos
SET tiktok_status = 'publish'
WHERE tiktok_url IS NOT NULL
  AND TRIM(tiktok_url) <> ''
  AND LOWER(TRIM(tiktok_url)) NOT IN ('schedule', 'draft');

UPDATE videos
SET facebook_status = 'publish'
WHERE facebook_url IS NOT NULL
  AND TRIM(facebook_url) <> ''
  AND LOWER(TRIM(facebook_url)) NOT IN ('schedule', 'draft');

UPDATE videos
SET instagram_status = 'publish'
WHERE instagram_url IS NOT NULL
  AND TRIM(instagram_url) <> ''
  AND LOWER(TRIM(instagram_url)) NOT IN ('schedule', 'draft');

UPDATE videos
SET shopee_status = 'publish'
WHERE shopee_url IS NOT NULL
  AND TRIM(shopee_url) <> ''
  AND LOWER(TRIM(shopee_url)) NOT IN ('schedule', 'draft');

UPDATE videos
SET threads_status = 'publish'
WHERE threads_url IS NOT NULL
  AND TRIM(threads_url) <> ''
  AND LOWER(TRIM(threads_url)) NOT IN ('schedule', 'draft');

-- Optional: verify the result
-- SELECT id, title,
--        youtube_status, tiktok_status, facebook_status,
--        instagram_status, shopee_status, threads_status
-- FROM videos
-- ORDER BY created_at DESC;