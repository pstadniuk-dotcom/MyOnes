#!/usr/bin/env node
/**
 * One-off cleanup for Natalie Genkin (user c1427be4-7181-4f45-89c5-f69a86b6b193):
 *   1. Hard-delete the orphan lab_analyses row tied to soft-deleted file b55d1e87
 *      (file is soft-deleted for HIPAA retention, but the analysis row has no
 *      deleted_at column, so we drop it. PHI in extracted_markers/ai_insights
 *      is encrypted at rest.)
 *   2. Soft-delete file_uploads row 73d2b136 (the misclassified Allara order
 *      form / requisition).
 *   3. Drop any lab_analyses row tied to that Allara file.
 *
 * Idempotent — safe to re-run.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

// Load DATABASE_URL from server/.env manually (dotenv/config doesn't pick it up here)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', 'server', '.env');
const envText = readFileSync(envPath, 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (!m) continue;
  let val = m[2].trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[m[1]]) process.env[m[1]] = val;
}

const NATALIE_USER_ID = 'c1427be4-7181-4f45-89c5-f69a86b6b193';
const ORPHAN_ANALYSIS_FILE_ID = 'b55d1e87-0d90-4cc9-a08a-090d13f0bb6f';
const ALLARA_REQUISITION_FILE_ID = '73d2b136-8e78-4f77-acf1-a51808b4b51f';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  console.log('--- Cleanup: Natalie Genkin orphan lab data ---\n');

  // 1. Delete orphan lab_analyses row(s) for the soft-deleted Labcorp duplicate
  const orphanRes = await client.query(
    `DELETE FROM lab_analyses WHERE file_id = $1 RETURNING id, analysis_status`,
    [ORPHAN_ANALYSIS_FILE_ID],
  );
  console.log(`(1) lab_analyses for soft-deleted file ${ORPHAN_ANALYSIS_FILE_ID}:`);
  if (orphanRes.rows.length === 0) {
    console.log('    Nothing to delete (already clean).');
  } else {
    for (const row of orphanRes.rows) {
      console.log(`    DELETED id=${row.id} status=${row.analysis_status}`);
    }
  }

  // 2. Soft-delete the Allara requisition
  const allaraSoftDelete = await client.query(
    `UPDATE file_uploads
        SET deleted_at = NOW(), deleted_by = $1
      WHERE id = $2 AND user_id = $1 AND deleted_at IS NULL
      RETURNING id, original_file_name, deleted_at`,
    [NATALIE_USER_ID, ALLARA_REQUISITION_FILE_ID],
  );
  console.log(`\n(2) Soft-delete Allara requisition file ${ALLARA_REQUISITION_FILE_ID}:`);
  if (allaraSoftDelete.rows.length === 0) {
    console.log('    Already soft-deleted (or not found).');
  } else {
    for (const row of allaraSoftDelete.rows) {
      console.log(`    SOFT-DELETED ${row.original_file_name} at ${row.deleted_at.toISOString()}`);
    }
  }

  // 3. Drop the lab_analyses row tied to the Allara file (if any)
  const allaraAnalysis = await client.query(
    `DELETE FROM lab_analyses WHERE file_id = $1 RETURNING id, analysis_status`,
    [ALLARA_REQUISITION_FILE_ID],
  );
  console.log(`\n(3) lab_analyses for Allara file ${ALLARA_REQUISITION_FILE_ID}:`);
  if (allaraAnalysis.rows.length === 0) {
    console.log('    Nothing to delete.');
  } else {
    for (const row of allaraAnalysis.rows) {
      console.log(`    DELETED id=${row.id} status=${row.analysis_status}`);
    }
  }

  console.log('\n--- Done ---');
} finally {
  await client.end();
}
