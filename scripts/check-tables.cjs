require('dotenv').config({ path: './server/.env' });
const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL);
c.connect().then(() =>
  c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE 'outreach%' OR table_name='agent_runs') ORDER BY table_name")
).then(r => {
  console.log('Tables found:', r.rows.map(r => r.table_name));
  c.end();
}).catch(e => { console.error(e); c.end(); });
