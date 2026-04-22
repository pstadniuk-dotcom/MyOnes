import pg from 'pg';
import fs from 'fs';

const envText = fs.readFileSync('server/.env', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const QUOTE = '8701aed2-1ed8-44a3-afea-7dc6f94ff969';

const cols = await c.query(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND data_type IN ('text','character varying','jsonb','json','uuid')
`);

let hits = 0;
for (const { table_name, column_name, data_type } of cols.rows) {
  try {
    const sql = `SELECT * FROM "${table_name}" WHERE "${column_name}"::text ILIKE $1 LIMIT 5`;
    const r = await c.query(sql, [`%${QUOTE}%`]);
    if (r.rows.length) {
      hits++;
      console.log(`\n=== HIT in ${table_name}.${column_name} (${data_type}) ===`);
      console.log(JSON.stringify(r.rows, null, 2));
    }
  } catch (e) { /* skip */ }
}
console.log(`\nTotal tables/columns matched: ${hits}`);

await c.end();
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const envText = fs.readFileSync('server/.env', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const QUOTE = '8701aed2-1ed8-44a3-afea-7dc6f94ff969';

const cols = await c.query(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND data_type IN ('text','character varying','jsonb','json','uuid')
`);

let hits = 0;
for (const { table_name, column_name, data_type } of cols.rows) {
  try {
    const sql = `SELECT * FROM "${table_name}" WHERE "${column_name}"::text ILIKE $1 LIMIT 5`;
    const r = await c.query(sql, [`%${QUOTE}%`]);
    if (r.rows.length) {
      hits++;
      console.log(`\n=== HIT in ${table_name}.${column_name} (${data_type}) ===`);
      console.log(JSON.stringify(r.rows, null, 2));
    }
  } catch (e) { /* skip */ }
}
console.log(`\nTotal tables/columns matched: ${hits}`);

await c.end();
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Load server/.env
const envPath = path.resolve('server/.env');
const envText = fs.readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const QUOTE = '8701aed2-1ed8-44a3-afea-7dc6f94ff969';

const r1 = await c.query(
  `SELECT o.*, u.email
   FROM orders o LEFT JOIN users u ON u.id = o.user_id
   WHERE o.manufacturer_quote_id = $1`,
  [QUOTE]
);
console.log('orders.manufacturer_quote_id matches:', JSON.stringify(r1.rows, null, 2));

const r2 = await c.query(
  `SELECT f.id, f.user_id, f.last_quote_id, f.updated_at, u.email
   FROM formulas f LEFT JOIN users u ON u.id = f.user_id
   WHERE f.last_quote_id = $1`,
  [QUOTE]
);
console.log('formulas.last_quote_id matches:', JSON.stringify(r2.rows, null, 2));

await c.end();
