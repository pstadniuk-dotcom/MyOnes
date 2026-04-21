import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
if (!process.env.DATABASE_URL) {
  const envPath = resolve(__dirname, '..', 'server', '.env');
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const userId = 'c1427be4-7181-4f45-89c5-f69a86b6b193';

const all = await pool.query(
  `SELECT id, original_file_name, type, deleted_at, uploaded_at,
          (lab_report_data->>'analysisStatus') as analysis_status,
          (lab_report_data->>'testType') as test_type,
          (lab_report_data->>'labName') as lab_name
   FROM file_uploads
   WHERE user_id = $1
   ORDER BY uploaded_at DESC`,
  [userId],
);

console.log('ALL ROWS for Natalie:');
for (const r of all.rows) console.log(r);

console.log('\nACTIVE (not deleted), lab_report only:');
const active = await pool.query(
  `SELECT id, original_file_name, (lab_report_data->>'testType') as test_type
   FROM file_uploads
   WHERE user_id = $1 AND type = 'lab_report' AND deleted_at IS NULL
   ORDER BY uploaded_at DESC`,
  [userId],
);
console.log(active.rows);

await pool.end();
