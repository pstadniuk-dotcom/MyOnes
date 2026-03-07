#!/usr/bin/env node
/**
 * expand-keywords-v2.cjs — Step 1 + Step 2 keyword expansion
 *
 * Fills the gaps identified in keyword analysis:
 *   1. Timing/usage intent:  "when to take X", "best time to take X", "X morning or night"
 *   2. Combination intent:   "can you take X with Y", "X and Y together"
 *   3. Demographic intent:   "X for women", "X for men over 40", "X during pregnancy"
 *   4. Comparison intent:    "X vs Y", "X or Y"
 *   5. Trending topics:      adaptogens, nootropics, ozempic, functional medicine, etc.
 *   6. Long-tail buyer:      "best X supplement 2026", "X supplement review"
 *
 * Usage:
 *   node scripts/expand-keywords-v2.cjs --dry-run    # preview without API call
 *   node scripts/expand-keywords-v2.cjs              # fetch + upsert
 *   node scripts/expand-keywords-v2.cjs --suggest    # also print topic cluster suggestions
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
const SUGGEST  = process.argv.includes('--suggest');

// ══════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════════════════════════════════════

// Top 35 ingredients by search volume (from our DB analysis)
const TOP_INGREDIENTS = [
  'magnesium glycinate', 'vitamin d3', 'creatine monohydrate', 'vitamin c',
  'berberine', 'l-theanine', 'melatonin', 'magnesium citrate', 'collagen peptides',
  "lion's mane", 'coq10', 'ashwagandha', 'zinc', 'omega 3 fish oil',
  'probiotics', 'psyllium husk', 'iron', 'saw palmetto', 'maca root',
  'quercetin', 'resveratrol', 'curcumin turmeric', 'boron', 'spirulina',
  'magnesium l-threonate', 'nmn', 'l-glutamine', 'l-carnitine', 'nac',
  'vitamin b12', 'selenium', 'glutathione', 'fisetin', 'spermidine', 'dhea',
];

// Smaller set for combination queries (top 18)
const COMBO_INGREDIENTS = [
  'magnesium', 'vitamin d3', 'vitamin c', 'zinc', 'iron', 'omega 3',
  'ashwagandha', 'berberine', 'melatonin', 'coq10', 'curcumin',
  'l-theanine', 'creatine', 'collagen', 'probiotics', 'b12', 'nac', 'quercetin',
];

// Popular combination pairs people actually search for
const COMBO_PAIRS = [
  ['magnesium', 'vitamin d3'], ['magnesium', 'zinc'], ['vitamin d3', 'vitamin k2'],
  ['vitamin c', 'zinc'], ['vitamin c', 'iron'], ['ashwagandha', 'rhodiola'],
  ['ashwagandha', 'l-theanine'], ['berberine', 'milk thistle'], ['coq10', 'statins'],
  ['curcumin', 'black pepper'], ['omega 3', 'vitamin d3'], ['zinc', 'copper'],
  ['melatonin', 'magnesium'], ['l-theanine', 'caffeine'], ['iron', 'vitamin c'],
  ['probiotics', 'prebiotics'], ['nac', 'vitamin c'], ['creatine', 'protein'],
  ['collagen', 'vitamin c'], ['b12', 'folate'], ['vitamin d3', 'calcium'],
  ['magnesium', 'b6'], ['ashwagandha', 'magnesium'], ['quercetin', 'bromelain'],
  ['vitamin c', 'collagen'], ['zinc', 'vitamin c'], ['omega 3', 'coq10'],
  ['berberine', 'chromium'], ['nac', 'glutathione'], ['melatonin', 'l-theanine'],
  ['spirulina', 'chlorella'], ['lion\'s mane', 'reishi'], ['creatine', 'beta alanine'],
  ['vitamin d3', 'magnesium'], ['iron', 'b12'], ['saw palmetto', 'zinc'],
  ['maca', 'ashwagandha'], ['curcumin', 'omega 3'], ['probiotics', 'digestive enzymes'],
  ['dhea', 'pregnenolone'],
];

// Trending health topics NOT in our DB
const TRENDING_TOPICS = [
  // Category-level terms
  'adaptogens', 'adaptogenic herbs', 'best adaptogens for stress', 'adaptogen supplement stack',
  'nootropics', 'natural nootropics', 'best nootropics for focus', 'nootropic stack for ADHD',
  'nootropics for memory', 'amino acid supplement', 'essential amino acids supplement',
  'branched chain amino acids bcaa', 'electrolyte supplement', 'electrolyte powder',
  'best electrolyte supplement', 'electrolytes for fasting',

  // GLP-1 / Ozempic adjacents (massive trend 2025-2026)
  'ozempic natural alternative', 'natural GLP-1 supplement', 'GLP-1 agonist supplement',
  'berberine as ozempic alternative', 'supplements while on ozempic',
  'ozempic muscle loss supplement', 'semaglutide nutrient deficiency',
  'supplements for weight loss without ozempic', 'GLP-1 and gut health',

  // Functional / integrative medicine
  'functional medicine supplements', 'integrative medicine approach',
  'functional nutrition supplements', 'root cause medicine supplements',
  'functional medicine vs conventional medicine', 'integrative health supplements',

  // Lab / blood work (ties to our lab upload feature)
  'blood work interpretation guide', 'optimal lab ranges vs normal',
  'blood test results explained', 'functional medicine lab ranges',
  'what blood tests should I get annually', 'comprehensive metabolic panel explained',
  'complete blood count interpretation', 'optimal vitamin d level blood test',
  'ferritin optimal range', 'homocysteine optimal level', 'hs-CRP optimal range',
  'thyroid panel interpretation', 'testosterone blood test optimal range',

  // Methylation / genetics
  'methylation supplements', 'MTHFR supplements', 'MTHFR gene mutation supplements',
  'methylfolate vs folic acid', 'undermethylation supplements', 'overmethylation symptoms',
  'COMT gene supplements', 'nutrigenomics supplements',

  // Gut-brain axis
  'gut brain axis supplements', 'gut brain connection supplements',
  'psychobiotics for anxiety', 'microbiome supplement', 'gut health protocol',
  'leaky gut supplement protocol', 'leaky gut repair supplements',
  'gut lining repair supplement', 'zonulin supplement',

  // Biohacking
  'red light therapy benefits', 'red light therapy supplements',
  'cold plunge supplements', 'cold plunge recovery', 'sauna supplements',
  'grounding health benefits', 'biohacking supplements', 'biohacking stack',
  'longevity supplement stack', 'anti aging supplement protocol',
  'bryan johnson supplement stack', 'david sinclair supplement stack',
  'andrew huberman supplement list', 'peter attia supplement stack',

  // Hormonal health
  'andropause supplements', 'male menopause supplements', 'TRT alternative supplements',
  'natural testosterone booster that works', 'testosterone supplements men over 40',
  'HRT alternative supplements', 'hormone balance supplements women',
  'estrogen dominance supplements', 'progesterone support supplements',
  'seed cycling supplements', 'seed cycling for hormones', 'DIM supplement estrogen',

  // Diet-specific
  'carnivore diet supplements', 'carnivore diet nutrient deficiency',
  'keto supplements essential', 'keto electrolyte supplement',
  'vegan supplements essential', 'vegan b12 supplement', 'vegan omega 3 algae oil',
  'paleo diet supplements', 'mediterranean diet supplements',

  // Other trending
  'supplement timing chart', 'supplement interactions checker',
  'supplements that cancel each other out', 'what supplements should not be taken together',
  'morning supplement stack', 'evening supplement stack', 'supplement schedule daily',
  'supplements for desk workers', 'supplements for programmers',
  'supplements for entrepreneurs', 'CEO supplement stack',
  'supplements for students focus', 'supplements for gamers',

  // Competitor / brand terms
  'custom supplement company', 'personalized supplement service',
  'AI supplement recommendation', 'personalized vitamin quiz',
  'custom supplement formula', 'made to order supplements',
  'care of vitamins review', 'persona supplements review', 'rootine vitamins review',
  'ritual vitamins vs custom', 'thorne supplements review',
];

// Demographics × supplements (high commercial intent)
const DEMOGRAPHIC_KEYWORDS = [];
const demographics = [
  'women', 'men', 'women over 30', 'women over 40', 'women over 50',
  'men over 40', 'men over 50', 'men over 60', 'seniors', 'teenagers',
  'athletes', 'runners', 'bodybuilders', 'pregnant women', 'breastfeeding',
  'postpartum', 'perimenopause', 'menopause',
];
const demoTerms = ['supplements', 'vitamins', 'supplement stack', 'daily supplements'];
for (const demo of demographics) {
  for (const term of demoTerms) {
    DEMOGRAPHIC_KEYWORDS.push(`best ${term} for ${demo}`);
    DEMOGRAPHIC_KEYWORDS.push(`${term} for ${demo}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KEYWORD GENERATION
// ══════════════════════════════════════════════════════════════════════════════

function generateAllKeywords() {
  const kw = new Set();

  // ── 1. Timing / usage patterns ────────────────────────────────────────────
  const timingTemplates = [
    'when to take {i}',
    'best time to take {i}',
    '{i} morning or night',
    '{i} before bed',
    '{i} empty stomach or with food',
    '{i} on empty stomach',
    '{i} with food or without',
    'how long does {i} take to work',
    'how long for {i} to work',
    '{i} how long to see results',
    'loading dose {i}',
  ];
  for (const ing of TOP_INGREDIENTS) {
    for (const t of timingTemplates) {
      kw.add(t.replace('{i}', ing));
    }
  }

  // ── 2. Combination / interaction patterns ──────────────────────────────────
  for (const [a, b] of COMBO_PAIRS) {
    kw.add(`can you take ${a} and ${b} together`);
    kw.add(`${a} and ${b} together`);
    kw.add(`${a} vs ${b}`);
    kw.add(`${a} or ${b}`);
    kw.add(`${a} with ${b} benefits`);
    kw.add(`${a} ${b} interaction`);
  }

  // ── 3. Demographic patterns ────────────────────────────────────────────────
  for (const kwd of DEMOGRAPHIC_KEYWORDS) {
    kw.add(kwd);
  }
  // ingredient × demographic
  const shortDemos = ['for women', 'for men', 'for women over 40', 'for men over 50', 'during pregnancy', 'while breastfeeding', 'for seniors', 'for athletes'];
  for (const ing of TOP_INGREDIENTS.slice(0, 20)) {
    for (const demo of shortDemos) {
      kw.add(`${ing} ${demo}`);
    }
  }

  // ── 4. Comparison patterns (extra beyond combo pairs) ──────────────────────
  const comparisons = [
    'magnesium glycinate vs magnesium oxide', 'magnesium glycinate vs magnesium threonate',
    'vitamin d2 vs vitamin d3', 'methyl b12 vs cyanocobalamin',
    'ubiquinol vs ubiquinone', 'fish oil vs krill oil', 'fish oil vs algae oil',
    'whey protein vs collagen', 'myo-inositol vs d-chiro-inositol',
    'curcumin vs turmeric', 'ashwagandha ksm-66 vs sensoril',
    'creatine monohydrate vs creatine hcl', 'melatonin vs valerian root',
    'probiotics vs prebiotics', 'multivitamin vs individual supplements',
    'personalized supplements vs multivitamin', 'custom vitamins vs off the shelf',
    'nmn vs nr', 'resveratrol vs pterostilbene', 'liposomal vs regular supplements',
    'capsules vs tablets vs powder supplements', 'liquid vitamins vs capsules',
    'gummy vitamins vs capsules', 'whole food vitamins vs synthetic',
    'chelated minerals vs regular', 'methylated vitamins vs regular',
  ];
  for (const c of comparisons) kw.add(c);

  // ── 5. Trending topics ────────────────────────────────────────────────────
  for (const t of TRENDING_TOPICS) kw.add(t.toLowerCase());

  // ── 6. Long-tail buyer intent ──────────────────────────────────────────────
  for (const ing of TOP_INGREDIENTS.slice(0, 20)) {
    kw.add(`best ${ing} supplement 2026`);
    kw.add(`${ing} supplement review`);
    kw.add(`where to buy ${ing} supplement`);
    kw.add(`${ing} supplement third party tested`);
    kw.add(`pharmaceutical grade ${ing}`);
  }

  // ── 7. "What supplement for" condition queries ─────────────────────────────
  const conditions = [
    'anxiety', 'depression', 'sleep', 'insomnia', 'energy', 'fatigue',
    'brain fog', 'memory', 'focus', 'ADHD', 'stress',
    'weight loss', 'metabolism', 'appetite control', 'blood sugar',
    'inflammation', 'joint pain', 'arthritis', 'back pain',
    'gut health', 'bloating', 'constipation', 'IBS', 'acid reflux',
    'immune system', 'cold and flu', 'allergies', 'histamine intolerance',
    'hair loss', 'hair growth', 'skin health', 'acne', 'eczema',
    'heart health', 'high blood pressure', 'cholesterol',
    'thyroid', 'hypothyroid', 'hashimotos', 'adrenal fatigue',
    'testosterone', 'libido', 'fertility', 'PCOS', 'endometriosis',
    'perimenopause', 'menopause hot flashes', 'estrogen balance',
    'muscle recovery', 'muscle building', 'workout recovery',
    'liver detox', 'kidney health', 'lung health',
    'eye health', 'macular degeneration', 'dry eyes',
    'tinnitus', 'vertigo', 'neuropathy',
  ];
  for (const cond of conditions) {
    kw.add(`best supplement for ${cond}`);
    kw.add(`what to take for ${cond}`);
    kw.add(`natural remedy for ${cond}`);
    kw.add(`vitamins for ${cond}`);
  }

  return [...kw].filter(k => k.length > 5 && k.length < 200);
}

// ══════════════════════════════════════════════════════════════════════════════
// DataForSEO API
// ══════════════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════════════
// DB upsert
// ══════════════════════════════════════════════════════════════════════════════

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
    const res = await pool.query(`
      INSERT INTO keyword_data (keyword, volume, kd, cpc, competition, source, updated_at)
      VALUES ${vals.join(',')}
      ON CONFLICT (keyword) DO UPDATE SET
        volume=EXCLUDED.volume, kd=EXCLUDED.kd, cpc=EXCLUDED.cpc,
        competition=EXCLUDED.competition, source=EXCLUDED.source, updated_at=NOW()
    `, params);
    total += res.rowCount ?? 0;
  }
  return total;
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const keywords = generateAllKeywords();
  console.log(`\n✦ Generated ${keywords.length} keyword variations`);
  console.log(`  ├─ timing/usage patterns`);
  console.log(`  ├─ combination & interaction queries`);
  console.log(`  ├─ demographic intent`);
  console.log(`  ├─ comparisons`);
  console.log(`  ├─ trending health topics`);
  console.log(`  ├─ long-tail buyer intent`);
  console.log(`  └─ condition → supplement queries`);

  // Deduplicate against existing DB keywords
  let skip = new Set();
  try {
    const { rows } = await pool.query('SELECT keyword FROM keyword_data');
    rows.forEach(r => skip.add(r.keyword.toLowerCase()));
    console.log(`\n✦ ${skip.size} keywords already in DB — skipping those`);
  } catch { /* table not yet created */ }

  const newKeywords = keywords.filter(k => !skip.has(k.toLowerCase()));
  console.log(`✦ Net new keywords to fetch: ${newKeywords.length}`);
  console.log(`✦ Estimated cost: ~$${(newKeywords.length * 0.0015).toFixed(2)}`);

  if (DRY_RUN) {
    console.log('\n── DRY RUN — sample keywords ─────────────────────────────');

    // Group by category for preview
    const categories = {
      'Timing':      newKeywords.filter(k => /when to take|best time|morning or night|empty stomach|how long|before bed|loading dose/.test(k)),
      'Combinations': newKeywords.filter(k => /together|interaction$|can you take.*and/.test(k)),
      'Comparisons':  newKeywords.filter(k => / vs | or /.test(k)),
      'Demographics': newKeywords.filter(k => /for women|for men|pregnancy|breastfeed|seniors|athletes|over \d/.test(k)),
      'Trending':     newKeywords.filter(k => /ozempic|glp-1|adaptogen|nootropic|biohack|functional medicine|blood work|methylation|gut.brain|huberman|sinclair|attia|carnivore|seed cycling/.test(k)),
      'Conditions':   newKeywords.filter(k => /best supplement for|what to take for|natural remedy for|vitamins for/.test(k)),
      'Buyer':        newKeywords.filter(k => /2026|review|where to buy|third party|pharmaceutical grade/.test(k)),
    };

    for (const [cat, kws] of Object.entries(categories)) {
      console.log(`\n  ${cat} (${kws.length}):`);
      kws.slice(0, 8).forEach(k => console.log(`    ${k}`));
      if (kws.length > 8) console.log(`    ...and ${kws.length - 8} more`);
    }
    console.log(`\n  Total new: ${newKeywords.length}`);
    await pool.end();
    return;
  }

  if (!LOGIN || !PASSWORD) {
    console.error('\n✗ Missing DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD in server/.env');
    process.exit(1);
  }

  // Fetch in batches of 700
  const BATCH = 700;
  const allRaw = [];
  const batches = [];
  for (let i = 0; i < newKeywords.length; i += BATCH) batches.push(newKeywords.slice(i, i + BATCH));

  console.log(`\n✦ Calling DataForSEO: ${batches.length} batch(es)...`);
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

  // Save raw
  const rawPath = path.join(__dirname, 'expand-v2-raw.json');
  fs.writeFileSync(rawPath, JSON.stringify(allRaw, null, 2));
  console.log(`\n✦ Raw data saved → ${rawPath}`);

  const upserted = await upsertBatch(allRaw);
  console.log(`✦ ${upserted} rows upserted into keyword_data`);

  // Stats
  const stats = await pool.query(`
    SELECT COUNT(*) total,
           COUNT(*) FILTER (WHERE volume > 0) with_vol,
           COUNT(*) FILTER (WHERE volume >= 1000 AND kd <= 40) easy_wins,
           COUNT(*) FILTER (WHERE volume >= 5000 AND kd <= 30) sweet_spot
    FROM keyword_data
  `);
  const s = stats.rows[0];
  console.log(`\n✦ DATABASE TOTALS:`);
  console.log(`  Total:      ${s.total}`);
  console.log(`  With volume: ${s.with_vol}`);
  console.log(`  Easy wins:   ${s.easy_wins}`);
  console.log(`  Sweet spot:  ${s.sweet_spot}`);

  // Top new opportunities from this batch
  const newKwSet = new Set(newKeywords.map(k => k.toLowerCase()));
  const { rows: top } = await pool.query(`
    SELECT keyword, volume, kd, cpc::float,
           ROUND(volume::numeric / GREATEST(kd, 1)) AS score
    FROM keyword_data
    WHERE volume >= 200 AND kd <= 50
    ORDER BY score DESC
    LIMIT 60
  `);
  const freshHits = top.filter(r => newKwSet.has(r.keyword.toLowerCase()));
  console.log(`\n══════════════════════════════════════════════════════════════`);
  console.log(` NEW OPPORTUNITIES FROM THIS BATCH (top 40)`);
  console.log(`══════════════════════════════════════════════════════════════`);
  freshHits.slice(0, 40).forEach(r => {
    console.log(`  ${String(r.score).padStart(7)} | vol:${String(r.volume).padStart(7)} | KD:${String(r.kd).padStart(3)} | $${Number(r.cpc).toFixed(2).padStart(5)} | ${r.keyword}`);
  });

  if (SUGGEST) {
    const { rows: sugg } = await pool.query(`
      SELECT keyword, volume, kd, ROUND(volume::numeric / GREATEST(kd,1)) AS score
      FROM keyword_data WHERE volume >= 1000 AND kd <= 35
      ORDER BY score DESC LIMIT 50
    `);
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(' SUGGESTED TOPIC CLUSTERS');
    console.log('════════════════════════════════════════════════════════════════');
    for (const r of sugg) {
      const kw = r.keyword;
      const title = kw.charAt(0).toUpperCase() + kw.slice(1);
      console.log(`  { tier: 'ingredient', title: '${title}: Evidence-Based Guide', category: 'Supplements', primaryKeyword: '${kw}', secondaryKeywords: [] },`);
    }
  }

  console.log('\n✦ Done.\n');
  await pool.end();
}

main().catch(err => {
  console.error('✗ Fatal:', err.message);
  pool.end();
  process.exit(1);
});
