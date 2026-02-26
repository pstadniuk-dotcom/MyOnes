import 'dotenv/config';
import { readFileSync } from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = readFileSync('migrations/0006_add_manufacturer_order_columns.sql', 'utf-8');
console.log('Running migration...');
await client.query(sql);
console.log('Migration applied successfully.');

// Verify
const res = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position`
);
console.log('Orders columns after migration:');
res.rows.forEach(r => console.log(' -', r.column_name));

await client.end();
