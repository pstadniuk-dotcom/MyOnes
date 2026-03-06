#!/usr/bin/env node
/**
 * One-time DataForSEO keyword enrichment script.
 *
 * Usage:
 *   node scripts/keyword-research.cjs
 *
 * Requires in server/.env:
 *   DATAFORSEO_LOGIN=your@email.com
 *   DATAFORSEO_PASSWORD=your_api_password
 *
 * Outputs:
 *   server/data/keyword-enrichment.json  — keyed by primaryKeyword, used by the scheduler
 *   scripts/keyword-research-raw.json    — full DataForSEO response (keep for reference)
 *
 * API cost estimate: ~150 primary + ~600 secondary = ~750 keywords total
 *   DataForSEO Google Ads Search Volume: $0.0015/keyword ≈ $1.13 per run
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Load env ────────────────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const LOGIN    = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

if (!LOGIN || !PASSWORD) {
  console.error('\n❌  Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD in server/.env\n');
  process.exit(1);
}

// ── Parse topic-clusters.ts to extract all keywords ────────────────────────
const clustersPath = path.join(__dirname, '../shared/topic-clusters.ts');
const source = fs.readFileSync(clustersPath, 'utf8');

// Extract all { primaryKeyword, secondaryKeywords } pairs
// Match strings that may contain backslash-escaped apostrophes like women\'s
// Pattern: either a non-quote/non-backslash char, or any escaped char (\')
const clusterRegex = /\{\s*tier:[^}]+?primaryKeyword:\s*'((?:[^'\\]|\\.)+)'[^}]+?secondaryKeywords:\s*\[([^\]]*)\]/gs;
const secondaryKwRegex = /'((?:[^'\\]|\\.)+)'/g;
const clusters = [];

// Unescape backslash-escaped apostrophes that appear in TS source strings
const unescape = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();

for (const match of source.matchAll(clusterRegex)) {
  const primary = unescape(match[1]);
  const secondary = [...match[2].matchAll(secondaryKwRegex)].map(m => unescape(m[1]));
  clusters.push({ primaryKeyword: primary, secondaryKeywords: secondary });
}

if (clusters.length === 0) {
  console.error('❌  No clusters parsed — check regex against topic-clusters.ts format');
  process.exit(1);
}

console.log(`✓  Parsed ${clusters.length} topic clusters`);
// Sanity-check: print a few to confirm no stray backslashes
console.log('   Sample primaries:', clusters.slice(0, 3).map(c => c.primaryKeyword));

// Collect all unique keywords (primary first so we always get their data)
const primarySet = new Set(clusters.map(c => c.primaryKeyword));
const secondarySet = new Set(clusters.flatMap(c => c.secondaryKeywords));
// Remove any secondary that is already a primary (dedup)
for (const k of primarySet) secondarySet.delete(k);

const allKeywords = [...primarySet, ...secondarySet];
console.log(`✓  ${allKeywords.length} unique keywords to look up (${primarySet.size} primary + ${secondarySet.size} secondary)`);

// ── DataForSEO API call ─────────────────────────────────────────────────────
const BATCH_SIZE = 700; // DataForSEO hard limit per task
const authHeader = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

async function fetchSearchVolume(keywords) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{
      keywords,
      location_code: 2840,  // United States
      language_code: 'en',
    }]);

    const options = {
      hostname: 'api.dataforseo.com',
      path: '/v3/keywords_data/google_ads/search_volume/live',
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}\nRaw: ${data.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const reprocess = process.argv.includes('--reprocess');
  const rawPath   = path.join(__dirname, 'keyword-research-raw.json');
  let rawResults  = [];

  if (reprocess && fs.existsSync(rawPath)) {
    rawResults = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    console.log(`✓  Reprocessing ${rawResults.length} cached results (no API call)`);
  } else {
    const batches = [];
    for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
      batches.push(allKeywords.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n📡  Calling DataForSEO: ${batches.length} batch(es) of up to ${BATCH_SIZE} keywords...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Batch ${i + 1}/${batches.length}: ${batch.length} keywords`);
      const result = await fetchSearchVolume(batch);

      if (result.status_code !== 20000) {
        console.error(`❌  API error (batch ${i + 1}): ${JSON.stringify(result)}`);
        process.exit(1);
      }

      const task = result.tasks?.[0];
      if (task?.status_code !== 20000) {
        console.error(`❌  Task error (batch ${i + 1}): ${task?.status_message}`);
        process.exit(1);
      }

      rawResults.push(...(task?.result ?? []));

      // Be polite to the API between batches
      if (i < batches.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log(`✓  Received data for ${rawResults.length} keywords`);
    fs.writeFileSync(rawPath, JSON.stringify(rawResults, null, 2));
    console.log(`✓  Raw results saved → ${rawPath}`);
  }

  // ── Build enrichment map ──────────────────────────────────────────────────
  // Fields are top-level on each result item (no keyword_info wrapper)
  const enrichmentMap = {};
  for (const item of rawResults) {
    if (!item?.keyword) continue;
    enrichmentMap[item.keyword.toLowerCase()] = {
      volume: item.search_volume ?? 0,
      kd:     item.competition_index ?? 0,     // 0-100
      cpc:    item.cpc ?? item.high_top_of_page_bid ?? 0,
    };
  }

  // ── Build cluster priority table ──────────────────────────────────────────
  const enrichedClusters = clusters.map(c => {
    const data = enrichmentMap[c.primaryKeyword.toLowerCase()] ?? { volume: 0, kd: 0, cpc: 0 };
    return {
      primaryKeyword:    c.primaryKeyword,
      secondaryKeywords: c.secondaryKeywords,
      volume:            data.volume,
      kd:                data.kd,
      cpc:               data.cpc,
      // Priority score: high volume AND low competition = rank high
      // Capped KD minimum at 1 to avoid division by zero
      priorityScore:     Math.round(data.volume / Math.max(data.kd, 1)),
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // ── Save enrichment JSON (used by scheduler) ──────────────────────────────
  const dataDir = path.join(__dirname, '../server/data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Format: { "primaryKeyword": { volume, kd, cpc } }
  const outputMap = {};
  for (const c of enrichedClusters) {
    outputMap[c.primaryKeyword] = { volume: c.volume, kd: c.kd, cpc: c.cpc };
    // Also index secondary keywords so the scheduler can enrich them too
    for (const sk of c.secondaryKeywords) {
      const skData = enrichmentMap[sk.toLowerCase()];
      if (skData) outputMap[sk] = skData;
    }
  }

  const enrichPath = path.join(dataDir, 'keyword-enrichment.json');
  fs.writeFileSync(enrichPath, JSON.stringify(outputMap, null, 2));
  console.log(`✓  Enrichment map saved → ${enrichPath}`);

  // ── Print priority table ──────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(' TOP 30 PRIORITY KEYWORDS  (highest volume / lowest competition)');
  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log(` ${'Score'.padEnd(7)} ${'Vol/mo'.padEnd(8)} ${'KD'.padEnd(5)} ${'CPC'.padEnd(7)} Keyword`);
  console.log(' ' + '─'.repeat(70));

  for (const c of enrichedClusters.slice(0, 30)) {
    const score = String(c.priorityScore).padEnd(7);
    const vol   = String(c.volume).padEnd(8);
    const kd    = String(c.kd).padEnd(5);
    const cpc   = `$${c.cpc.toFixed(2)}`.padEnd(7);
    console.log(` ${score} ${vol} ${kd} ${cpc} ${c.primaryKeyword}`);
  }

  console.log('\n── BOTTOM 10 (low-value / skip or rewrite) ──────────────────────────────────');
  for (const c of enrichedClusters.slice(-10).reverse()) {
    const score = String(c.priorityScore).padEnd(7);
    const vol   = String(c.volume).padEnd(8);
    const kd    = String(c.kd).padEnd(5);
    console.log(` ${score} ${vol} ${kd}       ${c.primaryKeyword}`);
  }

  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(` ✅  Done. The scheduler will now auto-prioritize by volume/KD.`);
  console.log(`    Enrichment file: server/data/keyword-enrichment.json`);
  console.log('══════════════════════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌  Fatal:', err.message);
  process.exit(1);
});
