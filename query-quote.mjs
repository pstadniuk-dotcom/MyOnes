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
const cols = await c.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND data_type IN ('text','character varying','jsonb','json','uuid')`);
let hits = 0;
for (const { table_name, column_name, data_type } of cols.rows) {
  try {
    const r = await c.query(`SELECT * FROM "${table_name}" WHERE "${column_name}"::text ILIKE $1 LIMIT 5`, [`%${QUOTE}%`]);
    if (r.rows.length) { hits++; console.log(`\n=== HIT in ${table_name}.${column_name} (${data_type}) ===`); console.log(JSON.stringify(r.rows, null, 2)); }
  } catch (e) {}
}
console.log(`\nTotal hits: ${hits}`);
await c.end();
