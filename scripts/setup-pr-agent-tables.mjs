import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check which PR Agent tables exist
  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' 
    AND table_name IN ('outreach_prospects','outreach_pitches','agent_runs','app_settings')
  `);
  const existing = new Set(rows.map(r => r.table_name));
  console.log('Existing PR Agent tables:', [...existing].join(', ') || 'NONE');

  // Check for required enums
  const { rows: enums } = await pool.query(`
    SELECT typname FROM pg_type WHERE typname IN (
      'outreach_category','outreach_sub_type','outreach_prospect_status',
      'outreach_contact_method','outreach_pitch_status','agent_run_status'
    )
  `);
  const existingEnums = new Set(enums.map(r => r.typname));
  console.log('Existing enums:', [...existingEnums].join(', ') || 'NONE');

  // Create missing enums
  const enumDefs = [
    { name: 'outreach_category', values: ['podcast', 'press'] },
    { name: 'outreach_sub_type', values: ['podcast_guest', 'product_review', 'guest_article', 'expert_source', 'founder_feature'] },
    { name: 'outreach_prospect_status', values: ['new', 'researching', 'ready', 'pitched', 'responded', 'booked', 'published', 'declined', 'stale'] },
    { name: 'outreach_contact_method', values: ['email', 'form', 'social', 'unknown'] },
    { name: 'outreach_pitch_status', values: ['draft', 'pending_review', 'approved', 'sent', 'rejected', 'skipped'] },
    { name: 'agent_run_status', values: ['running', 'completed', 'failed', 'cancelled'] },
  ];

  for (const { name, values } of enumDefs) {
    if (!existingEnums.has(name)) {
      try {
        await pool.query(`CREATE TYPE ${name} AS ENUM (${values.map(v => `'${v}'`).join(', ')})`);
        console.log(`  ✅ Created enum: ${name}`);
      } catch (e) {
        console.log(`  ⚠️ Enum ${name}: ${e.message}`);
      }
    }
  }

  // Create outreach_prospects table
  if (!existing.has('outreach_prospects')) {
    await pool.query(`
      CREATE TABLE outreach_prospects (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        category outreach_category NOT NULL,
        sub_type outreach_sub_type,
        name text NOT NULL,
        normalized_name text,
        url text NOT NULL,
        normalized_url text,
        contact_email text,
        contact_form_url text,
        contact_method outreach_contact_method DEFAULT 'unknown' NOT NULL,
        status outreach_prospect_status DEFAULT 'new' NOT NULL,
        relevance_score integer DEFAULT 0 NOT NULL,
        score_breakdown json,
        notes text,
        form_fields json,
        enrichment_data json,
        last_contacted_at timestamp,
        response_classification varchar(30),
        discovered_at timestamp DEFAULT now() NOT NULL,
        source varchar(50) DEFAULT 'web_search' NOT NULL,
        CONSTRAINT outreach_prospects_normalized_url_unique UNIQUE (normalized_url)
      )
    `);
    console.log('  ✅ Created table: outreach_prospects');
  }

  // Create outreach_pitches table
  if (!existing.has('outreach_pitches')) {
    await pool.query(`
      CREATE TABLE outreach_pitches (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        prospect_id varchar NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
        category outreach_category NOT NULL,
        pitch_type varchar(30) DEFAULT 'initial' NOT NULL,
        template_used varchar(50),
        subject text NOT NULL,
        body text NOT NULL,
        form_answers json,
        form_screenshot_filled text,
        form_screenshot_submitted text,
        status outreach_pitch_status DEFAULT 'draft' NOT NULL,
        reviewed_by varchar REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at timestamp,
        sent_at timestamp,
        sent_via varchar(20),
        response_received boolean DEFAULT false NOT NULL,
        response_at timestamp,
        response_summary text,
        response_classification varchar(30),
        follow_up_due_at timestamp,
        quality_score integer,
        quality_flags json,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('  ✅ Created table: outreach_pitches');
  }

  // Create agent_runs table
  if (!existing.has('agent_runs')) {
    await pool.query(`
      CREATE TABLE agent_runs (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name varchar(50) NOT NULL,
        status agent_run_status NOT NULL,
        started_at timestamp DEFAULT now() NOT NULL,
        completed_at timestamp,
        prospects_found integer DEFAULT 0 NOT NULL,
        pitches_drafted integer DEFAULT 0 NOT NULL,
        tokens_used integer DEFAULT 0 NOT NULL,
        cost_usd decimal(10,4),
        error_message text,
        run_log json,
        triggered_by varchar DEFAULT 'scheduler' NOT NULL
      )
    `);
    console.log('  ✅ Created table: agent_runs');
  }

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS outreach_prospects_category_idx ON outreach_prospects(category)',
    'CREATE INDEX IF NOT EXISTS outreach_prospects_status_idx ON outreach_prospects(status)',
    'CREATE INDEX IF NOT EXISTS outreach_pitches_prospect_id_idx ON outreach_pitches(prospect_id)',
    'CREATE INDEX IF NOT EXISTS outreach_pitches_status_idx ON outreach_pitches(status)',
    'CREATE INDEX IF NOT EXISTS agent_runs_agent_name_idx ON agent_runs(agent_name)',
  ];
  for (const sql of indexes) {
    try { await pool.query(sql); } catch (e) { /* ignore if exists */ }
  }
  console.log('  ✅ Indexes created');

  console.log('\n✅ PR Agent database setup complete!');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
