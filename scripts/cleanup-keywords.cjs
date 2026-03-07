#!/usr/bin/env node
/**
 * cleanup-keywords.cjs — Step 3: Clean up zero-volume keywords
 *
 * Strategy:
 *   1. Find zero-volume keywords that are overly long compound names
 *   2. Generate shorter, more natural rewrites
 *   3. Fetch volume for the rewrites
 *   4. Delete confirmed-dead keywords (zero vol AND no short alias has vol)
 *   5. Keep zero-vol keywords that are <30 chars (may just be niche)
 *
 * Usage:
 *   node scripts/cleanup-keywords.cjs --dry-run    # preview what would happen
 *   node scripts/cleanup-keywords.cjs              # execute cleanup + re-fetch
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const LOGIN    = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;
const DRY_RUN  = process.argv.includes('--dry-run');

// ── Rewrite rules for overly-long ingredient names ───────────────────────────
// Map long DataForSEO-rejected forms to shorter, searched forms
const REWRITES = {
  'acetyl l-carnitine alcar':       'ALCAR',
  'coenzyme q10 coq10':             'CoQ10',
  'n-acetyl cysteine nac':          'NAC',
  'alpha lipoic acid ala':          'alpha lipoic acid',
  'msm methylsulfonylmethane':      'MSM',
  'conjugated linoleic acid cla':   'CLA',
  'nicotinamide mononucleotide nmn':'NMN',
  'nicotinamide riboside nr':       'NR supplement',
  'pantothenic acid vitamin b5':    'vitamin B5',
  'pyridoxine vitamin b6':          'vitamin B6',
  'biotin vitamin b7':              'biotin',
  'methylfolate vitamin b9':        'methylfolate',
  'methylcobalamin vitamin b12':    'B12',
  'thiamine vitamin b1':            'vitamin B1',
  'riboflavin vitamin b2':          'vitamin B2',
  'niacin vitamin b3':              'niacin',
  'selenium selenomethionine':      'selenium',
  'phosphatidylserine':             'phosphatidylserine',  // keep as is — already short
  'zinc picolinate':                'zinc picolinate',
  'zinc bisglycinate':              'zinc bisglycinate',
  'calcium hydroxyapatite':         'calcium supplement',
  'chromium picolinate':            'chromium',
  'cdp choline':                    'citicoline',
  'choline bitartrate':             'choline',
  'gla evening primrose oil':       'evening primrose oil',
  'omega 3 fish oil epa dha':       'omega 3',
  'saccharomyces boulardii':        'saccharomyces boulardii',
  'glucosamine chondroitin':        'glucosamine',
  'pycnogenol pine bark extract':   'pine bark extract',
  'panax ginseng korean red ginseng':'korean ginseng',
  'eleuthero siberian ginseng':     'siberian ginseng',
  'holy basil tulsi':               'holy basil',
  'vitex chaste tree berry':        'vitex chasteberry',
  'nac glutathione precursor':      'NAC',
  'alpha gpc choline':              'alpha GPC',
  'mucuna pruriens':                'mucuna pruriens',
  'lion\'s mane bdnf':              'lion\'s mane',
  'glutamine gut':                  'glutamine gut health',
  'cinnamon chromium blood sugar':  'cinnamon blood sugar',
  'berberine blood sugar':          'berberine blood sugar',
  'alpha lipoic acid blood sugar':  'alpha lipoic acid blood sugar',
  'activated charcoal':             'activated charcoal',
};

// Templates that generated the zero-vol keywords
const TEMPLATES = [
  '{i} supplement', '{i} benefits', '{i} dosage', '{i} side effects',
  '{i} for sleep', '{i} for anxiety', '{i} for energy', '{i} for weight loss',
  '{i} for testosterone', '{i} for immune system', '{i} for inflammation',
  '{i} for brain', '{i} deficiency symptoms', 'how much {i} per day',
  '{i} before or after food', '{i} interactions', 'is {i} safe',
];

async function fetchSearchVolume(keywords) {
  const auth = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');
  const body = JSON.stringify([{ keywords, location_code: 2840, language_code: 'en' }]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.dataforseo.com',
      path:     '/v3/keywords_data/google_ads/search_volume/live',
      method:   'POST',
      headers:  { 'Authorization': auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function upsertBatch(rows) {
  if (!rows.length) return 0;
  const CHUNK = 200;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).filter(r => r?.keyword);
    if (!chunk.length) continue;
    const vals = [], params = [];
    let p = 1;
    for (const r of chunk) {
      vals.push(`($${p++},$${p++},$${p++},$${p++},$${p++},'dataforseo',NOW())`);
      params.push(r.keyword, r.search_volume ?? 0, r.competition_index ?? 0, r.cpc ?? r.high_top_of_page_bid ?? 0, r.competition ?? null);
    }
    await pool.query(`
      INSERT INTO keyword_data (keyword, volume, kd, cpc, competition, source, updated_at)
      VALUES ${vals.join(',')}
      ON CONFLICT (keyword) DO UPDATE SET
        volume=EXCLUDED.volume, kd=EXCLUDED.kd, cpc=EXCLUDED.cpc,
        competition=EXCLUDED.competition, source=EXCLUDED.source, updated_at=NOW()
    `, params);
    total += chunk.length;
  }
  return total;
}

async function main() {
  // ── 1. Identify zero-volume keywords ──────────────────────────────────────
  const { rows: zeroRows } = await pool.query(
    'SELECT keyword FROM keyword_data WHERE volume = 0 ORDER BY keyword'
  );
  console.log(`\n✦ Found ${zeroRows.length} zero-volume keywords in DB`);

  // Categorize
  const longZero = zeroRows.filter(r => r.keyword.length > 40);
  const shortZero = zeroRows.filter(r => r.keyword.length <= 40);
  console.log(`  Long (>40 chars): ${longZero.length} — candidates for rewrite`);
  console.log(`  Short (≤40 chars): ${shortZero.length} — may be niche, keep`);

  // ── 2. Generate rewrites ──────────────────────────────────────────────────
  const rewriteKeywords = new Set();
  const deleteKeywords = [];

  for (const row of longZero) {
    const kw = row.keyword;
    let rewritten = false;

    for (const [longForm, shortForm] of Object.entries(REWRITES)) {
      if (kw.includes(longForm)) {
        // Generate the same template but with short form
        const newKw = kw.replace(longForm, shortForm).trim();
        if (newKw !== kw && newKw.length > 5) {
          rewriteKeywords.add(newKw);
          rewritten = true;
        }
        break;
      }
    }

    // If we couldn't rewrite it, mark for deletion
    if (!rewritten) {
      deleteKeywords.push(kw);
    }
  }

  // Also generate short-form variants for zero-vol short keywords that look like
  // they have a common prefix (e.g., "activated charcoal for testosterone")
  const nonsenseConditions = ['for testosterone', 'for brain', 'for immune system'];
  for (const row of shortZero) {
    const kw = row.keyword;
    // Skip useful-looking keywords
    if (kw.length < 15) continue;
    // Flag obviously nonsensical combos
    let isNonsense = false;
    for (const nc of nonsenseConditions) {
      if (kw.endsWith(nc)) {
        // Check if the ingredient makes sense for this condition
        const base = kw.replace(nc, '').trim();
        const nonsenseIngredients = ['activated charcoal', 'psyllium husk', 'potassium citrate', 'dandelion root'];
        if (nonsenseIngredients.some(ni => base.includes(ni))) {
          deleteKeywords.push(kw);
          isNonsense = true;
          break;
        }
      }
    }
  }

  // Deduplicate rewrites against existing DB
  const { rows: existing } = await pool.query('SELECT keyword FROM keyword_data');
  const existingSet = new Set(existing.map(r => r.keyword.toLowerCase()));
  const newRewrites = [...rewriteKeywords].filter(k => !existingSet.has(k.toLowerCase()));

  console.log(`\n✦ Rewrites generated: ${rewriteKeywords.size}`);
  console.log(`✦ Net new rewrites (not in DB): ${newRewrites.length}`);
  console.log(`✦ Keywords to delete: ${deleteKeywords.length}`);
  console.log(`✦ Estimated cost: ~$${(newRewrites.length * 0.0015).toFixed(2)}\n`);

  if (DRY_RUN) {
    console.log('── SAMPLE REWRITES (first 30) ────────────────────────────');
    newRewrites.slice(0, 30).forEach(k => console.log(`  + ${k}`));
    console.log(`\n── SAMPLE DELETES (first 30) ─────────────────────────────`);
    deleteKeywords.slice(0, 30).forEach(k => console.log(`  - ${k}`));
    await pool.end();
    return;
  }

  if (!LOGIN || !PASSWORD) {
    console.error('✗ Missing DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD');
    process.exit(1);
  }

  // ── 3. Fetch rewrites ─────────────────────────────────────────────────────
  if (newRewrites.length > 0) {
    console.log(`✦ Fetching volume for ${newRewrites.length} rewritten keywords...`);
    const BATCH = 700;
    const allRaw = [];
    const batches = [];
    for (let i = 0; i < newRewrites.length; i += BATCH) batches.push(newRewrites.slice(i, i + BATCH));

    for (let i = 0; i < batches.length; i++) {
      process.stdout.write(`  Batch ${i+1}/${batches.length} (${batches[i].length} keywords)... `);
      const res = await fetchSearchVolume(batches[i]);
      const task = res.tasks?.[0];
      if (task?.status_code !== 20000) throw new Error(`API error: ${task?.status_message}`);
      const results = task?.result ?? [];
      allRaw.push(...results);
      console.log(`got ${results.length} results`);
      if (i < batches.length - 1) await new Promise(r => setTimeout(r, 1200));
    }

    const upserted = await upsertBatch(allRaw);
    console.log(`✦ ${upserted} rewrite rows upserted`);

    const withVol = allRaw.filter(r => (r.search_volume ?? 0) > 0).length;
    console.log(`✦ ${withVol} of ${allRaw.length} rewrites have volume > 0`);
  }

  // ── 4. Delete confirmed-dead keywords ──────────────────────────────────────
  if (deleteKeywords.length > 0) {
    // Delete in chunks
    const CHUNK = 100;
    let deleted = 0;
    for (let i = 0; i < deleteKeywords.length; i += CHUNK) {
      const chunk = deleteKeywords.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, j) => `$${j + 1}`).join(',');
      const res = await pool.query(
        `DELETE FROM keyword_data WHERE keyword IN (${placeholders}) AND volume = 0`,
        chunk
      );
      deleted += res.rowCount ?? 0;
    }
    console.log(`✦ Deleted ${deleted} dead keywords`);
  }

  // ── 5. Also delete ANY keyword with volume=0 AND length > 50 ──────────────
  const bigClean = await pool.query(
    `DELETE FROM keyword_data WHERE volume = 0 AND LENGTH(keyword) > 50`
  );
  console.log(`✦ Deleted ${bigClean.rowCount} additional ultra-long zero-vol keywords`);

  // ── Final stats ────────────────────────────────────────────────────────────
  const stats = await pool.query(`
    SELECT COUNT(*) total,
           COUNT(*) FILTER (WHERE volume > 0) with_vol,
           COUNT(*) FILTER (WHERE volume = 0) zero_vol,
           COUNT(*) FILTER (WHERE volume >= 1000 AND kd <= 40) easy_wins,
           COUNT(*) FILTER (WHERE volume >= 5000 AND kd <= 30) sweet_spot
    FROM keyword_data
  `);
  const s = stats.rows[0];
  console.log(`\n✦ FINAL DATABASE STATS:`);
  console.log(`  Total:      ${s.total}`);
  console.log(`  With volume: ${s.with_vol}`);
  console.log(`  Zero volume: ${s.zero_vol}`);
  console.log(`  Easy wins:   ${s.easy_wins}`);
  console.log(`  Sweet spot:  ${s.sweet_spot}`);

  console.log('\n✦ Done.\n');
  await pool.end();
}

main().catch(err => {
  console.error('✗ Fatal:', err.message);
  pool.end();
  process.exit(1);
});
