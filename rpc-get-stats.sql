-- RPC Functions for optimized stats fetching
-- Run this in Supabase SQL editor
-- Replaces ~36 separate queries with 6 function calls using GROUP BY + FILTER

-- 1. Get stats for a single date (today/yesterday)
-- Returns: platform, original_count, reupload_count
CREATE OR REPLACE FUNCTION get_stats_single(p_date DATE)
RETURNS TABLE(platform TEXT, original_count BIGINT, reupload_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT
    t.platform,
    CASE t.platform
      WHEN 'youtube' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE youtube_upload_date = p_date)
      WHEN 'tiktok' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE tiktok_upload_date = p_date)
      WHEN 'facebook' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE facebook_upload_date = p_date)
      WHEN 'instagram' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE instagram_upload_date = p_date)
      WHEN 'shopee' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE shopee_upload_date = p_date)
      WHEN 'threads' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE threads_upload_date = p_date)
    END AS original_count,
    COALESCE((SELECT COUNT(*)::BIGINT FROM reuploads WHERE platform = t.platform AND upload_date = p_date), 0) AS reupload_count
  FROM (VALUES ('youtube'), ('tiktok'), ('facebook'), ('instagram'), ('shopee'), ('threads')) AS t(platform)
  ORDER BY t.platform;
$$;

-- 2. Get stats for a date range (range-3-9)
CREATE OR REPLACE FUNCTION get_stats_range(p_dates DATE[])
RETURNS TABLE(platform TEXT, original_count BIGINT, reupload_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT
    t.platform,
    CASE t.platform
      WHEN 'youtube' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE youtube_upload_date = ANY(p_dates))
      WHEN 'tiktok' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE tiktok_upload_date = ANY(p_dates))
      WHEN 'facebook' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE facebook_upload_date = ANY(p_dates))
      WHEN 'instagram' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE instagram_upload_date = ANY(p_dates))
      WHEN 'shopee' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE shopee_upload_date = ANY(p_dates))
      WHEN 'threads' THEN (SELECT COUNT(*)::BIGINT FROM videos WHERE threads_upload_date = ANY(p_dates))
    END AS original_count,
    COALESCE((SELECT COUNT(*)::BIGINT FROM reuploads WHERE platform = t.platform AND upload_date = ANY(p_dates)), 0) AS reupload_count
  FROM (VALUES ('youtube'), ('tiktok'), ('facebook'), ('instagram'), ('shopee'), ('threads')) AS t(platform)
  ORDER BY t.platform;
$$;

-- 3. Get total unique video count for a single date
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