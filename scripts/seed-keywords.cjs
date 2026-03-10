#!/usr/bin/env node
/**
 * Seed keyword_data table from DataForSEO raw results.
 *
 * Usage (no API call — uses cached data from keyword-research.cjs run):
 *   node scripts/seed-keywords.cjs
 *
 * Usage (live API fetch + seed in one step):
 *   node scripts/seed-keywords.cjs --fetch
 *
 * Requires server/.env to have DATABASE_URL (and optionally DATAFORSEO_* if --fetch)
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const RAW_PATH  = path.join(__dirname, 'keyword-research-raw.json');
const BATCH_SIZE = 700;

// ── API fetch (same logic as keyword-research.cjs, extracted here so we can
//    fetch + seed in one step if needed) ────────────────────────────────────
async function fetchFromDataForSEO(keywords) {
  const LOGIN    = process.env.DATAFORSEO_LOGIN;
  const PASSWORD = process.env.DATAFORSEO_PASSWORD;
  if (!LOGIN || !PASSWORD) throw new Error('Missing DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD in server/.env');

  const auth = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');
  const body  = JSON.stringify([{ keywords, location_code: 2840, language_code: 'en' }]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.dataforseo.com',
      path:     '/v3/keywords_data/google_ads/search_volume/live',
      method:   'POST',
      headers:  { 'Authorization': auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Parse topic-clusters.ts for all unique keywords ─────────────────────────
function parseTopicClusters() {
  const src = fs.readFileSync(path.join(__dirname, '../shared/topic-clusters.ts'), 'utf8');
  const unescape = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
  const clusterRe  = /primaryKeyword:\s*'((?:[^'\\]|\\.)+)'[^}]+?secondaryKeywords:\s*\[([^\]]*)\]/gs;
  const secondaryRe = /'((?:[^'\\]|\\.)+)'/g;
  const primaries   = new Set();
  const secondaries = new Set();
  for (const m of src.matchAll(clusterRe)) {
    primaries.add(unescape(m[1]));
    for (const s of m[2].matchAll(secondaryRe)) secondaries.add(unescape(s[1]));
  }
  for (const p of primaries) secondaries.delete(p);
  return [...primaries, ...secondaries];
}

// ── Upsert rows into keyword_data ──────────────────────────────────────────
async function upsertKeywords(rawResults) {
  // Ensure table exists (idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS keyword_data (
      keyword      VARCHAR(500) PRIMARY KEY,
      volume       INTEGER NOT NULL DEFAULT 0,
      kd           INTEGER NOT NULL DEFAULT 0,
      cpc          NUMERIC(8,2) NOT NULL DEFAULT 0,
      competition  VARCHAR(20),
      source       VARCHAR(50) DEFAULT 'dataforseo',
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  let inserted = 0;
  let updated  = 0;

  // Batch upserts for speed
  const chunkSize = 200;
  for (let i = 0; i < rawResults.length; i += chunkSize) {
    const chunk = rawResults.slice(i, i + chunkSize);
    const validChunk = chunk.filter(r => r?.keyword);

    if (validChunk.length === 0) continue;

    const values = [];
    const params = [];
    let pIdx = 1;

    for (const item of validChunk) {
      values.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, NOW())`);
      params.push(
        item.keyword,
        item.search_volume ?? 0,
        item.competition_index ?? 0,
        item.cpc ?? item.high_top_of_page_bid ?? 0,
        item.competition ?? null,
        'dataforseo',
      );
    }

    const sql = `
      INSERT INTO keyword_data (keyword, volume, kd, cpc, competition, source, updated_at)
      VALUES ${values.join(', ')}
      ON CONFLICT (keyword) DO UPDATE SET
        volume      = EXCLUDED.volume,
        kd          = EXCLUDED.kd,
        cpc         = EXCLUDED.cpc,
        competition = EXCLUDED.competition,
        source      = EXCLUDED.source,
        updated_at  = NOW()
    `;

    const result = await pool.query(sql, params);
    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const doFetch = process.argv.includes('--fetch');
  let rawResults = [];

  if (doFetch) {
    console.log('Parsing topic clusters...');
    const allKeywords = parseTopicClusters();
    console.log(`Found ${allKeywords.length} unique keywords — calling DataForSEO...`);

    const batches = [];
    for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) batches.push(allKeywords.slice(i, i + BATCH_SIZE));

    for (let i = 0; i < batches.length; i++) {
      console.log(`  Batch ${i + 1}/${batches.length}: ${batches[i].length} keywords`);
      const res  = await fetchFromDataForSEO(batches[i]);
      const task = res.tasks?.[0];
      if (task?.status_code !== 20000) throw new Error(`DataForSEO task error: ${task?.status_message}`);
      rawResults.push(...(task?.result ?? []));
      if (i < batches.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    // Save fresh raw file for reference
    fs.writeFileSync(RAW_PATH, JSON.stringify(rawResults, null, 2));
    console.log(`✓  Fetched ${rawResults.length} results — raw file updated`);

  } else {
    if (!fs.existsSync(RAW_PATH)) {
      console.error(`❌  No cached data found at ${RAW_PATH}`);
      console.error(`    Run: node scripts/keyword-research.cjs   (to fetch first)`);
      console.error(`    Or:  node scripts/seed-keywords.cjs --fetch   (fetch + seed together)`);
      process.exit(1);
    }
    rawResults = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
    console.log(`✓  Loaded ${rawResults.length} cached results from raw file`);
  }

  console.log('Upserting into keyword_data table...');
  const count = await upsertKeywords(rawResults);
  console.log(`✓  ${count} rows upserted`);

  // Print top 30 by priority score
  const { rows } = await pool.query(`
    SELECT keyword, volume, kd, cpc::float,
           ROUND(volume::numeric / GREATEST(kd, 1)) AS score
    FROM keyword_data
    WHERE volume > 0
    ORDER BY score DESC, volume DESC
    LIMIT 30
  `);

  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' TOP 30 PRIORITY KEYWORDS (stored in DB)');
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log(` ${'Score'.padEnd(8)} ${'Vol'.padEnd(8)} ${'KD'.padEnd(5)} ${'CPC'.padEnd(7)} Keyword`);
  console.log(' ' + '─'.repeat(68));
  for (const r of rows) {
    console.log(` ${String(r.score).padEnd(8)} ${String(r.volume).padEnd(8)} ${String(r.kd).padEnd(5)} $${Number(r.cpc).toFixed(2).padEnd(6)} ${r.keyword}`);
  }

  // Print zero-volume keywords (candidates for replacement)
  const { rows: zeros } = await pool.query(`
    SELECT keyword FROM keyword_data WHERE volume = 0 ORDER BY keyword LIMIT 20
  `);
  if (zeros.length > 0) {
    console.log(`\n── ${zeros.length} primary/secondary keywords with zero volume (consider rewriting) ──`);
    zeros.forEach(r => console.log(`   ${r.keyword}`));
  }

  console.log('\n══════════════════════════════════════════════════════════════════════════\n');
  await pool.end();
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  pool.end();
  process.exit(1);
});
