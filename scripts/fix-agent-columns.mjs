/**
 * Fix missing columns in PR Agent tables
 * Compares schema.ts definitions with actual DB and adds missing columns.
 */
import pg from 'pg';
const { Client } = pg;
import { readFileSync } from 'fs';

const envContent = readFileSync('server/.env', 'utf-8');
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!match) { console.error('No DATABASE_URL found'); process.exit(1); }

const client = new Client({ connectionString: match[1] });
await client.connect();

const migrations = [
  // outreach_prospects missing columns
  `ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS enrichment_data json`,
  `ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS last_contacted_at timestamp`,
  `ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS response_classification varchar(30)`,

  // outreach_pitches missing columns
  `ALTER TABLE outreach_pitches ADD COLUMN IF NOT EXISTS response_classification varchar(30)`,
  `ALTER TABLE outreach_pitches ADD COLUMN IF NOT EXISTS quality_score integer`,
  `ALTER TABLE outreach_pitches ADD COLUMN IF NOT EXISTS quality_flags json`,

  // outreach_send_log table (may not exist or be empty)
  `CREATE TABLE IF NOT EXISTS outreach_send_log (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    pitch_id varchar NOT NULL REFERENCES outreach_pitches(id) ON DELETE CASCADE,
    channel varchar(20) NOT NULL,
    sent_at timestamp DEFAULT now() NOT NULL,
    status varchar(20) DEFAULT 'sent' NOT NULL,
    external_message_id text,
    error_message text
  )`,
];

for (const sql of migrations) {
  try {
    await client.query(sql);
    const label = sql.split('\n')[0].trim().substring(0, 80);
    console.log(`✓ ${label}`);
  } catch (err) {
    console.error(`✗ ${sql.substring(0, 80)}...`);
    console.error(`  Error: ${err.message}`);
  }
}

// Verify
console.log('\n--- Verification ---');
for (const table of ['outreach_prospects', 'outreach_pitches', 'outreach_send_log']) {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  console.log(`${table}: ${r.rows.length} columns → ${r.rows.map(x => x.column_name).join(', ')}`);
}

await client.end();
console.log('\nDone.');
