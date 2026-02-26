import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const res = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position`
);
console.log('Current orders columns:');
res.rows.forEach(r => console.log(' -', r.column_name));

await client.end();
