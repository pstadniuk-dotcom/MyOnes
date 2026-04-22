import pg from 'pg';
import fs from 'fs';
const envText = fs.readFileSync('server/.env', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const sql = `SELECT id, user_id, formula_id, formula_version, status, amount_cents, manufacturer_cost_cents, supply_weeks, placed_at, shipped_at, manufacturer_order_id, manufacturer_order_status
             FROM orders
             WHERE UPPER(id) LIKE '%EBB7145E%'
             ORDER BY placed_at DESC
             LIMIT 5`;
const r = await c.query(sql);
console.log('rows:', r.rows.length);
for (const row of r.rows) console.log(JSON.stringify(row, null, 2));
await c.end();
