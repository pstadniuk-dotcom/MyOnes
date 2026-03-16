import pg from 'pg';
const { Client } = pg;
import { readFileSync } from 'fs';

const envContent = readFileSync('server/.env', 'utf-8');
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!match) { console.error('No DATABASE_URL found'); process.exit(1); }

const client = new Client({ connectionString: match[1] });
await client.connect();

const tables = ['outreach_prospects', 'outreach_pitches', 'agent_runs', 'outreach_send_log'];
for (const table of tables) {
  const r = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  console.log(`\n=== ${table} (${r.rows.length} columns) ===`);
  r.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
}

await client.end();
