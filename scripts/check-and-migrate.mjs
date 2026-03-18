import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check what columns exist in users table
  const { rows: userCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`
  );
  const existing = new Set(userCols.map(r => r.column_name));
  console.log('Existing users columns:', [...existing].join(', '));

  // Columns that might be missing from the audit branch
  const migrations = [];

  if (!existing.has('utm_source')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_source text`);
  }
  if (!existing.has('utm_medium')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_medium text`);
  }
  if (!existing.has('utm_campaign')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_campaign text`);
  }
  if (!existing.has('utm_content')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_content text`);
  }
  if (!existing.has('utm_term')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_term text`);
  }
  if (!existing.has('referral_code')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text`);
  }
  if (!existing.has('referred_by')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by text`);
  }
  if (!existing.has('referrer_url')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_url text`);
  }
  if (!existing.has('landing_page')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS landing_page text`);
  }
  if (!existing.has('failed_login_attempts')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0`);
  }
  if (!existing.has('locked_until')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamp`);
  }
  if (!existing.has('deleted_at')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamp`);
  }
  if (!existing.has('deleted_by')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by varchar`);
  }
  if (!existing.has('suspended_at')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at timestamp`);
  }
  if (!existing.has('suspended_by')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by varchar`);
  }
  if (!existing.has('suspended_reason')) {
    migrations.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason text`);
  }

  // Check for refresh_tokens table
  const { rows: tables } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refresh_tokens'`
  );
  if (tables.length === 0) {
    migrations.push(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash text NOT NULL,
      family varchar NOT NULL,
      is_admin boolean DEFAULT false NOT NULL,
      revoked_at timestamp,
      expires_at timestamp NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )`);
    migrations.push(`CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id)`);
    migrations.push(`CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens(family)`);
  }

  // Check for other new tables
  const newTables = [
    'reorder_schedules', 'reorder_recommendations', 'auto_ship_subscriptions',
    'safety_audit_logs', 'formula_warning_acknowledgments', 'notification_log',
    'outreach_prospects', 'outreach_pitches', 'agent_runs',
    'attribution_events', 'referral_conversions', 'traffic_sources', 'campaigns',
    'influencers', 'influencer_campaigns', 'b2b_prospects'
  ];

  const { rows: existingTables } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const existingTableSet = new Set(existingTables.map(r => r.table_name));
  const missingTables = newTables.filter(t => !existingTableSet.has(t));

  if (migrations.length === 0 && missingTables.length === 0) {
    console.log('\n✅ All columns and tables are up to date!');
  } else {
    if (migrations.length > 0) {
      console.log(`\n🔧 Running ${migrations.length} column migrations...`);
      for (const sql of migrations) {
        try {
          await pool.query(sql);
          console.log(`  ✅ ${sql.substring(0, 80)}...`);
        } catch (e) {
          console.error(`  ❌ ${sql.substring(0, 80)}... — ${e.message}`);
        }
      }
    }

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables (need full drizzle-kit push): ${missingTables.join(', ')}`);
      console.log('   These require running drizzle-kit push interactively.');
    }
  }

  // Add unique constraint on referral_code if not exists
  try {
    await pool.query(`ALTER TABLE users ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code)`);
    console.log('  ✅ Added unique constraint on users.referral_code');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('  ✅ Unique constraint on users.referral_code already exists');
    } else {
      console.error(`  ❌ Unique constraint: ${e.message}`);
    }
  }

  console.log('\nDone!');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
