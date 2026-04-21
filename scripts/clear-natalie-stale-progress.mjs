#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.join(__dirname, '..', 'server', '.env'), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (!m) continue;
  let val = m[2].trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = val;
}

const ACTIVE_FILE = 'c3372fc1-417c-41da-8cda-4edc3a815d5d';
const NATALIE = 'c1427be4-7181-4f45-89c5-f69a86b6b193';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  // Strip stale progressStep / progressDetail; mark documentKind = results
  const r = await c.query(
    `UPDATE file_uploads
        SET lab_report_data = ((lab_report_data::jsonb
              - 'progressStep' - 'progressDetail')
              || jsonb_build_object('documentKind', 'results'))::json
      WHERE id = $1
      RETURNING id,
                lab_report_data->>'analysisStatus' AS status,
                lab_report_data->>'documentKind' AS document_kind,
                (lab_report_data::jsonb ? 'progressStep') AS has_step,
                (lab_report_data::jsonb ? 'progressDetail') AS has_detail`,
    [ACTIVE_FILE],
  );
  console.log('Cleared stale progress fields on active Labcorp file:');
  console.log(r.rows[0]);

  // Also fetch her email for the recap
  const cols = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`,
  );
  const colNames = cols.rows.map(r => r.column_name);
  const nameCol = ['name', 'full_name', 'display_name', 'first_name'].find(n => colNames.includes(n));
  const u = await c.query(`SELECT email${nameCol ? `, "${nameCol}" AS display_name` : ''} FROM users WHERE id = $1`, [NATALIE]);
  console.log('\nUser:', u.rows[0]);
} finally {
  await c.end();
}
