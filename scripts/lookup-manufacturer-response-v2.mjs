import pg from 'pg';
import fs from 'fs';
const envText = fs.readFileSync('server/.env', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const ORDER_ID = 'ebb7145e-ad30-484a-a5ff-44dd25aa2b2c';
const MANUF_ID = 'fb155302-d71a-4559-9570-4f2b99030a56';

// Inspect columns for audit_logs and admin_audit_logs
for (const t of ['audit_logs', 'admin_audit_logs']) {
  const cols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]);
  console.log(`\n== ${t} columns ==`);
  for (const r of cols.rows) console.log(` ${r.column_name}  (${r.data_type})`);
}

// Try searching both tables using ::text cast so we find the order ID anywhere
for (const t of ['audit_logs', 'admin_audit_logs']) {
  const r = await c.query(
    `SELECT * FROM ${t} WHERE (to_jsonb(${t}.*)::text ILIKE $1 OR to_jsonb(${t}.*)::text ILIKE $2) ORDER BY 1 DESC LIMIT 10`,
    [`%${ORDER_ID}%`, `%${MANUF_ID}%`]
  ).catch(e => ({ rows: [], err: e.message }));
  console.log(`\n== ${t} matches for order: ${r.rows?.length ?? 0} ${r.err ?? ''}`);
  for (const row of r.rows || []) console.log(JSON.stringify(row, null, 2));
}

await c.end();
