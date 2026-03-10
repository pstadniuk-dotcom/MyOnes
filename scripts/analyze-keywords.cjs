#!/usr/bin/env node
/**
 * Keyword database analysis — run once to get strategic overview
 */
require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Overall stats
  const stats = await p.query(`
    SELECT 
      COUNT(*) total,
      COUNT(*) FILTER (WHERE volume > 0) with_volume,
      COUNT(*) FILTER (WHERE volume >= 1000 AND kd <= 40) easy_wins,
      COUNT(*) FILTER (WHERE volume >= 1000 AND kd <= 20) very_easy,
      COUNT(*) FILTER (WHERE volume >= 5000 AND kd <= 30) sweet_spot,
      COUNT(*) FILTER (WHERE volume >= 10000) high_vol,
      ROUND(AVG(volume)) avg_vol,
      ROUND(AVG(kd)) avg_kd,
      ROUND(AVG(cpc::numeric), 2) avg_cpc
    FROM keyword_data
  `);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' KEYWORD DATABASE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════');
  const s = stats.rows[0];
  console.log(`  Total keywords:        ${s.total}`);
  console.log(`  With search volume:    ${s.with_volume}`);
  console.log(`  Easy wins (vol≥1K, KD≤40):  ${s.easy_wins}`);
  console.log(`  Very easy (vol≥1K, KD≤20):  ${s.very_easy}`);
  console.log(`  Sweet spot (vol≥5K, KD≤30): ${s.sweet_spot}`);
  console.log(`  High volume (vol≥10K):      ${s.high_vol}`);
  console.log(`  Average volume:        ${s.avg_vol}`);
  console.log(`  Average KD:            ${s.avg_kd}`);
  console.log(`  Average CPC:           $${s.avg_cpc}`);

  // Top 40 by opportunity score
  const top = await p.query(`
    SELECT keyword, volume, kd, cpc::float, 
           ROUND(volume::numeric / GREATEST(kd, 1)) as score
    FROM keyword_data 
    WHERE volume >= 500
    ORDER BY score DESC
    LIMIT 40
  `);
  console.log('\n── TOP 40 OPPORTUNITIES (vol≥500, score=vol/KD) ──────────');
  top.rows.forEach(r => {
    console.log(`  ${String(r.score).padStart(7)} | vol:${String(r.volume).padStart(7)} | KD:${String(r.kd).padStart(3)} | $${r.cpc.toFixed(2).padStart(5)} | ${r.keyword}`);
  });

  // Distribution by KD bucket
  const kdDist = await p.query(`
    SELECT 
      CASE 
        WHEN kd <= 10 THEN '0-10 (easy)'
        WHEN kd <= 20 THEN '11-20 (medium)'
        WHEN kd <= 40 THEN '21-40 (moderate)'
        WHEN kd <= 60 THEN '41-60 (hard)'
        ELSE '61+ (very hard)'
      END as kd_bucket,
      COUNT(*) as cnt,
      SUM(volume) as total_vol,
      ROUND(AVG(volume)) as avg_vol
    FROM keyword_data WHERE volume > 0
    GROUP BY 1
    ORDER BY 1
  `);
  console.log('\n── KD DISTRIBUTION (keywords with volume > 0) ────────────');
  kdDist.rows.forEach(r => console.log(`  ${r.kd_bucket.padEnd(22)} | ${String(r.cnt).padStart(5)} kw | total vol: ${String(r.total_vol).padStart(10)} | avg: ${r.avg_vol}`));

  // Intent buckets
  const intent = await p.query(`
    SELECT 
      CASE
        WHEN keyword ILIKE '%supplement%' OR keyword ILIKE '%buy%' OR keyword ILIKE '%best%' OR keyword ILIKE '%for weight%' OR keyword ILIKE '%for testosterone%' THEN 'commercial'
        WHEN keyword ILIKE '%side effects%' OR keyword ILIKE '%interactions%' OR keyword ILIKE '%safe%' THEN 'safety'
        WHEN keyword ILIKE '%benefits%' OR keyword ILIKE '%dosage%' OR keyword ILIKE '%how much%' OR keyword ILIKE '%how to%' THEN 'informational'
        WHEN keyword ILIKE '%deficiency%' OR keyword ILIKE '%symptoms%' OR keyword ILIKE '%blood test%' THEN 'diagnostic'
        WHEN keyword ILIKE '%vs%' OR keyword ILIKE '%versus%' OR keyword ILIKE '%compare%' THEN 'comparison'
        WHEN keyword ILIKE '%for sleep%' OR keyword ILIKE '%for anxiety%' OR keyword ILIKE '%for energy%' OR keyword ILIKE '%for stress%' THEN 'condition-specific'
        ELSE 'other'
      END as intent,
      COUNT(*) cnt,
      SUM(volume) total_vol,
      COUNT(*) FILTER (WHERE volume >= 1000 AND kd <= 40) easy_wins
    FROM keyword_data WHERE volume > 0
    GROUP BY 1 ORDER BY total_vol DESC
  `);
  console.log('\n── INTENT DISTRIBUTION ────────────────────────────────────');
  intent.rows.forEach(r => console.log(`  ${r.intent.padEnd(20)} | ${String(r.cnt).padStart(5)} kw | vol: ${String(r.total_vol).padStart(10)} | easy wins: ${r.easy_wins}`));

  // High-volume easy wins
  const uncovered = await p.query(`
    SELECT keyword, volume, kd, cpc::float,
           ROUND(volume::numeric / GREATEST(kd, 1)) as score
    FROM keyword_data
    WHERE volume >= 2000 AND kd <= 30
    ORDER BY score DESC
    LIMIT 40
  `);
  console.log('\n── TOP 40 EASY WINS (vol≥2K, KD≤30) ─────────────────────');
  uncovered.rows.forEach(r => {
    console.log(`  ${String(r.score).padStart(7)} | vol:${String(r.volume).padStart(7)} | KD:${String(r.kd).padStart(3)} | $${r.cpc.toFixed(2).padStart(5)} | ${r.keyword}`);
  });

  // Zero-volume count and samples
  const zero = await p.query('SELECT COUNT(*) cnt FROM keyword_data WHERE volume = 0');
  const zeroSamples = await p.query(`
    SELECT keyword FROM keyword_data WHERE volume = 0 
    ORDER BY keyword LIMIT 30
  `);
  console.log(`\n── ZERO VOLUME: ${zero.rows[0].cnt} keywords ────────────────────────`);
  console.log('  Samples:');
  zeroSamples.rows.forEach(r => console.log(`    ${r.keyword}`));

  // CPC analysis - high commercial value
  const highCpc = await p.query(`
    SELECT keyword, volume, kd, cpc::float
    FROM keyword_data
    WHERE cpc::float >= 2.0 AND volume >= 500
    ORDER BY cpc DESC
    LIMIT 25
  `);
  console.log('\n── HIGH CPC ($2+, vol≥500) — commercial value ────────────');
  highCpc.rows.forEach(r => console.log(`  $${r.cpc.toFixed(2).padStart(5)} | vol:${String(r.volume).padStart(7)} | KD:${String(r.kd).padStart(3)} | ${r.keyword}`));

  // Ingredient coverage — which ingredients have NO keyword with volume?
  const ingredients = await p.query(`
    SELECT DISTINCT 
      CASE
        WHEN keyword ILIKE '%ashwagandha%' THEN 'ashwagandha'
        WHEN keyword ILIKE '%berberine%' THEN 'berberine'
        WHEN keyword ILIKE '%magnesium glycinate%' THEN 'magnesium glycinate'
        WHEN keyword ILIKE '%magnesium citrate%' THEN 'magnesium citrate'
        WHEN keyword ILIKE '%magnesium l-threonate%' THEN 'magnesium l-threonate'
        WHEN keyword ILIKE '%vitamin d3%' OR keyword ILIKE '%vitamin d %' THEN 'vitamin D3'
        WHEN keyword ILIKE '%vitamin c%' THEN 'vitamin C'
        WHEN keyword ILIKE '%vitamin b12%' OR keyword ILIKE '%methylcobalamin%' THEN 'vitamin B12'
        WHEN keyword ILIKE '%zinc%' THEN 'zinc'
        WHEN keyword ILIKE '%creatine%' THEN 'creatine'
        WHEN keyword ILIKE '%coq10%' OR keyword ILIKE '%coenzyme q10%' THEN 'CoQ10'
        WHEN keyword ILIKE '%lion%mane%' THEN 'lions mane'
        WHEN keyword ILIKE '%omega%3%' OR keyword ILIKE '%fish oil%' THEN 'omega-3'
        WHEN keyword ILIKE '%probiot%' THEN 'probiotics'
        WHEN keyword ILIKE '%collagen%' THEN 'collagen'
        WHEN keyword ILIKE '%melatonin%' THEN 'melatonin'
        WHEN keyword ILIKE '%l-theanine%' OR keyword ILIKE '%theanine%' THEN 'L-theanine'
        WHEN keyword ILIKE '%turmeric%' OR keyword ILIKE '%curcumin%' THEN 'turmeric/curcumin'
        WHEN keyword ILIKE '%nmn%' OR keyword ILIKE '%nicotinamide mononucleotide%' THEN 'NMN'
        WHEN keyword ILIKE '%tongkat%' THEN 'tongkat ali'
        WHEN keyword ILIKE '%shilajit%' THEN 'shilajit'
        WHEN keyword ILIKE '%spirulina%' THEN 'spirulina'
        WHEN keyword ILIKE '%maca%' THEN 'maca root'
        WHEN keyword ILIKE '%saw palmetto%' THEN 'saw palmetto'
        WHEN keyword ILIKE '%boron%' THEN 'boron'
        WHEN keyword ILIKE '%iron%' AND keyword NOT ILIKE '%environment%' THEN 'iron'
        WHEN keyword ILIKE '%selenium%' THEN 'selenium'
        WHEN keyword ILIKE '%glutathione%' THEN 'glutathione'
        WHEN keyword ILIKE '%resveratrol%' THEN 'resveratrol'
        WHEN keyword ILIKE '%quercetin%' THEN 'quercetin'
        WHEN keyword ILIKE '%fisetin%' THEN 'fisetin'
        WHEN keyword ILIKE '%spermidine%' THEN 'spermidine'
        ELSE NULL
      END as ingredient,
      SUM(volume) as total_vol,
      COUNT(*) as kw_count,
      COUNT(*) FILTER (WHERE volume >= 1000 AND kd <= 40) as easy_wins,
      MAX(volume) as max_vol
    FROM keyword_data
    WHERE volume > 0
    GROUP BY 1
    HAVING CASE
        WHEN keyword ILIKE '%ashwagandha%' THEN 'ashwagandha'
        WHEN keyword ILIKE '%berberine%' THEN 'berberine'
        WHEN keyword ILIKE '%magnesium glycinate%' THEN 'magnesium glycinate'
        WHEN keyword ILIKE '%magnesium citrate%' THEN 'magnesium citrate'
        WHEN keyword ILIKE '%magnesium l-threonate%' THEN 'magnesium l-threonate'
        WHEN keyword ILIKE '%vitamin d3%' OR keyword ILIKE '%vitamin d %' THEN 'vitamin D3'
        WHEN keyword ILIKE '%vitamin c%' THEN 'vitamin C'
        WHEN keyword ILIKE '%vitamin b12%' OR keyword ILIKE '%methylcobalamin%' THEN 'vitamin B12'
        WHEN keyword ILIKE '%zinc%' THEN 'zinc'
        WHEN keyword ILIKE '%creatine%' THEN 'creatine'
        WHEN keyword ILIKE '%coq10%' OR keyword ILIKE '%coenzyme q10%' THEN 'CoQ10'
        WHEN keyword ILIKE '%lion%mane%' THEN 'lions mane'
        WHEN keyword ILIKE '%omega%3%' OR keyword ILIKE '%fish oil%' THEN 'omega-3'
        WHEN keyword ILIKE '%probiot%' THEN 'probiotics'
        WHEN keyword ILIKE '%collagen%' THEN 'collagen'
        WHEN keyword ILIKE '%melatonin%' THEN 'melatonin'
        WHEN keyword ILIKE '%l-theanine%' OR keyword ILIKE '%theanine%' THEN 'L-theanine'
        WHEN keyword ILIKE '%turmeric%' OR keyword ILIKE '%curcumin%' THEN 'turmeric/curcumin'
        WHEN keyword ILIKE '%nmn%' OR keyword ILIKE '%nicotinamide mononucleotide%' THEN 'NMN'
        WHEN keyword ILIKE '%tongkat%' THEN 'tongkat ali'
        WHEN keyword ILIKE '%shilajit%' THEN 'shilajit'
        WHEN keyword ILIKE '%spirulina%' THEN 'spirulina'
        WHEN keyword ILIKE '%maca%' THEN 'maca root'
        WHEN keyword ILIKE '%saw palmetto%' THEN 'saw palmetto'
        WHEN keyword ILIKE '%boron%' THEN 'boron'
        WHEN keyword ILIKE '%iron%' AND keyword NOT ILIKE '%environment%' THEN 'iron'
        WHEN keyword ILIKE '%selenium%' THEN 'selenium'
        WHEN keyword ILIKE '%glutathione%' THEN 'glutathione'
        WHEN keyword ILIKE '%resveratrol%' THEN 'resveratrol'
        WHEN keyword ILIKE '%quercetin%' THEN 'quercetin'
        WHEN keyword ILIKE '%fisetin%' THEN 'fisetin'
        WHEN keyword ILIKE '%spermidine%' THEN 'spermidine'
        ELSE NULL
      END IS NOT NULL
    ORDER BY total_vol DESC
  `);
  console.log('\n── INGREDIENT COVERAGE (by total search volume) ───────────');
  ingredients.rows.forEach(r => {
    if (r.ingredient) {
      console.log(`  ${r.ingredient.padEnd(22)} | ${String(r.kw_count).padStart(3)} kw | vol: ${String(r.total_vol).padStart(10)} | max: ${String(r.max_vol).padStart(7)} | easy wins: ${r.easy_wins}`);
    }
  });

  // Gap analysis — what high-value topics are we missing?
  const missing = await p.query(`
    SELECT keyword, volume, kd, cpc::float
    FROM keyword_data
    WHERE volume >= 5000 AND kd <= 25
    AND keyword NOT ILIKE '%side effects%'
    AND keyword NOT ILIKE '%interactions%'
    ORDER BY volume DESC
    LIMIT 20
  `);
  console.log('\n── HIGH-VALUE GAPS (vol≥5K, KD≤25, not safety) ───────────');
  missing.rows.forEach(r => console.log(`  vol:${String(r.volume).padStart(7)} | KD:${String(r.kd).padStart(3)} | $${r.cpc.toFixed(2).padStart(5)} | ${r.keyword}`));

  // Source distribution
  const sources = await p.query(`
    SELECT source, COUNT(*) cnt, 
           COUNT(*) FILTER (WHERE volume > 0) with_vol
    FROM keyword_data GROUP BY source ORDER BY cnt DESC
  `);
  console.log('\n── SOURCE DISTRIBUTION ────────────────────────────────────');
  sources.rows.forEach(r => console.log(`  ${(r.source || 'null').padEnd(20)} | ${r.cnt} total | ${r.with_vol} with volume`));

  p.end();
}

run().catch(e => { console.error(e); process.exit(1); });
