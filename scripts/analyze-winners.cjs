/**
 * analyze-winners.cjs – Deep analysis of top-performing keywords
 * to identify the best patterns for v3 expansion.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Top 30 sweet spot keywords
  const top = await pool.query(`
    SELECT keyword, volume, kd, cpc,
           ROUND(volume::numeric / GREATEST(kd,1)) as score
    FROM keyword_data
    WHERE volume >= 1000 AND kd <= 30
    ORDER BY score DESC LIMIT 30
  `);
  console.log('=== TOP 30 SWEET SPOT KEYWORDS ===');
  top.rows.forEach((r, i) =>
    console.log(`${i + 1}. ${r.keyword} (vol:${r.volume}, KD:${r.kd}, score:${r.score})`)
  );

  // What intent patterns performed best
  const patterns = await pool.query(`
    SELECT
      CASE
        WHEN keyword LIKE 'how long%' THEN 'how long'
        WHEN keyword LIKE 'when to take%' OR keyword LIKE 'best time%' THEN 'timing'
        WHEN keyword LIKE 'can you take%' OR keyword LIKE '%together%' THEN 'combinations'
        WHEN keyword LIKE '%vs %' OR keyword LIKE '%versus%' THEN 'comparisons'
        WHEN keyword LIKE '%for women%' OR keyword LIKE '%for men%' THEN 'demographics'
        WHEN keyword LIKE '%deficiency%' OR keyword LIKE '%symptoms%' THEN 'symptoms'
        WHEN keyword LIKE '%benefits%' THEN 'benefits'
        WHEN keyword LIKE '%side effects%' THEN 'side effects'
        WHEN keyword LIKE '%dosage%' OR keyword LIKE '%how much%' THEN 'dosage'
        WHEN keyword LIKE '%supplement%' THEN 'supplement'
        ELSE 'other'
      END as pattern,
      COUNT(*) as cnt,
      SUM(volume) as total_vol,
      ROUND(AVG(volume)) as avg_vol,
      ROUND(AVG(kd)) as avg_kd
    FROM keyword_data WHERE volume > 0
    GROUP BY pattern ORDER BY total_vol DESC
  `);
  console.log('\n=== PATTERN PERFORMANCE ===');
  patterns.rows.forEach(r =>
    console.log(`${r.pattern}: ${r.cnt} kws, total_vol:${r.total_vol}, avg_vol:${r.avg_vol}, avg_kd:${r.avg_kd}`)
  );

  // Which ingredients have highest combined volume
  const ings = await pool.query(`
    SELECT word, COUNT(*) as cnt, SUM(volume) as total_vol
    FROM keyword_data,
         LATERAL unnest(string_to_array(keyword, ' ')) word
    WHERE volume > 0
      AND word IN ('magnesium','vitamin','zinc','ashwagandha','creatine','collagen',
        'melatonin','iron','omega','turmeric','probiotics','b12','d3','calcium',
        'biotin','berberine','coq10','glutathione','curcumin','elderberry',
        'echinacea','quercetin','resveratrol','spirulina','chlorella','maca',
        'rhodiola','mushroom','psyllium','theanine','folate','selenium',
        'chromium','potassium','fiber','protein','electrolytes')
    GROUP BY word ORDER BY total_vol DESC LIMIT 25
  `);
  console.log('\n=== TOP INGREDIENT VOLUMES ===');
  ings.rows.forEach(r => console.log(`${r.word}: ${r.cnt} kws, total_vol:${r.total_vol}`));

  // Find which question words work best
  const qwords = await pool.query(`
    SELECT
      CASE
        WHEN keyword LIKE 'how %' THEN 'how'
        WHEN keyword LIKE 'what %' THEN 'what'
        WHEN keyword LIKE 'when %' THEN 'when'
        WHEN keyword LIKE 'can %' THEN 'can'
        WHEN keyword LIKE 'does %' THEN 'does'
        WHEN keyword LIKE 'is %' THEN 'is'
        WHEN keyword LIKE 'why %' THEN 'why'
        WHEN keyword LIKE 'best %' THEN 'best'
        WHEN keyword LIKE 'should %' THEN 'should'
        ELSE 'statement'
      END as qtype,
      COUNT(*) as cnt, SUM(volume) as total_vol, ROUND(AVG(kd)) as avg_kd
    FROM keyword_data WHERE volume > 0
    GROUP BY qtype ORDER BY total_vol DESC
  `);
  console.log('\n=== QUESTION WORD PERFORMANCE ===');
  qwords.rows.forEach(r =>
    console.log(`${r.qtype}: ${r.cnt} kws, total_vol:${r.total_vol}, avg_kd:${r.avg_kd}`)
  );

  // Find high-volume keywords we DON'T have yet (related to top performers)
  // Check which top-30 ingredients we're MISSING long-tail for
  const coverage = await pool.query(`
    WITH top_ings AS (
      SELECT unnest(ARRAY[
        'magnesium glycinate','magnesium citrate','magnesium threonate','magnesium taurate',
        'vitamin d3','vitamin b12','vitamin c','vitamin b6','vitamin k2','vitamin e',
        'ashwagandha','creatine monohydrate','collagen peptides','omega 3','zinc',
        'melatonin','turmeric','curcumin','probiotics','iron',
        'l-theanine','rhodiola','maca','berberine','coq10',
        'psyllium husk','elderberry','quercetin','resveratrol','biotin',
        'lion''s mane','reishi','cordyceps','spirulina','chlorella',
        'glucosamine','msm','saw palmetto','black seed oil','sea moss',
        'shilajit','tongkat ali','fadogia agrestis','turkesterone','apigenin'
      ]) as ingredient
    ),
    patterns AS (
      SELECT unnest(ARRAY[
        'benefits','side effects','dosage','how much','when to take',
        'best time to take','how long does % take to work',
        'for women','for men','for sleep','for anxiety','for weight loss',
        'vs','deficiency symptoms','with food or empty stomach',
        'during pregnancy','for hair growth','for skin','for energy',
        'for muscle','supplement','natural sources'
      ]) as pattern
    )
    SELECT i.ingredient,
           COUNT(k.keyword) as existing_keywords,
           SUM(CASE WHEN k.volume > 0 THEN 1 ELSE 0 END) as with_volume
    FROM top_ings i
    LEFT JOIN keyword_data k ON k.keyword LIKE '%' || i.ingredient || '%'
    GROUP BY i.ingredient
    ORDER BY existing_keywords ASC
    LIMIT 20
  `);
  console.log('\n=== UNDER-COVERED INGREDIENTS (fewest keywords) ===');
  coverage.rows.forEach(r =>
    console.log(`${r.ingredient}: ${r.existing_keywords} kws (${r.with_volume} with volume)`)
  );

  // Find patterns NOT yet applied to top ingredients
  const missing = await pool.query(`
    WITH top_ings AS (
      SELECT unnest(ARRAY[
        'magnesium glycinate','vitamin d3','ashwagandha','creatine monohydrate',
        'omega 3','zinc','melatonin','collagen peptides','vitamin b12',
        'turmeric','iron','probiotics','l-theanine','berberine','coq10'
      ]) as ingredient
    ),
    patterns AS (
      SELECT unnest(ARRAY[
        'benefits','side effects','dosage','when to take',
        'for women','for men','for sleep','for anxiety',
        'for weight loss','how long','during pregnancy',
        'for hair growth','for skin','supplement','natural sources',
        'with food or empty stomach','for energy','foods high in',
        'recommended daily intake','too much','overdose','withdrawal'
      ]) as pattern
    )
    SELECT i.ingredient, p.pattern,
           i.ingredient || ' ' || p.pattern as potential_keyword
    FROM top_ings i
    CROSS JOIN patterns p
    WHERE NOT EXISTS (
      SELECT 1 FROM keyword_data k
      WHERE k.keyword LIKE '%' || i.ingredient || '%' || p.pattern || '%'
         OR k.keyword LIKE '%' || p.pattern || '%' || i.ingredient || '%'
    )
    ORDER BY i.ingredient, p.pattern
  `);
  console.log('\n=== MISSING INGREDIENT×PATTERN COMBOS (sample) ===');
  console.log(`Total missing combos: ${missing.rows.length}`);
  // Group by ingredient
  const grouped = {};
  missing.rows.forEach(r => {
    if (!grouped[r.ingredient]) grouped[r.ingredient] = [];
    grouped[r.ingredient].push(r.pattern);
  });
  Object.entries(grouped).forEach(([ing, pats]) => {
    console.log(`  ${ing}: missing [${pats.join(', ')}]`);
  });

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
