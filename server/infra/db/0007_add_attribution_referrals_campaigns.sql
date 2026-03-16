-- Attribution & UTM tracking columns on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_channel TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id VARCHAR;

CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
CREATE INDEX IF NOT EXISTS users_utm_source_idx ON users(utm_source);
CREATE INDEX IF NOT EXISTS users_signup_channel_idx ON users(signup_channel);

-- Referral events table
CREATE TABLE IF NOT EXISTS referral_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reward_type TEXT,
  reward_amount_cents INTEGER,
  reward_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS referral_events_referrer_idx ON referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS referral_events_referred_idx ON referral_events(referred_user_id);

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  utm_campaign TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  budget_cents INTEGER,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS marketing_campaigns_status_idx ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS marketing_campaigns_channel_idx ON marketing_campaigns(channel);
