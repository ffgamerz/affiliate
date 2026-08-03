-- Migration: Campaign Day tables (campaigns + campaign_tiers)
-- Run this in Supabase SQL editor

-- Campaigns table - defines a campaign with repeat cadence and date range
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  repeat_interval TEXT NOT NULL CHECK (repeat_interval IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE,
  track_history BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign tiers table - tier thresholds within each period of a campaign
CREATE TABLE IF NOT EXISTS campaign_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tier_number INT NOT NULL,
  target_videos INT NOT NULL,
  reward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, tier_number)
);

-- Enable RLS and allow authenticated users full access (consistent with reuploads / bolreview_uploads)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users all operations on campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on campaign_tiers"
  ON campaign_tiers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_campaign_tiers_campaign_id ON campaign_tiers(campaign_id);
