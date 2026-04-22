import pg from 'pg';
import fs from 'fs';
const envText = fs.readFileSync('server/.env', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

// List tables that might have manufacturer/webhook data
const tbls = await c.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND (table_name ILIKE '%webhook%' OR table_name ILIKE '%manufacturer%' OR table_name ILIKE '%audit%' OR table_name ILIKE '%event%' OR table_name ILIKE '%log%')
  ORDER BY table_name
`);
console.log('Candidate tables:');
for (const r of tbls.rows) console.log(' -', r.table_name);

// Check audit_logs for anything about this order
const audit = await c.query(`
  SELECT * FROM audit_logs
  WHERE (target_id = $1 OR details::text ILIKE $2)
  ORDER BY created_at DESC LIMIT 20
`, ['ebb7145e-ad30-484a-a5ff-44dd25aa2b2c', '%ebb7145e%']).catch(e => ({ rows: [], err: e.message }));
console.log('\naudit_logs matches:', audit.rows?.length ?? 0, audit.err ?? '');
for (const r of audit.rows || []) console.log(JSON.stringify(r, null, 2));

await c.end();
