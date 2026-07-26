-- Performance Indexes for query optimization
-- Run this in Supabase SQL editor
-- Only NEW indexes not in original migrations.sql

-- For .in() queries on multiple dates (range-3-9)
-- Query: SELECT id FROM videos WHERE {platform}_upload_date IN ('d1','d2',...)
CREATE INDEX IF NOT EXISTS idx_videos_youtube_upload_date_range ON videos(youtube_upload_date, id);
CREATE INDEX IF NOT EXISTS idx_videos_tiktok_upload_date_range ON videos(tiktok_upload_date, id);
CREATE INDEX IF NOT EXISTS idx_videos_facebook_upload_date_range ON videos(facebook_upload_date, id);
CREATE INDEX IF NOT EXISTS idx_videos_instagram_upload_date_range ON videos(instagram_upload_date, id);
CREATE INDEX IF NOT EXISTS idx_videos_shopee_upload_date_range ON videos(shopee_upload_date, id);
CREATE INDEX IF NOT EXISTS idx_videos_threads_upload_date_range ON videos(threads_upload_date, id);

-- For reuploads IN multiple dates (range-3-9)
-- Query: SELECT video_id FROM reuploads WHERE upload_date IN ('d1','d2',...)
CREATE INDEX IF NOT EXISTS idx_reuploads_upload_date_range ON reuploads(upload_date, video_id);

-- For Shopee week filter with range and ordering
-- Query: SELECT * FROM videos WHERE shopee_upload_date >= 'X' AND <= 'Y' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_videos_shopee_week ON videos(shopee_upload_date, created_at DESC);

-- Verify
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE tablename IN ('videos', 'reuploads', 'bookmarks')
ORDER BY tablename, indexname;