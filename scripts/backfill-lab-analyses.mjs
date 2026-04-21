#!/usr/bin/env node
/**
 * Backfill the lab_analyses table from existing file_uploads.labReportData
 * and reset Natalie's two failed lab files to 'pending' so the AI Brain /
 * formula-review pipeline finally has structured marker rows to read.
 *
 * Why: lab_analyses has been empty in production because the upload flow
 * never wrote to it. Chat read from file_uploads.labReportData (worked),
 * but AI Brain digest + formula drift detection read from lab_analyses
 * (empty), so they never saw lab data. New code (PR alongside this script)
 * starts writing to lab_analyses; this backfills history.
 *
 * Idempotent: if a lab_analyses row already exists for a fileId we update
 * it instead of inserting again.
 *
 * Run: node scripts/backfill-lab-analyses.mjs            (all users)
 *      node scripts/backfill-lab-analyses.mjs --user "natalie genkin"
 *      node scripts/backfill-lab-analyses.mjs --dry-run
 */

import 'dotenv/config';
import pg from 'pg';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.DATABASE_URL) {
  const envPath = resolve(__dirname, '..', 'server', '.env');
  try {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}
if (!process.env.FIELD_ENCRYPTION_KEY) {
  console.error('FIELD_ENCRYPTION_KEY not set (required for lab_analyses field encryption)');
  process.exit(1);
}

// ── AES-256-GCM matching server/infra/security/fieldEncryption.ts ─────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey() {
  const buf = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'base64');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`FIELD_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${buf.length})`);
  }
  return buf;
}

function encryptField(plaintext) {
  if (!plaintext) throw new Error('Cannot encrypt empty plaintext');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let enc = cipher.update(plaintext, 'utf8');
  enc = Buffer.concat([enc, cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

// ── Marker normalizer mirrors files.repository.ts upsertLabAnalysisForFile ──
function mapToMarkers(extractedData) {
  if (!Array.isArray(extractedData)) return [];
  return extractedData
    .map((row) => {
      const name = row?.testName || row?.name || '';
      if (!name) return null;
      const rawVal = row?.value;
      const numVal = typeof rawVal === 'number'
        ? rawVal
        : (typeof rawVal === 'string' ? parseFloat(rawVal.replace(/,/g, '')) : NaN);
      const s = String(row?.status || '').toLowerCase();
      const status = ['high', 'low', 'normal', 'critical'].includes(s) ? s : 'normal';
      return {
        name,
        value: Number.isFinite(numVal) ? numVal : 0,
        unit: row?.unit || '',
        referenceRange: row?.referenceRange || '',
        status,
      };
    })
    .filter(Boolean);
}

// Args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const userIdx = args.indexOf('--user');
const userQuery = userIdx >= 0 ? args[userIdx + 1] : null;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  // Pull every non-deleted lab_report file_upload (optionally scoped to a user)
  let userFilter = '';
  const params = [];
  if (userQuery) {
    const u = await client.query(
      `SELECT id, name, email FROM users
       WHERE lower(email) = lower($1) OR name ILIKE $2
       ORDER BY created_at DESC LIMIT 1`,
      [userQuery, `%${userQuery}%`]
    );
    if (!u.rows[0]) {
      console.error(`No user found matching "${userQuery}"`);
      process.exit(1);
    }
    console.log(`Scoping to user: ${u.rows[0].name} <${u.rows[0].email}> (${u.rows[0].id})`);
    userFilter = 'AND user_id = $1';
    params.push(u.rows[0].id);
  }

  const filesRes = await client.query(
    `SELECT id, user_id, original_file_name, lab_report_data, uploaded_at
     FROM file_uploads
     WHERE type = 'lab_report' AND deleted_at IS NULL ${userFilter}
     ORDER BY uploaded_at DESC`,
    params
  );

  console.log(`\nFound ${filesRes.rows.length} lab_report file_uploads`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}\n`);

  let inserted = 0, updated = 0, skipped = 0, errored = 0, naturalieReset = 0;
  const naturalieFailedFileIds = new Set([
    'c3372fc1-417c-41da-8cda-4edc3a815d5d', // 071-363-2169-0 (2).pdf v2
    '73d2b136-8e78-4f77-acf1-a51808b4b51f', // allara_lab_order...
  ]);

  for (const file of filesRes.rows) {
    const data = file.lab_report_data || {};
    const status = data.analysisStatus;
    const extractedData = data.extractedData;

    // Reset Natalie's two failed files to pending so she (or the UI) can retry cleanly
    if (naturalieFailedFileIds.has(file.id) && status === 'error') {
      console.log(`  RESET (Natalie failed): ${file.original_file_name} [${file.id}]`);
      if (!dryRun) {
        const fresh = {
          analysisStatus: 'pending',
          progressDetail: 'Reset by backfill script — please re-analyze.',
        };
        await client.query(
          `UPDATE file_uploads SET lab_report_data = $1::json, analysis_started_at = NULL, analysis_completed_at = NULL WHERE id = $2`,
          [JSON.stringify(fresh), file.id]
        );
      }
      naturalieReset++;
      continue;
    }

    // Only backfill completed analyses with markers
    if (status !== 'completed' || !Array.isArray(extractedData) || extractedData.length === 0) {
      skipped++;
      continue;
    }

    const markers = mapToMarkers(extractedData);
    if (markers.length === 0) {
      skipped++;
      continue;
    }

    // Check if a lab_analyses row already exists for this fileId
    const existing = await client.query(
      `SELECT id FROM lab_analyses WHERE file_id = $1 ORDER BY processed_at DESC LIMIT 1`,
      [file.id]
    );

    const encryptedMarkers = encryptField(JSON.stringify(markers));
    // extracted_markers is a `json` column; pg needs a JSON-encoded string
    const markersJsonLiteral = JSON.stringify(encryptedMarkers);

    try {
      if (existing.rows[0]) {
        if (!dryRun) {
          await client.query(
            `UPDATE lab_analyses
             SET extracted_markers = $1::json, analysis_status = 'completed', error_message = NULL
             WHERE id = $2`,
            [markersJsonLiteral, existing.rows[0].id]
          );
        }
        updated++;
      } else {
        if (!dryRun) {
          await client.query(
            `INSERT INTO lab_analyses (file_id, user_id, analysis_status, extracted_markers)
             VALUES ($1, $2, 'completed', $3::json)`,
            [file.id, file.user_id, markersJsonLiteral]
          );
        }
        inserted++;
      }
      console.log(`  ${existing.rows[0] ? 'UPDATE' : 'INSERT'}: ${file.original_file_name} (${markers.length} markers)`);
    } catch (err) {
      console.error(`  ERROR on ${file.id}:`, err.message);
      errored++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Inserted:           ${inserted}`);
  console.log(`  Updated:            ${updated}`);
  console.log(`  Skipped (no data):  ${skipped}`);
  console.log(`  Errored:            ${errored}`);
  console.log(`  Natalie reset:      ${naturalieReset}`);
  if (dryRun) console.log('\n(DRY RUN — no changes written)');
} finally {
  await client.end();
}
