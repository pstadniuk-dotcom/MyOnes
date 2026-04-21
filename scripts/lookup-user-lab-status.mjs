#!/usr/bin/env node
/**
 * Look up a user by name/email and dump their lab analysis status.
 *
 * Usage:
 *   node scripts/lookup-user-lab-status.mjs "natalie genkin"
 *   node scripts/lookup-user-lab-status.mjs natalie@example.com
 */

import 'dotenv/config';
import pg from 'pg';
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

const query = (process.argv[2] || '').trim();
if (!query) {
  console.error('Usage: node scripts/lookup-user-lab-status.mjs "<name or email>"');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  // Find user by email (exact, case-insensitive) or name (ilike)
  const userRes = await client.query(
    `SELECT id, name, email, phone, created_at, is_admin
     FROM users
     WHERE lower(email) = lower($1) OR name ILIKE $2
     ORDER BY created_at DESC
     LIMIT 10`,
    [query, `%${query}%`]
  );

  if (userRes.rows.length === 0) {
    console.log(`No users found matching "${query}"`);
    process.exit(0);
  }

  for (const user of userRes.rows) {
    console.log('\n' + '='.repeat(80));
    console.log(`USER: ${user.name} <${user.email}>`);
    console.log(`  id:         ${user.id}`);
    console.log(`  phone:      ${user.phone || '(none)'}`);
    console.log(`  created:    ${user.created_at?.toISOString?.() || user.created_at}`);
    console.log(`  isAdmin:    ${user.is_admin}`);

    // File uploads (lab reports)
    const filesRes = await client.query(
      `SELECT id, type, original_file_name, file_size, mime_type,
              uploaded_at, analysis_started_at, analysis_completed_at,
              lab_report_data
       FROM file_uploads
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [user.id]
    );

    console.log(`\n  FILE UPLOADS (${filesRes.rows.length}):`);
    if (filesRes.rows.length === 0) {
      console.log('    (none)');
    } else {
      for (const f of filesRes.rows) {
        const status = f.lab_report_data?.analysisStatus || '(no status)';
        const progress = f.lab_report_data?.progressStep || '';
        const detail = f.lab_report_data?.progressDetail || '';
        const sizeKb = f.file_size ? `${(f.file_size / 1024).toFixed(1)}kb` : '?';
        console.log(`    - [${f.type}] ${f.original_file_name} (${sizeKb})`);
        console.log(`        fileId:        ${f.id}`);
        console.log(`        uploadedAt:    ${f.uploaded_at?.toISOString?.() || f.uploaded_at}`);
        console.log(`        analysisStart: ${f.analysis_started_at?.toISOString?.() || f.analysis_started_at || '(never)'}`);
        console.log(`        analysisDone:  ${f.analysis_completed_at?.toISOString?.() || f.analysis_completed_at || '(never)'}`);
        console.log(`        status:        ${status}`);
        if (progress) console.log(`        progressStep:  ${progress}`);
        if (detail)   console.log(`        progressNote:  ${detail}`);
      }
    }

    // Lab analyses
    const analysesRes = await client.query(
      `SELECT id, file_id, analysis_status, processed_at, error_message,
              jsonb_array_length(coalesce(extracted_markers::jsonb, '[]'::jsonb)) AS marker_count,
              ai_insights IS NOT NULL AS has_insights
       FROM lab_analyses
       WHERE user_id = $1
       ORDER BY processed_at DESC`,
      [user.id]
    );

    console.log(`\n  LAB ANALYSES (${analysesRes.rows.length}):`);
    if (analysesRes.rows.length === 0) {
      console.log('    (none — analysis row was never created)');
    } else {
      for (const a of analysesRes.rows) {
        console.log(`    - analysisId:  ${a.id}`);
        console.log(`        fileId:      ${a.file_id}`);
        console.log(`        status:      ${a.analysis_status}`);
        console.log(`        processedAt: ${a.processed_at?.toISOString?.() || a.processed_at}`);
        console.log(`        markers:     ${a.marker_count}`);
        console.log(`        hasInsights: ${a.has_insights}`);
        if (a.error_message) console.log(`        ERROR:       ${a.error_message}`);
      }
    }

    // Health profile snapshot
    const hpRes = await client.query(
      `SELECT updated_at, conditions, medications, allergies, current_supplements
       FROM health_profiles WHERE user_id = $1`,
      [user.id]
    );
    const arrLen = (v) => Array.isArray(v) ? v.length : (v == null ? 0 : '?(non-array)');
    if (hpRes.rows[0]) {
      const h = hpRes.rows[0];
      console.log(`\n  HEALTH PROFILE: updated ${h.updated_at?.toISOString?.() || h.updated_at}`);
      console.log(`    conditions=${arrLen(h.conditions)} medications=${arrLen(h.medications)} allergies=${arrLen(h.allergies)} supplements=${arrLen(h.current_supplements)}`);
    } else {
      console.log('\n  HEALTH PROFILE: (none)');
    }

    // Formulas
    const fmRes = await client.query(
      `SELECT id, version, total_mg, target_capsules, created_at
       FROM formulas WHERE user_id = $1 ORDER BY version DESC LIMIT 5`,
      [user.id]
    );
    console.log(`\n  FORMULAS (latest ${fmRes.rows.length}):`);
    for (const f of fmRes.rows) {
      console.log(`    - V${f.version}  ${f.total_mg}mg / ${f.target_capsules}caps  ${f.created_at?.toISOString?.() || f.created_at}`);
    }
  }
} finally {
  await client.end();
}
