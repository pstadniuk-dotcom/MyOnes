#!/usr/bin/env node
/**
 * Ingredient keyword expansion script.
 *
 * Strategy:
 *   1. Pull all ingredient + system blend names from shared/ingredients.ts
 *   2. Generate ~15 seed keyword variations per ingredient
 *   3. Bulk-fetch search volume + KD from DataForSEO (search_volume endpoint)
 *   4. Upsert everything into keyword_data table
 *   5. Print top candidates for new blog topics (high volume, KD < 40)
 *   6. Optionally write suggested new topic clusters to stdout for copy-paste
 *
 * Cost estimate: ~3,000 keywords × $0.0015 ≈ $4.50
 *
 * Usage:
 *   node scripts/expand-keywords.cjs              # fetch + seed
 *   node scripts/expand-keywords.cjs --dry-run    # show keywords without calling API
 *   node scripts/expand-keywords.cjs --suggest    # also print new topic cluster suggestions
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

// ── Ingredient data ──────────────────────────────────────────────────────────

// System blends
const SYSTEM_BLENDS = [
  'Adrenal Support', 'Beta Max', 'C Boost', 'Endocrine Support', 'Heart Support',
  'Histamine Support', 'Immune-C', 'Kidney Bladder Support', 'Ligament Support',
  'Liver Support', 'Lung Support', 'Magnesium Complex', 'Mold RX', 'Para X',
  'Prostate Support', 'Ovary Uterus Support', 'Thyroid Support', 'Spleen Support',
];

// Core individual ingredients — canonical US spellings, supplement-grade names
const INDIVIDUAL_INGREDIENTS = [
  'Ashwagandha KSM-66', 'Rhodiola rosea', 'Holy basil tulsi', 'Eleuthero Siberian ginseng',
  'Panax ginseng Korean red ginseng', 'Schisandra berry', 'Maca root', 'Astragalus root',
  'Mucuna pruriens', 'Morinda noni root',
  // Mushrooms
  "Lion's mane mushroom", 'Reishi mushroom', 'Chaga mushroom', 'Cordyceps mushroom',
  'Turkey tail mushroom', 'Beta glucan',
  // Vitamins
  'Vitamin D3', 'Vitamin K2 MK-7', 'Vitamin C', 'Vitamin A retinol', 'Vitamin E tocopherol',
  'Thiamine vitamin B1', 'Riboflavin vitamin B2', 'Niacin vitamin B3',
  'Pantothenic acid vitamin B5', 'Pyridoxine vitamin B6', 'Biotin vitamin B7',
  'Methylfolate vitamin B9', 'Methylcobalamin vitamin B12',
  // Minerals
  'Magnesium glycinate', 'Magnesium malate', 'Magnesium citrate', 'Magnesium l-threonate',
  'Zinc picolinate', 'Zinc bisglycinate', 'Selenium selenomethionine',
  'Iron bisglycinate', 'Calcium hydroxyapatite', 'Potassium citrate', 'Iodine kelp',
  'Chromium picolinate', 'Boron', 'Manganese', 'Molybdenum', 'Vanadium', 'Copper',
  // Amino acids
  'L-glutamine', 'L-theanine', 'L-carnitine', 'Acetyl L-carnitine ALCAR',
  'N-acetyl cysteine NAC', 'Alpha lipoic acid ALA', 'Glycine', 'Taurine',
  'L-arginine', 'L-citrulline', 'GABA supplement', '5-HTP', 'L-tryptophan',
  'Phosphatidylserine', 'Phosphatidylcholine', 'Choline bitartrate', 'CDP choline',
  // Fatty acids / lipids
  'Omega 3 fish oil EPA DHA', 'Krill oil', 'Algae oil DHA', 'GLA evening primrose oil',
  'CLA conjugated linoleic acid',
  // Popular supplements
  'Coenzyme Q10 CoQ10', 'Ubiquinol', 'NMN nicotinamide mononucleotide',
  'NR nicotinamide riboside', 'NAD supplement', 'Resveratrol', 'Quercetin',
  'Curcumin turmeric', 'Berberine', 'Fisetin', 'Spermidine',
  'Creatine monohydrate', 'Collagen peptides', 'Hyaluronic acid',
  'Glucosamine chondroitin', 'MSM methylsulfonylmethane',
  // Probiotics / gut
  'Probiotic supplement Lactobacillus', 'Saccharomyces boulardii', 'Glutamine gut',
  'Zinc carnosine', 'Pea protein', 'Psyllium husk fiber',
  // Sleep / calm
  'Magnesium glycinate sleep', 'Melatonin', 'Valerian root', 'Passionflower extract',
  'Lemon balm', 'Ashwagandha sleep',
  // Hormonal / fertility
  'DHEA supplement', 'Pregnenolone', 'Inositol myo-inositol', 'Vitex chaste tree berry',
  'Black cohosh', 'Saw palmetto', 'Fenugreek testosterone',
  'Tribulus terrestris', 'Tongkat Ali', 'Shilajit',
  // Antioxidants
  'NAC glutathione precursor', 'Glutathione liposomal', 'Pycnogenol pine bark extract',
  'Astaxanthin', 'Lycopene', 'Lutein zeaxanthin', 'Spirulina', 'Chlorella',
  // Cardio / metabolic
  'Berberine blood sugar', 'Cinnamon chromium blood sugar', 'Alpha lipoic acid blood sugar',
  'Red yeast rice', 'Nattokinase', 'Garlic allicin',
  // Brain / nootropics
  "Lion's mane BDNF", 'Bacopa monnieri', 'Ginkgo biloba',
  'Huperzine A', 'Alpha GPC choline', 'Vinpocetine', 'Phosphatidylserine memory',
  // Detox / liver
  'Milk thistle silymarin', 'Dandelion root', 'Artichoke extract', 'TUDCA',
  'Activated charcoal', 'Chlorella heavy metal detox',
];

// ── Keyword variation templates ───────────────────────────────────────────────
// For each ingredient we generate these patterns
const BENEFIT_TEMPLATES = [
  '{i} supplement',
  '{i} benefits',
  '{i} dosage',
  '{i} side effects',
  'best {i} supplement',
  '{i} for sleep',
  '{i} for anxiety',
  '{i} for energy',
  '{i} for weight loss',
  '{i} for testosterone',
  '{i} for immune system',
  '{i} for inflammation',
  '{i} for brain',
  '{i} deficiency symptoms',
  'how much {i} per day',
  '{i} before or after food',
  '{i} interactions',
  'is {i} safe',
];

// Ingredient-specific bonus variations (high commercial intent)
const SPECIFIC_EXTRAS = {
  'Magnesium glycinate':       ['magnesium glycinate vs citrate', 'magnesium glycinate 400mg', 'magnesium glycinate for sleep', 'magnesium glycinate during pregnancy'],
  'Ashwagandha KSM-66':        ['ashwagandha cortisol', 'KSM-66 ashwagandha 600mg', 'ashwagandha testosterone men', 'ashwagandha for women hormones'],
  "Lion's mane mushroom":      ["lion's mane for ADHD", "lion's mane NGF", "lion's mane anxiety", "lion's mane coffee"],
  'Berberine':                 ['berberine vs metformin', 'berberine PCOS', 'berberine weight loss dosage', 'berberine blood sugar 500mg'],
  'Curcumin turmeric':         ['curcumin bioavailability piperine', 'curcumin inflammation dosage', 'turmeric vs curcumin supplement'],
  'NMN nicotinamide mononucleotide': ['NMN vs NR', 'NMN David Sinclair', 'NMN 500mg age reversal', 'NMN sublingual vs capsule'],
  'CoQ10 ubiquinol':           ['CoQ10 statin depletion', 'ubiquinol vs ubiquinone over 40', 'CoQ10 heart failure dose'],
  'Vitamin D3':                ['vitamin D3 K2 combination', 'optimal vitamin D level ng/ml', 'vitamin D3 10000 IU safe', 'vitamin D deficiency symptoms adults'],
  'Omega 3 fish oil EPA DHA':  ['EPA DHA ratio', 'fish oil vs algae oil', 'omega 3 triglyceride form', 'omega 3 index test'],
  'Collagen peptides':         ['collagen types 1 2 3', 'hydrolyzed collagen absorption', 'marine vs bovine collagen', 'collagen skin before after'],
  'Creatine monohydrate':      ['creatine loading protocol', 'creatine monohydrate brain', 'creatine for women', 'creatine HCl vs monohydrate'],
  'Probiotic supplement Lactobacillus': ['probiotics CFU count', 'Lactobacillus rhamnosus benefits', 'probiotic refrigerated vs shelf stable', 'probiotic strains IBS'],
  'Melatonin':                 ['melatonin 0.5mg vs 10mg', 'melatonin jet lag protocol', 'melatonin long term safety', 'melatonin gummies vs capsules'],
  'DHEA supplement':           ['DHEA 7-keto vs regular', 'DHEA for menopause', 'DHEA testosterone connection', 'DHEA blood test optimal'],
  'Inositol myo-inositol':     ['myo-inositol PCOS dosage', 'inositol vs metformin PCOS', 'myo-inositol d-chiro ratio', 'inositol for OCD anxiety'],
  '5-HTP':                     ['5-HTP vs SSRIs', '5-HTP serotonin syndrome risk', '5-HTP for depression dosage', '5-HTP for sleep 100mg'],
  'NAC glutathione precursor': ['NAC 600mg benefits', 'NAC lung health mucus', 'NAC liver protection alcohol', 'NAC vs liposomal glutathione'],
  'Selenium selenomethionine':  ['selenium thyroid conversion', 'selenomethionine vs selenite', 'selenium optimal blood level', 'selenium Hashimoto dosage'],
};

// System blend specific variations
const BLEND_TEMPLATES = [
  '{b} supplement',
  '{b} supplement benefits',
  'natural {b} supplement',
  '{b} herbs',
  '{b} support capsules',
  'best {b} formula',
  '{b} fatigue',
  '{b} protocol',
  'signs you need {b} support',
  '{b} ingredients',
];

// ── Generate all keyword variations ─────────────────────────────────────────
function generateKeywords() {
  const kw = new Set();

  // Individual ingredient variations
  for (const ingredient of INDIVIDUAL_INGREDIENTS) {
    // Clean name for use in templates (remove parentheticals for cleaner kws)
    const base = ingredient.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    for (const t of BENEFIT_TEMPLATES) {
      kw.add(t.replace('{i}', base));
    }
    // Specific extras
    const extrasKey = Object.keys(SPECIFIC_EXTRAS).find(k => ingredient.toLowerCase().includes(k.split(' ')[0].toLowerCase()));
    if (SPECIFIC_EXTRAS[ingredient]) {
      for (const e of SPECIFIC_EXTRAS[ingredient]) kw.add(e.toLowerCase());
    }
  }

  // System blend variations
  for (const blend of SYSTEM_BLENDS) {
    const base = blend.toLowerCase();
    for (const t of BLEND_TEMPLATES) {
      kw.add(t.replace('{b}', base));
    }
  }

  // High-intent transactional terms for top ingredients
  const topIngredients = ['magnesium glycinate', 'ashwagandha', 'vitamin d3', 'omega 3', 'creatine', 'coq10', 'berberine', 'collagen', 'nmn', "lion's mane", 'quercetin', 'curcumin', 'zinc', 'selenium', 'probiotic'];
  for (const ing of topIngredients) {
    kw.add(`buy ${ing} supplement`);
    kw.add(`${ing} supplement amazon`);
    kw.add(`${ing} supplement review`);
    kw.add(`${ing} 2025`);
    kw.add(`${ing} clinical study`);
    kw.add(`${ing} research evidence`);
  }

  // Condition + supplement combos (high commercial intent)
  const conditions = ['adrenal fatigue', 'thyroid', 'PCOS', 'perimenopause', 'menopause', 'testosterone', 'gut health', 'leaky gut', 'IBS', 'autoimmune', 'inflammation', 'insulin resistance', 'blood sugar', 'cholesterol', 'heart health', 'brain fog', 'chronic fatigue', 'joint pain', 'anxiety', 'depression', 'insomnia', 'hair loss', 'acne', 'eczema', 'migraine'];
  const condTerms = ['supplement', 'natural remedy', 'vitamins', 'protocol', 'herbs that help', 'what to take'];
  for (const cond of conditions) {
    for (const term of condTerms.slice(0, 3)) {
      kw.add(`${cond} ${term}`);
    }
  }

  return [...kw].filter(k => k.length > 5 && k.length < 200);
}

// ── DataForSEO search volume ─────────────────────────────────────────────────
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

// ── DB upsert ────────────────────────────────────────────────────────────────
async function upsertBatch(rows) {
  if (!rows.length) return 0;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS keyword_data (
      keyword     VARCHAR(500) PRIMARY KEY,
      volume      INTEGER NOT NULL DEFAULT 0,
      kd          INTEGER NOT NULL DEFAULT 0,
      cpc         NUMERIC(8,2) NOT NULL DEFAULT 0,
      competition VARCHAR(20),
      source      VARCHAR(50) DEFAULT 'dataforseo',
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

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

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const keywords = generateKeywords();
  console.log(`\n Generated ${keywords.length} keyword variations across ingredients + system blends`);

  // Deduplicate against already-fetched keywords in DB
  let skip = new Set();
  try {
    const { rows } = await pool.query('SELECT keyword FROM keyword_data WHERE volume > 0');
    rows.forEach(r => skip.add(r.keyword.toLowerCase()));
    console.log(` Skipping ${skip.size} keywords already in DB with volume data`);
  } catch { /* table not yet created */ }

  const newKeywords = keywords.filter(k => !skip.has(k));
  console.log(` Net new keywords to fetch: ${newKeywords.length}`);
  console.log(` Estimated cost: ~$${(newKeywords.length * 0.0015).toFixed(2)}`);

  if (DRY_RUN) {
    console.log('\n── DRY RUN — sample keywords (first 50) ────────────────────────────────────');
    newKeywords.slice(0, 50).forEach(k => console.log(`  ${k}`));
    console.log(`\n  ...and ${Math.max(0, newKeywords.length - 50)} more`);
    await pool.end();
    return;
  }

  if (!LOGIN || !PASSWORD) {
    console.error('\n Missing DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD in server/.env');
    process.exit(1);
  }

  // Fetch in batches of 700
  const BATCH = 700;
  const allRaw = [];
  const batches = [];
  for (let i = 0; i < newKeywords.length; i += BATCH) batches.push(newKeywords.slice(i, i + BATCH));

  console.log(`\n Calling DataForSEO: ${batches.length} batch(es)...`);
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`  Batch ${i+1}/${batches.length} (${batches[i].length} keywords)... `);
    const res  = await fetchSearchVolume(batches[i]);
    const task = res.tasks?.[0];
    if (task?.status_code !== 20000) throw new Error(`API error: ${task?.status_message}`);
    const results = task?.result ?? [];
    allRaw.push(...results);
    console.log(`got ${results.length} results`);
    if (i < batches.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  // Save raw file (append-safe: merge with existing)
  const rawPath = path.join(__dirname, 'ingredient-keywords-raw.json');
  fs.writeFileSync(rawPath, JSON.stringify(allRaw, null, 2));
  console.log(`\n Raw data saved → ${rawPath}`);

  const upserted = await upsertBatch(allRaw);
  console.log(` ${upserted} rows upserted into keyword_data`);

  // ── Top opportunities ──────────────────────────────────────────────────────
  const { rows: top } = await pool.query(`
    SELECT keyword, volume, kd, cpc::float,
           ROUND(volume::numeric / GREATEST(kd, 1)) AS score
    FROM keyword_data
    WHERE volume >= 500 AND kd <= 40
    ORDER BY score DESC, volume DESC
    LIMIT 50
  `);

  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(' TOP OPPORTUNITIES: Volume ≥ 500, KD ≤ 40  →  ADD THESE AS BLOG TOPICS');
  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log(` ${'Score'.padEnd(8)} ${'Vol/mo'.padEnd(9)} ${'KD'.padEnd(5)} ${'CPC'.padEnd(7)} Keyword`);
  console.log(' ' + '─'.repeat(72));
  for (const r of top) {
    console.log(` ${String(r.score).padEnd(8)} ${String(r.volume).padEnd(9)} ${String(r.kd).padEnd(5)} $${Number(r.cpc).toFixed(2).padEnd(6)} ${r.keyword}`);
  }

  // ── High-volume but high-KD keywords (informational, harder to rank) ───────
  const { rows: hard } = await pool.query(`
    SELECT keyword, volume, kd FROM keyword_data
    WHERE volume >= 10000 AND kd > 40
    ORDER BY volume DESC LIMIT 20
  `);
  if (hard.length) {
    console.log('\n── HIGH VOLUME + HIGH KD (harder but worth long-term) ──────────────────────');
    hard.forEach(r => console.log(`  ${String(r.volume).padEnd(9)} KD:${r.kd}  ${r.keyword}`));
  }

  if (SUGGEST) {
    // ── Generate topic cluster suggestions ──────────────────────────────────
    const { rows: suggestions } = await pool.query(`
      SELECT keyword, volume, kd, ROUND(volume::numeric / GREATEST(kd,1)) AS score
      FROM keyword_data WHERE volume >= 1000 AND kd <= 35
      ORDER BY score DESC LIMIT 40
    `);
    console.log('\n\n════════════════════════════════════════════════════════════════════════════');
    console.log(' SUGGESTED NEW TOPIC CLUSTERS — paste into shared/topic-clusters.ts');
    console.log('════════════════════════════════════════════════════════════════════════════');
    for (const r of suggestions) {
      const kw = r.keyword;
      const title = kw.charAt(0).toUpperCase() + kw.slice(1).replace(/\b(for|of|and|the|vs|to|a)\b/g, w => w);
      console.log(`  { tier: 'ingredient', title: '${title}: Evidence, Dosage, and What the Research Shows', category: 'Supplements', primaryKeyword: '${kw}', secondaryKeywords: [] },`);
    }
  }

  console.log('\n Done.\n');
  await pool.end();
}

main().catch(err => {
  console.error(' Fatal:', err.message);
  pool.end();
  process.exit(1);
});
