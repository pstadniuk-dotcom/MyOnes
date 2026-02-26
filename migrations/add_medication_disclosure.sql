-- Migration: Add medication disclosure tracking
-- Run this against Supabase before deploying the medication disclosure feature.
-- Safe to run multiple times (all statements are idempotent).

-- 1. Add 'medication_disclosure' to the consent_type enum
DO $$ BEGIN
  ALTER TYPE consent_type ADD VALUE IF NOT EXISTS 'medication_disclosure';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add medication_disclosed_at timestamp to health_profiles
--    NULL  = user has never answered the medication question
--    timestamp = date/time they confirmed their medication list
ALTER TABLE health_profiles
  ADD COLUMN IF NOT EXISTS medication_disclosed_at TIMESTAMP;
