#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('=== MISSING HIGH-INTENT PATTERNS ===');
  const patterns = [
    ['when to take', 'when to take'],
    ['before or after', 'before or after'],
    ['empty stomach', 'empty stomach'],
    ['with food', 'with food'],
    ['morning or night', 'morning or night'],
    ['how long', 'how long'],
    ['best time to take', 'best time to take'],
    ['natural alternative', 'natural alternative'],
    ['vs (comparison)', ' vs '],
    ['stack', 'stack'],
    ['combination', 'combination'],
    ['together', 'together'],
    ['women', 'women'],
    ['men', "\\bmen\\b"],
    ['pregnancy', 'pregnan'],
    ['age-based (over 40/50/60)', 'over (40|50|60)'],
  ];
  
  for (const [label, pat] of patterns) {
    const r = await p.query(
      'SELECT COUNT(*) cnt, COALESCE(SUM(volume),0) vol FROM keyword_data WHERE keyword ~* $1',
      [pat]
    );
    const row = r.rows[0];
    console.log(`  ${label.padEnd(30)} | ${String(row.cnt).padStart(4)} kw | vol: ${String(row.vol).padStart(8)}`);
  }

  // What percentage of our keywords are ingredient-based vs condition-based?
  const ingr = await p.query(
    `SELECT COUNT(*) cnt FROM keyword_data WHERE keyword ~* '(supplement|vitamin|magnesium|zinc|creatine|ashwagandha|berberine|coq10|collagen|melatonin|probiotic|omega|theanine|curcumin|iron|selenium|glutathione|resveratrol|quercetin)'`
  );
  const cond = await p.query(
    `SELECT COUNT(*) cnt FROM keyword_data WHERE keyword ~* '(anxiety|sleep|energy|stress|weight loss|testosterone|immune|inflammation|brain|gut health|heart|blood sugar|hair loss|joint pain|depression|acne|detox|thyroid|adrenal|cholesterol)'`
  );
  console.log(`\n=== KEYWORD TYPE MIX ===`);
  console.log(`  Ingredient-based: ${ingr.rows[0].cnt}`);
  console.log(`  Condition-based:  ${cond.rows[0].cnt}`);
  console.log(`  (keywords can match both)`);

  // What big topics are we completely not covering?
  const missingTopics = [
    'adaptogens', 'nootropics', 'electrolytes', 'amino acids', 'antioxidant',
    'methylation', 'MTHFR', 'leaky gut', 'bioavailability', 'gut-brain axis',
    'circadian rhythm', 'intermittent fasting', 'keto', 'carnivore diet',
    'ozempic', 'GLP-1', 'peptides', 'stem cells', 'red light therapy',
    'cold plunge', 'sauna', 'grounding', 'EMF', 'mold', 'heavy metal',
    'cortisol', 'estrogen', 'progesterone', 'PCOS', 'endometriosis',
    'perimenopause', 'menopause', 'andropause', 'TRT', 'HRT',
    'seed cycling', 'functional medicine', 'integrative medicine',
    'blood work', 'lab results', 'reference range', 'optimal range',
  ];
  
  console.log(`\n=== TRENDING TOPICS NOT YET RESEARCHED ===`);
  for (const topic of missingTopics) {
    const r = await p.query(
      'SELECT COUNT(*) cnt, COALESCE(SUM(volume),0) vol FROM keyword_data WHERE keyword ~* $1',
      [topic]
    );
    const row = r.rows[0];
    if (parseInt(row.cnt) === 0) {
      console.log(`  NOT IN DB: ${topic}`);
    } else {
      console.log(`  ${topic.padEnd(25)} | ${String(row.cnt).padStart(3)} kw | vol: ${String(row.vol).padStart(8)}`);
    }
  }

  p.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
