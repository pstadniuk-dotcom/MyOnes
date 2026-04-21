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

const NATALIE = 'c1427be4-7181-4f45-89c5-f69a86b6b193';
const ACTIVE_FILE = 'c3372fc1-417c-41da-8cda-4edc3a815d5d';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  console.log('=== file_uploads.lab_report_data for active Labcorp file ===');
  const f = await c.query(
    `SELECT id, original_file_name, lab_report_data, analysis_started_at, analysis_completed_at
       FROM file_uploads WHERE id = $1`,
    [ACTIVE_FILE],
  );
  const ld = f.rows[0]?.lab_report_data || {};
  console.log('analysisStatus:', ld.analysisStatus);
  console.log('testType:', ld.testType, '| labName:', ld.labName, '| testDate:', ld.testDate);
  console.log('documentKind:', ld.documentKind);
  console.log('progressDetail:', ld.progressDetail);
  const ed = Array.isArray(ld.extractedData) ? ld.extractedData : [];
  console.log('extractedData count:', ed.length);
  if (ed.length) {
    console.log('First 5 markers:');
    for (const m of ed.slice(0, 5)) console.log('  ', JSON.stringify(m));
    console.log(`...and ${ed.length - 5} more`);
  }
  const mi = ld.markerInsights;
  console.log('markerInsights present:', !!mi, 'keys:', mi ? Object.keys(mi).length : 0);

  console.log('\n=== lab_analyses rows for Natalie (after join filter) ===');
  const la = await c.query(
    `SELECT la.id, la.file_id, la.analysis_status, la.processed_at,
            (la.extracted_markers IS NOT NULL) AS has_markers_blob,
            (la.ai_insights IS NOT NULL) AS has_ai_insights,
            fu.deleted_at AS file_deleted_at, fu.original_file_name
       FROM lab_analyses la
       JOIN file_uploads fu ON fu.id = la.file_id
      WHERE la.user_id = $1
      ORDER BY la.processed_at DESC`,
    [NATALIE],
  );
  for (const r of la.rows) {
    console.log(JSON.stringify(r, null, 2));
  }

  console.log('\n=== lab_analyses (active only - what UI/AI sees) ===');
  const active = la.rows.filter(r => !r.file_deleted_at);
  console.log(`Count: ${active.length}`);
} finally {
  await c.end();
}
