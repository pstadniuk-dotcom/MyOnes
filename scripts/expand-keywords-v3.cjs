#!/usr/bin/env node
/**
 * expand-keywords-v3.cjs — Iterative expansion from v2 winners
 *
 * Strategy:
 *   1. Fill 147 missing ingredient×pattern combos (low-KD goldmines)
 *   2. New trending ingredients with 0 coverage (sea moss, shilajit, tongkat ali, etc.)
 *   3. "Foods high in X" / "natural sources of X" informational queries
 *   4. Safety/overdose queries: "too much X", "X overdose", "X withdrawal"
 *   5. More "how long does X take to work" (KD 2-4 goldmine pattern)
 *   6. "Is X safe" / "is X good for you" queries (avg KD 9)
 *   7. Stack/protocol queries: "X stack", "X protocol"
 *
 * Usage:
 *   node scripts/expand-keywords-v3.cjs --dry-run    # preview without API
 *   node scripts/expand-keywords-v3.cjs              # fetch + upsert
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

// ══════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════════════════════════════════════

// Top 15 ingredients that already have volume — fill missing patterns
const CORE_INGREDIENTS = [
  'magnesium glycinate', 'vitamin d3', 'ashwagandha', 'creatine monohydrate',
  'omega 3', 'zinc', 'melatonin', 'collagen peptides', 'vitamin b12',
  'turmeric', 'iron', 'probiotics', 'l-theanine', 'berberine', 'coq10',
];

// Extended ingredients — popular but less covered
const EXTENDED_INGREDIENTS = [
  'magnesium citrate', 'magnesium l-threonate', 'vitamin c', 'vitamin b6',
  'vitamin k2', 'vitamin e', 'biotin', 'rhodiola rosea', 'maca root',
  'saw palmetto', 'psyllium husk', 'spirulina', 'chlorella', 'quercetin',
  'resveratrol', 'curcumin', 'nac', 'glutathione', 'lion\'s mane',
  'reishi mushroom', 'cordyceps', 'elderberry', 'echinacea',
  'glucosamine', 'msm', 'selenium', 'chromium', 'folate',
  'l-carnitine', 'l-glutamine', 'boron', 'dhea',
];

// Trending ingredients with ZERO keywords (massive opportunity)
const ZERO_COVERAGE_INGREDIENTS = [
  'sea moss', 'shilajit', 'tongkat ali', 'fadogia agrestis', 'turkesterone',
  'apigenin', 'magnesium taurate', 'black seed oil',
];

// Additional trending ingredients people are searching for right now
const VIRAL_INGREDIENTS = [
  'cistanche', 'ecdysterone', 'tart cherry extract', 'pine bark extract',
  'diindolylmethane dim', 'pregnenolone', 'palmitoylethanolamide pea',
  'urolithin a', 'nattokinase', 'serrapeptase', 'tudca', 'ox bile',
  'betaine hcl', 'digestive enzymes', 'activated charcoal', 'benfotiamine',
  'sulforaphane', 'pterostilbene', 'astaxanthin', 'pqq',
  'black cohosh', 'chaste tree vitex', 'dong quai', 'evening primrose oil',
  'saw palmetto', 'pygeum', 'stinging nettle root', 'beta sitosterol',
];

// ══════════════════════════════════════════════════════════════════════════════
// PATTERN GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

function generateKeywords() {
  const kws = new Set();

  // ─── 1. Missing ingredient×pattern combos (from analysis: 147 missing) ───
  const MISSING_PATTERNS = [
    'foods high in %', '% natural sources', 'natural sources of %',
    '% too much', 'too much %', '% overdose', '% overdose symptoms',
    '% with food or empty stomach',
    '% recommended daily intake', 'recommended daily intake of %',
    '% for hair growth', '% for skin', '% for skin health',
    '% withdrawal', '% withdrawal symptoms',
  ];

  for (const ing of CORE_INGREDIENTS) {
    for (const pat of MISSING_PATTERNS) {
      kws.add(pat.replace('%', ing));
    }
  }

  // ─── 2. "How long does X take to work" — KD 2-4 goldmine ───
  const HOW_LONG_INGREDIENTS = [
    ...CORE_INGREDIENTS,
    'magnesium citrate', 'magnesium l-threonate', 'vitamin c', 'vitamin b6',
    'rhodiola', 'maca', 'saw palmetto', 'spirulina', 'nac',
    'glutathione', 'lion\'s mane', 'reishi', 'cordyceps', 'elderberry',
    'glucosamine', 'msm', 'quercetin', 'resveratrol', 'curcumin',
    'biotin', 'selenium', 'chromium', 'l-carnitine', 'l-glutamine',
    'shilajit', 'tongkat ali', 'sea moss', 'black seed oil',
    'fadogia agrestis', 'turkesterone', 'apigenin',
  ];

  for (const ing of HOW_LONG_INGREDIENTS) {
    kws.add(`how long does ${ing} take to work`);
    kws.add(`how long for ${ing} to work`);
    kws.add(`how quickly does ${ing} work`);
    kws.add(`${ing} how long to see results`);
  }

  // ─── 3. Side effects (avg KD 7 — second-best pattern) ───
  for (const ing of [...EXTENDED_INGREDIENTS, ...ZERO_COVERAGE_INGREDIENTS]) {
    kws.add(`${ing} side effects`);
    kws.add(`${ing} side effects long term`);
    kws.add(`is ${ing} safe`);
    kws.add(`is ${ing} safe to take daily`);
  }

  // ─── 4. Deficiency/symptoms (avg KD 4 — best pattern!) ───
  const DEFICIENCY_NUTRIENTS = [
    'vitamin d', 'vitamin b12', 'vitamin c', 'vitamin b6', 'vitamin b1',
    'vitamin a', 'vitamin e', 'vitamin k', 'iron', 'zinc', 'magnesium',
    'selenium', 'iodine', 'potassium', 'calcium', 'folate', 'chromium',
    'copper', 'manganese', 'omega 3', 'vitamin b2', 'vitamin b3',
    'phosphorus', 'sodium', 'chloride', 'molybdenum', 'biotin',
  ];

  for (const nut of DEFICIENCY_NUTRIENTS) {
    kws.add(`${nut} deficiency symptoms`);
    kws.add(`${nut} deficiency causes`);
    kws.add(`${nut} deficiency treatment`);
    kws.add(`low ${nut} symptoms`);
    kws.add(`signs of ${nut} deficiency`);
    kws.add(`${nut} deficiency in women`);
    kws.add(`${nut} deficiency in men`);
    kws.add(`${nut} rich foods`);
  }

  // ─── 5. Zero-coverage trending ingredients — full template ───
  const FULL_TEMPLATE = [
    '% benefits', '% side effects', '% dosage', '% supplement',
    '% for men', '% for women', '% for sleep', '% for energy',
    '% for muscle growth', '% for testosterone', '% for weight loss',
    '% vs %ALT%',  // handled separately below
    'how long does % take to work', 'when to take %', 'best time to take %',
    '% with food or empty stomach', '% reviews', 'best % supplement',
    '% before bed', '% in the morning', '% and caffeine',
    'is % safe', 'is % worth it', '% daily dose', '% loading dose',
    '% safety', '% interactions', '% and alcohol',
  ];

  // Comparison pairs for trending ingredients
  const TRENDING_COMPARISONS = [
    ['tongkat ali', 'ashwagandha'],
    ['tongkat ali', 'fadogia agrestis'],
    ['shilajit', 'ashwagandha'],
    ['shilajit', 'tongkat ali'],
    ['turkesterone', 'creatine'],
    ['turkesterone', 'ecdysterone'],
    ['sea moss', 'spirulina'],
    ['sea moss', 'chlorella'],
    ['apigenin', 'melatonin'],
    ['apigenin', 'magnesium'],
    ['black seed oil', 'fish oil'],
    ['black seed oil', 'turmeric'],
    ['magnesium taurate', 'magnesium glycinate'],
    ['cistanche', 'tongkat ali'],
    ['nattokinase', 'serrapeptase'],
    ['urolithin a', 'resveratrol'],
    ['tudca', 'milk thistle'],
    ['sulforaphane', 'broccoli sprouts'],
    ['astaxanthin', 'coq10'],
  ];

  for (const ing of ZERO_COVERAGE_INGREDIENTS) {
    for (const pat of FULL_TEMPLATE) {
      if (pat.includes('%ALT%')) continue; // skip comparison template
      kws.add(pat.replace('%', ing));
    }
  }

  // Add trending comparisons
  for (const [a, b] of TRENDING_COMPARISONS) {
    kws.add(`${a} vs ${b}`);
    kws.add(`${b} vs ${a}`);
    kws.add(`${a} or ${b}`);
  }

  // ─── 6. Viral ingredients — core queries ───
  for (const ing of VIRAL_INGREDIENTS) {
    kws.add(`${ing} benefits`);
    kws.add(`${ing} side effects`);
    kws.add(`${ing} supplement`);
    kws.add(`${ing} dosage`);
    kws.add(`best ${ing} supplement`);
    kws.add(`is ${ing} safe`);
    kws.add(`how long does ${ing} take to work`);
    kws.add(`${ing} for women`);
    kws.add(`${ing} for men`);
    kws.add(`when to take ${ing}`);
  }

  // ─── 7. "Is X good for you" / safety queries (avg KD 9) ───
  const IS_QUESTIONS = [
    ...CORE_INGREDIENTS, ...ZERO_COVERAGE_INGREDIENTS,
    'creatine', 'collagen', 'melatonin', 'turmeric',
    'fish oil', 'multivitamin', 'protein powder',
  ];

  for (const ing of IS_QUESTIONS) {
    kws.add(`is ${ing} good for you`);
    kws.add(`is ${ing} bad for you`);
    kws.add(`is ${ing} bad for your liver`);
    kws.add(`is ${ing} bad for your kidneys`);
    kws.add(`does ${ing} really work`);
    kws.add(`${ing} pros and cons`);
  }

  // ─── 8. Stack/protocol queries ───
  const STACK_TERMS = [
    'sleep supplement stack', 'energy supplement stack', 'focus supplement stack',
    'anxiety supplement stack', 'hormone balance supplement stack',
    'testosterone supplement stack', 'longevity supplement stack',
    'anti aging supplement stack', 'joint supplement stack', 'gut health supplement stack',
    'immune support supplement stack', 'skin health supplement stack',
    'hair growth supplement stack', 'weight loss supplement stack',
    'muscle building supplement stack', 'recovery supplement stack',
    'stress relief supplement stack', 'brain health supplement stack',
    'heart health supplement stack', 'bone density supplement stack',
    'morning supplement routine', 'evening supplement routine',
    'supplement routine for beginners', 'daily supplement schedule',
    'how to build a supplement stack', 'supplement stacking guide',
    'supplement timing guide', 'when to take each supplement',
    'supplement hierarchy of importance', 'most important supplements to take',
    'essential supplements everyone should take', 'essential supplements for men',
    'essential supplements for women', 'essential supplements for over 40',
    'essential supplements for over 50', 'essential supplements for athletes',
    'personalized supplement plan', 'custom supplement formula',
    'AI supplement recommendation', 'personalized vitamin quiz',
  ];

  for (const term of STACK_TERMS) {
    kws.add(term);
  }

  // ─── 9. "Best X for Y" (high-intent, usually moderate KD) ───
  const BEST_FOR_QUERIES = [
    ['magnesium', ['sleep', 'anxiety', 'muscle cramps', 'migraines', 'constipation', 'heart health', 'blood pressure']],
    ['vitamin d3', ['immune system', 'bone health', 'depression', 'skin', 'energy']],
    ['probiotics', ['bloating', 'ibs', 'constipation', 'diarrhea', 'weight loss', 'skin', 'mental health', 'women', 'men', 'babies', 'dogs']],
    ['collagen', ['skin', 'joints', 'hair', 'nails', 'gut health', 'weight loss', 'wrinkles']],
    ['omega 3', ['brain health', 'heart health', 'inflammation', 'joints', 'skin', 'depression', 'pregnancy']],
    ['zinc', ['acne', 'immune system', 'testosterone', 'skin', 'hair loss', 'cold']],
    ['ashwagandha', ['anxiety', 'sleep', 'testosterone', 'weight loss', 'muscle building', 'cortisol', 'thyroid']],
    ['iron', ['anemia', 'energy', 'hair loss', 'pregnancy', 'vegetarians']],
    ['creatine', ['brain', 'women', 'beginners', 'weight loss', 'muscle growth', 'recovery']],
    ['melatonin', ['jet lag', 'shift workers', 'kids', 'toddlers', 'dogs', 'anxiety']],
  ];

  for (const [ing, useCases] of BEST_FOR_QUERIES) {
    for (const uc of useCases) {
      kws.add(`best ${ing} for ${uc}`);
      kws.add(`${ing} for ${uc}`);
      kws.add(`does ${ing} help with ${uc}`);
    }
  }

  // ─── 10. Absorption/bioavailability queries ───
  const ABSORPTION_INGREDIENTS = [
    'magnesium', 'iron', 'zinc', 'calcium', 'vitamin d', 'vitamin c',
    'curcumin', 'coq10', 'collagen', 'omega 3', 'vitamin b12',
    'glutathione', 'resveratrol', 'quercetin',
  ];

  for (const ing of ABSORPTION_INGREDIENTS) {
    kws.add(`${ing} absorption`);
    kws.add(`how to increase ${ing} absorption`);
    kws.add(`best form of ${ing}`);
    kws.add(`most bioavailable ${ing}`);
    kws.add(`${ing} bioavailability`);
    kws.add(`what blocks ${ing} absorption`);
    kws.add(`what helps ${ing} absorption`);
  }

  // ─── 11. Age-specific queries ───
  const AGE_QUERIES = [
    'supplements for men over 30', 'supplements for men over 40',
    'supplements for men over 50', 'supplements for men over 60',
    'supplements for women over 30', 'supplements for women over 40',
    'supplements for women over 50', 'supplements for women over 60',
    'supplements for women in their 20s', 'supplements for men in their 20s',
    'supplements for seniors', 'supplements for elderly',
    'supplements for teenagers', 'supplements for college students',
    'best vitamins for men over 40', 'best vitamins for women over 40',
    'best vitamins for men over 50', 'best vitamins for women over 50',
    'supplements for perimenopause', 'supplements for menopause',
    'supplements for postmenopause', 'supplements for andropause',
  ];

  for (const q of AGE_QUERIES) kws.add(q);

  // ─── 12. Form comparison queries ───
  const FORM_COMPARISONS = [
    'magnesium glycinate vs citrate', 'magnesium glycinate vs oxide',
    'magnesium citrate vs oxide', 'magnesium threonate vs glycinate',
    'magnesium taurate vs glycinate', 'magnesium malate vs glycinate',
    'vitamin d2 vs d3', 'vitamin d3 drops vs capsules',
    'fish oil vs krill oil', 'fish oil vs cod liver oil',
    'whey protein vs plant protein', 'collagen powder vs capsules',
    'collagen type 1 vs type 2', 'collagen type 1 vs type 3',
    'methylcobalamin vs cyanocobalamin', 'methylfolate vs folic acid',
    'ferrous sulfate vs ferrous gluconate', 'iron bisglycinate vs ferrous sulfate',
    'zinc picolinate vs zinc gluconate', 'zinc citrate vs zinc picolinate',
    'ashwagandha ksm-66 vs sensoril', 'ashwagandha root vs leaf extract',
    'turmeric vs curcumin', 'turmeric capsules vs powder',
    'coq10 ubiquinol vs ubiquinone', 'probiotics capsules vs powder',
    'cbd oil vs capsules', 'liquid vitamins vs pills',
    'gummy vitamins vs tablets', 'liposomal vitamin c vs regular',
    'liposomal glutathione vs regular', 'liposomal coq10 vs regular',
  ];

  for (const q of FORM_COMPARISONS) kws.add(q);

  // ─── 13. Condition-specific supplement roundups ───
  const CONDITION_QUERIES = [
    'supplements for hashimoto', 'supplements for hypothyroidism',
    'supplements for hyperthyroidism', 'supplements for pcos',
    'supplements for endometriosis', 'supplements for fibromyalgia',
    'supplements for chronic fatigue', 'supplements for chronic fatigue syndrome',
    'supplements for adrenal fatigue', 'supplements for brain fog',
    'supplements for joint pain', 'supplements for back pain',
    'supplements for arthritis', 'supplements for osteoporosis',
    'supplements for blood pressure', 'supplements for cholesterol',
    'supplements for insulin resistance', 'supplements for blood sugar',
    'supplements for type 2 diabetes', 'supplements for pre diabetes',
    'supplements for fatty liver', 'supplements for liver health',
    'supplements for kidney health', 'supplements for eye health',
    'supplements for macular degeneration', 'supplements for tinnitus',
    'supplements for vertigo', 'supplements for neuropathy',
    'supplements for nerve pain', 'supplements for inflammation',
    'supplements for autoimmune disease', 'supplements for lupus',
    'supplements for crohn\'s disease', 'supplements for ulcerative colitis',
    'supplements for ibs', 'supplements for acid reflux',
    'supplements for bloating', 'supplements for constipation',
    'supplements for leaky gut', 'supplements for candida',
    'supplements for sibo', 'supplements for h pylori',
    'supplements for eczema', 'supplements for psoriasis',
    'supplements for acne', 'supplements for rosacea',
    'supplements for depression', 'supplements for anxiety',
    'supplements for ocd', 'supplements for adhd',
    'supplements for bipolar', 'supplements for insomnia',
    'supplements for stress', 'supplements for burnout',
    'supplements for recovery after surgery', 'supplements for post covid',
    'supplements for long covid', 'supplements after antibiotics',
    'supplements for fertility women', 'supplements for fertility men',
    'supplements for pregnancy first trimester', 'supplements for breastfeeding',
    'supplements for postpartum', 'supplements for egg quality',
    'supplements for sperm quality', 'supplements for libido women',
    'supplements for libido men', 'supplements for erectile dysfunction',
  ];

  for (const q of CONDITION_QUERIES) kws.add(q);

  // ─── 14. "What does X do" / educational intent ───
  for (const ing of [...CORE_INGREDIENTS, ...ZERO_COVERAGE_INGREDIENTS, 'creatine', 'collagen', 'turmeric', 'fish oil']) {
    kws.add(`what does ${ing} do`);
    kws.add(`what is ${ing} used for`);
    kws.add(`what is ${ing} good for`);
    kws.add(`${ing} uses`);
    kws.add(`${ing} benefits and side effects`);
    kws.add(`${ing} interactions with medications`);
  }

  return kws;
}

// ══════════════════════════════════════════════════════════════════════════════
// API HELPERS (same as v2)
// ══════════════════════════════════════════════════════════════════════════════

function fetchVolume(keywords) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{
      keywords,
      location_code: 2840,
      language_code: 'en',
      date_from: '2025-03-01',
      date_to: '2026-02-28',
    }]);

    const options = {
      hostname: 'api.dataforseo.com',
      path: '/v3/keywords_data/google_ads/search_volume/live',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64'),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse error: ' + data.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function esc(str) {
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function upsert(rows) {
  if (!rows.length) return 0;
  const values = rows
    .map(
      (r) =>
        `(${esc(r.keyword)}, ${r.volume ?? 0}, ${r.kd ?? 0}, ${r.cpc ?? 0}, ${esc(r.competition ?? 'UNSPECIFIED')}, 'v3-expansion')`
    )
    .join(',\n');

  const sql = `
    INSERT INTO keyword_data (keyword, volume, kd, cpc, competition, source)
    VALUES ${values}
    ON CONFLICT (keyword)
    DO UPDATE SET volume = EXCLUDED.volume, kd = EXCLUDED.kd,
                  cpc = EXCLUDED.cpc, competition = EXCLUDED.competition,
                  source = EXCLUDED.source, updated_at = NOW()
  `;
  await pool.query(sql);
  return rows.length;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const allKws = generateKeywords();
  console.log(`Generated ${allKws.size} raw keywords`);

  // De-duplicate against existing DB
  const existing = await pool.query('SELECT keyword FROM keyword_data');
  const existingSet = new Set(existing.rows.map((r) => r.keyword.toLowerCase()));

  const newKws = [...allKws].filter((k) => !existingSet.has(k.toLowerCase()));
  console.log(`After de-dup: ${newKws.length} net new keywords (${allKws.size - newKws.length} already in DB)`);

  const cost = (newKws.length * 0.0015).toFixed(2);
  console.log(`Estimated cost: $${cost}`);

  if (DRY_RUN) {
    console.log('\n=== DRY RUN — Sample of new keywords ===');
    // Show category breakdown
    const categories = {
      'foods/sources': newKws.filter(k => k.includes('foods high') || k.includes('natural sources') || k.includes('rich foods')),
      'safety/overdose': newKws.filter(k => k.includes('overdose') || k.includes('too much') || k.includes('withdrawal') || k.includes('safe')),
      'how long': newKws.filter(k => k.startsWith('how long') || k.includes('how quickly')),
      'side effects': newKws.filter(k => k.includes('side effects')),
      'deficiency': newKws.filter(k => k.includes('deficiency') || k.includes('low ')),
      'best X for Y': newKws.filter(k => k.startsWith('best ') || k.startsWith('does ')),
      'stacks/protocols': newKws.filter(k => k.includes('stack') || k.includes('protocol') || k.includes('routine')),
      'trending ingredients': newKws.filter(k => {
        const tr = ['sea moss','shilajit','tongkat ali','fadogia','turkesterone','apigenin','cistanche','ecdysterone','nattokinase','urolithin','tudca','sulforaphane'];
        return tr.some(t => k.includes(t));
      }),
      'form comparisons': newKws.filter(k => k.includes(' vs ')),
      'conditions': newKws.filter(k => k.startsWith('supplements for ')),
      'absorption': newKws.filter(k => k.includes('absorption') || k.includes('bioavail')),
      'age-specific': newKws.filter(k => k.includes('over 3') || k.includes('over 4') || k.includes('over 5') || k.includes('over 6') || k.includes('seniors')),
    };

    for (const [cat, items] of Object.entries(categories)) {
      console.log(`\n  ${cat}: ${items.length} keywords`);
      items.slice(0, 5).forEach(k => console.log(`    - ${k}`));
      if (items.length > 5) console.log(`    ... and ${items.length - 5} more`);
    }

    console.log(`\nTotal categorized: ${Object.values(categories).reduce((s, a) => s + a.length, 0)}`);
    console.log(`Uncategorized: ${newKws.length - Object.values(categories).reduce((s, a) => s + a.length, 0)}`);

    await pool.end();
    return;
  }

  // Fetch in batches of 700
  const BATCH = 700;
  let totalUpserted = 0;
  const allResults = [];

  for (let i = 0; i < newKws.length; i += BATCH) {
    const batch = newKws.slice(i, i + BATCH);
    console.log(`\nBatch ${Math.floor(i / BATCH) + 1}/${Math.ceil(newKws.length / BATCH)}: ${batch.length} keywords...`);

    const resp = await fetchVolume(batch);

    if (!resp.tasks?.[0]?.result) {
      console.error('API error:', JSON.stringify(resp.tasks?.[0]?.status_message || resp));
      continue;
    }

    const items = resp.tasks[0].result;
    const rows = items.map((r) => ({
      keyword: r.keyword,
      volume: r.search_volume ?? 0,
      kd: r.keyword_info?.keyword_difficulty ?? 0,
      cpc: r.keyword_info?.cpc ?? 0,
      competition: r.keyword_info?.competition ?? 'UNSPECIFIED',
    }));

    allResults.push(...rows);
    const n = await upsert(rows);
    totalUpserted += n;

    const withVol = rows.filter((r) => r.volume > 0).length;
    console.log(`  Upserted ${n}, ${withVol}/${rows.length} have volume`);

    // Rate limit
    if (i + BATCH < newKws.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Save raw results
  fs.writeFileSync(
    path.join(__dirname, 'expand-v3-raw.json'),
    JSON.stringify(allResults, null, 2)
  );
  console.log(`\nSaved raw results to scripts/expand-v3-raw.json`);

  // Show top new discoveries
  const topNew = allResults
    .filter((r) => r.volume >= 500)
    .sort((a, b) => {
      const sa = a.volume / Math.max(a.kd, 1);
      const sb = b.volume / Math.max(b.kd, 1);
      return sb - sa;
    })
    .slice(0, 30);

  console.log('\n=== TOP 30 NEW DISCOVERIES ===');
  topNew.forEach((r, i) => {
    const score = Math.round(r.volume / Math.max(r.kd, 1));
    console.log(`${i + 1}. ${r.keyword} (vol:${r.volume}, KD:${r.kd}, CPC:$${r.cpc}, score:${score})`);
  });

  // DB summary
  const stats = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN volume > 0 THEN 1 ELSE 0 END) as with_volume,
      SUM(CASE WHEN volume >= 1000 AND kd <= 40 THEN 1 ELSE 0 END) as easy_wins,
      SUM(CASE WHEN volume >= 5000 AND kd <= 30 THEN 1 ELSE 0 END) as sweet_spot,
      SUM(CASE WHEN volume >= 10000 THEN 1 ELSE 0 END) as high_volume
    FROM keyword_data
  `);
  const s = stats.rows[0];
  console.log(`\n=== DB TOTALS ===`);
  console.log(`Total: ${s.total} | With volume: ${s.with_volume} | Easy wins: ${s.easy_wins} | Sweet spot: ${s.sweet_spot} | High volume: ${s.high_volume}`);
  console.log(`Total upserted this run: ${totalUpserted}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
