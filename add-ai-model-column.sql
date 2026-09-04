-- Migration: Add ai_model column to profiles table
-- Stores the AI model name used for description generation (e.g. gemini-2.5-flash)
-- Run this in Supabase SQL editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gemini-3.6-flash';

-- Set default model for any rows that have NULL
UPDATE profiles SET ai_model = 'gemini-3.6-flash' WHERE ai_model IS NULL;

-- Verify
SELECT id, ai_model FROM profiles;
