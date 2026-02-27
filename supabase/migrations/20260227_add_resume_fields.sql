-- Add missing resume fields to worker_profiles table
-- Migration: 2026-02-27 Add resume_url, resume_text, resume_parsed, profile_completed columns

ALTER TABLE worker_profiles 
ADD COLUMN IF NOT EXISTS resume_url text,
ADD COLUMN IF NOT EXISTS resume_text text,
ADD COLUMN IF NOT EXISTS resume_parsed jsonb,
ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- Create index on profile_completed for faster queries
CREATE INDEX IF NOT EXISTS idx_worker_profiles_completed ON worker_profiles(profile_completed);
