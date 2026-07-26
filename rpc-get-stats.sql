-- RPC Functions for optimized stats fetching
-- Run this in Supabase SQL editor
-- Replaces ~36 separate queries with 2 function calls using GROUP BY + FILTER

-- 1. Get stats for a single date (today/yesterday)
-- Returns: platform, original_count, reupload_count
CREATE OR REPLACE FUNCTION get_stats_single(p_date DATE)
RETURNS TABLE(platform TEXT, original_count BIGINT, reupload_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  WITH platform_orig AS (
    SELECT 'youtube'::TEXT AS p, COUNT(*) FILTER (WHERE youtube_upload_date = p_date) AS cnt FROM videos
    UNION ALL SELECT 'tiktok', COUNT(*) FILTER (WHERE tiktok_upload_date = p_date), 0 FROM videos
    UNION ALL SELECT 'facebook', COUNT(*) FILTER (WHERE facebook_upload_date = p_date), 0 FROM videos
    UNION ALL SELECT 'instagram', COUNT(*) FILTER (WHERE instagram_upload_date = p_date), 0 FROM videos
    UNION ALL SELECT 'shopee', COUNT(*) FILTER (WHERE shopee_upload_date = p_date), 0 FROM videos
    UNION ALL SELECT 'threads', COUNT(*) FILTER (WHERE threads_upload_date = p_date), 0 FROM videos
  ),
  reup_counts AS (
    SELECT platform, COUNT(*)::BIGINT AS cnt FROM reuploads WHERE upload_date = p_date GROUP BY platform
  )
  SELECT p AS platform, SUM(po.cnt)::BIGINT AS original_count, COALESCE(rc.cnt, 0)::BIGINT AS reupload_count
  FROM platform_orig po
  LEFT JOIN reup_counts rc ON rc.platform = po.p
  GROUP BY p, rc.cnt
  ORDER BY p;
$$;

-- 2. Get stats for a date range (range-3-9)
-- Returns: platform, original_count, reupload_count
CREATE OR REPLACE FUNCTION get_stats_range(p_dates DATE[])
RETURNS TABLE(platform TEXT, original_count BIGINT, reupload_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  WITH platform_orig AS (
    SELECT 'youtube'::TEXT AS p, COUNT(*) FILTER (WHERE youtube_upload_date = ANY(p_dates)) AS cnt FROM videos
    UNION ALL SELECT 'tiktok', COUNT(*) FILTER (WHERE tiktok_upload_date = ANY(p_dates)), 0 FROM videos
    UNION ALL SELECT 'facebook', COUNT(*) FILTER (WHERE facebook_upload_date = ANY(p_dates)), 0 FROM videos
    UNION ALL SELECT 'instagram', COUNT(*) FILTER (WHERE instagram_upload_date = ANY(p_dates)), 0 FROM videos
    UNION ALL SELECT 'shopee', COUNT(*) FILTER (WHERE shopee_upload_date = ANY(p_dates)), 0 FROM videos
    UNION ALL SELECT 'threads', COUNT(*) FILTER (WHERE threads_upload_date = ANY(p_dates)), 0 FROM videos
  ),
  reup_counts AS (
    SELECT platform, COUNT(*)::BIGINT AS cnt FROM reuploads WHERE upload_date = ANY(p_dates) GROUP BY platform
  )
  SELECT p AS platform, SUM(po.cnt)::BIGINT AS original_count, COALESCE(rc.cnt, 0)::BIGINT AS reupload_count
  FROM platform_orig po
  LEFT JOIN reup_counts rc ON rc.platform = po.p
  GROUP BY p, rc.cnt
  ORDER BY p;
$$;

-- 3. Get total unique video count for a single date (for stat card header)
-- Counts unique video IDs that have any platform upload on that date OR have a reupload on that date
CREATE OR REPLACE FUNCTION get_video_count_single(p_date DATE)
RETURNS TABLE(total_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT COUNT(DISTINCT v.id)::BIGINT
  FROM videos v
  LEFT JOIN reuploads r ON r.video_id = v.id AND r.upload_date = p_date
  WHERE v.youtube_upload_date = p_date
     OR v.tiktok_upload_date = p_date
     OR v.facebook_upload_date = p_date
     OR v.instagram_upload_date = p_date
     OR v.shopee_upload_date = p_date
     OR v.threads_upload_date = p_date
     OR r.id IS NOT NULL;
$$;

-- 4. Get total unique video count for a date range
CREATE OR REPLACE FUNCTION get_video_count_range(p_dates DATE[])
RETURNS TABLE(total_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT COUNT(DISTINCT v.id)::BIGINT
  FROM videos v
  LEFT JOIN reuploads r ON r.video_id = v.id AND r.upload_date = ANY(p_dates)
  WHERE v.youtube_upload_date = ANY(p_dates)
     OR v.tiktok_upload_date = ANY(p_dates)
     OR v.facebook_upload_date = ANY(p_dates)
     OR v.instagram_upload_date = ANY(p_dates)
     OR v.shopee_upload_date = ANY(p_dates)
     OR v.threads_upload_date = ANY(p_dates)
     OR r.id IS NOT NULL;
$$;