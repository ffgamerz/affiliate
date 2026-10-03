-- Migration: add per-platform publish status to videos
-- Status values: 'publish' | 'schedule' | 'draft'  (NULL = blank / not set)
-- Run this in the Supabase SQL Editor

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS youtube_status   TEXT CHECK (youtube_status   IN ('publish','schedule','draft')),
  ADD COLUMN IF NOT EXISTS tiktok_status    TEXT CHECK (tiktok_status    IN ('publish','schedule','draft')),
  ADD COLUMN IF NOT EXISTS facebook_status  TEXT CHECK (facebook_status  IN ('publish','schedule','draft')),
  ADD COLUMN IF NOT EXISTS instagram_status TEXT CHECK (instagram_status IN ('publish','schedule','draft')),
  ADD COLUMN IF NOT EXISTS shopee_status    TEXT CHECK (shopee_status    IN ('publish','schedule','draft')),
  ADD COLUMN IF NOT EXISTS threads_status   TEXT CHECK (threads_status   IN ('publish','schedule','draft'));

COMMENT ON COLUMN videos.youtube_status   IS 'YouTube status: publish / schedule / draft (NULL = blank)';
COMMENT ON COLUMN videos.tiktok_status    IS 'TikTok status: publish / schedule / draft (NULL = blank)';
COMMENT ON COLUMN videos.facebook_status  IS 'Facebook status: publish / schedule / draft (NULL = blank)';
COMMENT ON COLUMN videos.instagram_status IS 'Instagram status: publish / schedule / draft (NULL = blank)';
COMMENT ON COLUMN videos.shopee_status    IS 'Shopee status: publish / schedule / draft (NULL = blank)';
COMMENT ON COLUMN videos.threads_status   IS 'Threads status: publish / schedule / draft (NULL = blank)';

-- Indexes to speed up the status filter (find videos with schedule / draft)
CREATE INDEX IF NOT EXISTS idx_videos_youtube_status   ON videos(youtube_status);
CREATE INDEX IF NOT EXISTS idx_videos_tiktok_status    ON videos(tiktok_status);
CREATE INDEX IF NOT EXISTS idx_videos_facebook_status  ON videos(facebook_status);
CREATE INDEX IF NOT EXISTS idx_videos_instagram_status ON videos(instagram_status);
CREATE INDEX IF NOT EXISTS idx_videos_shopee_status    ON videos(shopee_status);
CREATE INDEX IF NOT EXISTS idx_videos_threads_status   ON videos(threads_status);