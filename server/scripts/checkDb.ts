import { config as loadEnv } from 'dotenv';
loadEnv({ path: './server/.env', override: true });

import pg from 'pg';
const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const dbNameRes = await client.query('select current_database() as db');
    const dbName = dbNameRes.rows?.[0]?.db || '(unknown)';
    const res = await client.query(
      `select table_name from information_schema.tables where table_schema='public' order by table_name`
    );
    console.log('Connected to database:', dbName);
    console.log('Public tables:', res.rows.map(r => r.table_name));
  } catch (e: any) {
    console.error('DB check failed:', e?.message || e);
    process.exit(2);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
