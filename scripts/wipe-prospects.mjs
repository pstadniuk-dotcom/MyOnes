import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.frksbddeepdzlskvniqu:Weshinebright22!@aws-0-us-west-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

// Delete everything — pitches first (FK constraint), then prospects, then runs
const pitches = await pool.query('DELETE FROM outreach_pitches RETURNING id');
console.log(`Deleted ${pitches.rowCount} pitches`);

const prospects = await pool.query('DELETE FROM outreach_prospects RETURNING id');
console.log(`Deleted ${prospects.rowCount} prospects`);

const runs = await pool.query('DELETE FROM agent_runs RETURNING id');
console.log(`Deleted ${runs.rowCount} agent runs`);

// Verify
const check = await pool.query('SELECT count(*) as cnt FROM outreach_prospects');
console.log(`Prospects remaining: ${check.rows[0].cnt}`);

await pool.end();
console.log('Done — clean slate.');
