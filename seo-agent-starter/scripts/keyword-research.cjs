#!/usr/bin/env node
/**
 * Keyword Research Script — DataForSEO keyword enrichment
 *
 * Fetches search volume, competition (KD), and CPC for all keywords in your
 * topic-clusters.ts file via the DataForSEO Google Ads Search Volume API.
 *
 * Usage:
 *   node scripts/keyword-research.cjs                # call API + save results
 *   node scripts/keyword-research.cjs --reprocess    # reprocess cached results (no API call)
 *
 * Prerequisites:
 *   1. Copy .env.example to .env and set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD
 *   2. Add your topics to shared/topic-clusters.ts
 *
 * Outputs:
 *   data/keyword-enrichment.json              — keyed by primaryKeyword (used by scheduler)
 *   scripts/keyword-research-raw.json         — full DataForSEO response (reference)
 *
 * Cost estimate: ~$0.0015/keyword → ~$1.00 per run for 700 keywords
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Load env ────────────────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

if (!LOGIN || !PASSWORD) {
  console.error('\n❌  Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD in .env\n');
  process.exit(1);
}

// ── Parse topic-clusters.ts to extract all keywords ────────────────────────
const clustersPath = path.join(__dirname, '../shared/topic-clusters.ts');
const source = fs.readFileSync(clustersPath, 'utf8');

const clusterRegex = /\{\s*tier:[^}]+?primaryKeyword:\s*'((?:[^'\\]|\\.)+)'[^}]+?secondaryKeywords:\s*\[([^\]]*)\]/gs;
const secondaryKwRegex = /'((?:[^'\\]|\\.)+)'/g;
const clusters = [];
const unescape = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();

for (const match of source.matchAll(clusterRegex)) {
  const primary = unescape(match[1]);
  const secondary = [...match[2].matchAll(secondaryKwRegex)].map(m => unescape(m[1]));
  clusters.push({ primaryKeyword: primary, secondaryKeywords: secondary });
}

if (clusters.length === 0) {
  console.error('❌  No clusters parsed — check regex against shared/topic-clusters.ts format');
  process.exit(1);
}

console.log(`✓  Parsed ${clusters.length} topic clusters`);
console.log('   Sample:', clusters.slice(0, 3).map(c => c.primaryKeyword));

const primarySet = new Set(clusters.map(c => c.primaryKeyword));
const secondarySet = new Set(clusters.flatMap(c => c.secondaryKeywords));
for (const k of primarySet) secondarySet.delete(k);

const allKeywords = [...primarySet, ...secondarySet];
console.log(`✓  ${allKeywords.length} unique keywords (${primarySet.size} primary + ${secondarySet.size} secondary)`);

// ── DataForSEO API ──────────────────────────────────────────────────────────
const BATCH_SIZE = 700;
const authHeader = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

async function fetchSearchVolume(keywords) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{
      keywords,
      location_code: 2840, // United States — change for other countries
      language_code: 'en',
    }]);

    const options = {
      hostname: 'api.dataforseo.com',
      path: '/v3/keywords_data/google_ads/search_volume/live',
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}\nRaw: ${data.slice(0, 500)}`)); }
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
  const rawPath = path.join(__dirname, 'keyword-research-raw.json');
  let rawResults = [];

  if (reprocess && fs.existsSync(rawPath)) {
    rawResults = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    console.log(`✓  Reprocessing ${rawResults.length} cached results (no API call)`);
  } else {
    const batches = [];
    for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
      batches.push(allKeywords.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n📡  Calling DataForSEO: ${batches.length} batch(es) of up to ${BATCH_SIZE}...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Batch ${i + 1}/${batches.length}: ${batch.length} keywords`);
      const result = await fetchSearchVolume(batch);

      if (result.status_code !== 20000) {
        console.error(`❌  API error (batch ${i + 1}):`, JSON.stringify(result));
        process.exit(1);
      }

      const task = result.tasks?.[0];
      if (task?.status_code !== 20000) {
        console.error(`❌  Task error: ${task?.status_message}`);
        process.exit(1);
      }

      rawResults.push(...(task?.result ?? []));
      if (i < batches.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`✓  Received data for ${rawResults.length} keywords`);
    fs.writeFileSync(rawPath, JSON.stringify(rawResults, null, 2));
    console.log(`✓  Raw results saved → ${rawPath}`);
  }

  // ── Build enrichment map ──────────────────────────────────────────────────
  const enrichmentMap = {};
  for (const item of rawResults) {
    if (!item?.keyword) continue;
    enrichmentMap[item.keyword.toLowerCase()] = {
      volume: item.search_volume ?? 0,
      kd: item.competition_index ?? 0,
      cpc: item.cpc ?? item.high_top_of_page_bid ?? 0,
    };
  }

  const enrichedClusters = clusters.map(c => {
    const data = enrichmentMap[c.primaryKeyword.toLowerCase()] ?? { volume: 0, kd: 0, cpc: 0 };
    return {
      primaryKeyword: c.primaryKeyword,
      secondaryKeywords: c.secondaryKeywords,
      volume: data.volume,
      kd: data.kd,
      cpc: data.cpc,
      priorityScore: Math.round(data.volume / Math.max(data.kd, 1)),
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // ── Save enrichment JSON ──────────────────────────────────────────────────
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outputMap = {};
  for (const c of enrichedClusters) {
    outputMap[c.primaryKeyword] = { volume: c.volume, kd: c.kd, cpc: c.cpc };
    for (const sk of c.secondaryKeywords) {
      const skData = enrichmentMap[sk.toLowerCase()];
      if (skData) outputMap[sk] = skData;
    }
  }

  const enrichPath = path.join(dataDir, 'keyword-enrichment.json');
  fs.writeFileSync(enrichPath, JSON.stringify(outputMap, null, 2));
  console.log(`✓  Enrichment map saved → ${enrichPath}`);

  // ── Print priority table ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(75));
  console.log(' TOP 30 PRIORITY KEYWORDS  (highest volume / lowest competition)');
  console.log('═'.repeat(75));
  console.log(` ${'Score'.padEnd(7)} ${'Vol/mo'.padEnd(8)} ${'KD'.padEnd(5)} ${'CPC'.padEnd(7)} Keyword`);
  console.log(' ' + '─'.repeat(70));

  for (const c of enrichedClusters.slice(0, 30)) {
    console.log(` ${String(c.priorityScore).padEnd(7)} ${String(c.volume).padEnd(8)} ${String(c.kd).padEnd(5)} ${'$' + c.cpc.toFixed(2).padEnd(6)} ${c.primaryKeyword}`);
  }

  console.log('\n── BOTTOM 10 ──');
  for (const c of enrichedClusters.slice(-10).reverse()) {
    console.log(` ${String(c.priorityScore).padEnd(7)} ${String(c.volume).padEnd(8)} ${String(c.kd).padEnd(5)}       ${c.primaryKeyword}`);
  }

  console.log('\n' + '═'.repeat(75));
  console.log(' ✅  Done. The scheduler will auto-prioritize by volume/KD.');
  console.log(`    Enrichment file: data/keyword-enrichment.json`);
  console.log('═'.repeat(75) + '\n');
}

main().catch(err => {
  console.error('❌  Fatal:', err.message);
  process.exit(1);
});
