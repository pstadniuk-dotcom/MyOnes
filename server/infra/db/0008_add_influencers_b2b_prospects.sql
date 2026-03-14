-- Influencer Management
CREATE TABLE IF NOT EXISTS influencers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  handle TEXT,
  platform TEXT NOT NULL,
  follower_count INTEGER,
  engagement_rate DECIMAL(5,2),
  niche TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  agreement_type TEXT,
  commission_percent INTEGER,
  promo_code TEXT UNIQUE,
  contract_start_date TIMESTAMP,
  contract_end_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'prospect',
  total_signups INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents INTEGER NOT NULL DEFAULT 0,
  total_commission_cents INTEGER NOT NULL DEFAULT 0,
  last_post_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS influencers_status_idx ON influencers(status);
CREATE INDEX IF NOT EXISTS influencers_platform_idx ON influencers(platform);
CREATE INDEX IF NOT EXISTS influencers_promo_code_idx ON influencers(promo_code);

-- Influencer Content Tracking
CREATE TABLE IF NOT EXISTS influencer_content (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id VARCHAR NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT,
  expected_date TIMESTAMP,
  published_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS influencer_content_influencer_idx ON influencer_content(influencer_id);

-- B2B Medical Prospecting
CREATE TABLE IF NOT EXISTS b2b_prospects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_name TEXT NOT NULL,
  practice_type TEXT NOT NULL,
  specialty TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  primary_contact_name TEXT,
  primary_contact_title TEXT,
  primary_contact_email TEXT,
  lead_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT,
  provider_count INTEGER,
  contacted_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS b2b_prospects_status_idx ON b2b_prospects(status);
CREATE INDEX IF NOT EXISTS b2b_prospects_type_idx ON b2b_prospects(practice_type);
CREATE INDEX IF NOT EXISTS b2b_prospects_state_idx ON b2b_prospects(state);
CREATE INDEX IF NOT EXISTS b2b_prospects_lead_score_idx ON b2b_prospects(lead_score);

-- B2B Outreach Tracking
CREATE TABLE IF NOT EXISTS b2b_outreach (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id VARCHAR NOT NULL REFERENCES b2b_prospects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,
  outcome TEXT,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS b2b_outreach_prospect_idx ON b2b_outreach(prospect_id);
