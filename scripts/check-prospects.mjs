import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const counts = await pool.query('SELECT status, count(*) as cnt FROM outreach_prospects GROUP BY status ORDER BY status');
console.log('=== Prospect counts by status ===');
counts.rows.forEach(r => console.log(`  ${r.status}: ${r.cnt}`));

const sent = await pool.query(`
  SELECT p.id, p.name, p.category, p.status as prospect_status, p.audience_estimate, p.contact_email, p.contact_method
  FROM outreach_prospects p
  WHERE p.status IN ('pitched','responded','booked','published','manually_contacted')
     OR EXISTS (SELECT 1 FROM outreach_pitches op WHERE op.prospect_id = p.id AND op.status = 'sent')
  ORDER BY p.name
`);
console.log(`\n=== Prospects with sent outreach (${sent.rows.length}) ===`);
sent.rows.forEach(r => console.log(`  ${r.name} | ${r.category} | status=${r.prospect_status} | audience=${r.audience_estimate} | email=${r.contact_email} | method=${r.contact_method}`));

const total = await pool.query('SELECT count(*) as total FROM outreach_prospects');
console.log(`\nTotal prospects: ${total.rows[0].total}`);

// Also check pitches
const pitches = await pool.query('SELECT status, count(*) as cnt FROM outreach_pitches GROUP BY status ORDER BY status');
console.log('\n=== Pitch counts by status ===');
pitches.rows.forEach(r => console.log(`  ${r.status}: ${r.cnt}`));

await pool.end();
