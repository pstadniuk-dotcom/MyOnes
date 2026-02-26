/**
 * Full Catalog Audit: ONES ingredients vs Alive Innovations catalog
 * Checks EVERY ingredient (system supports + individual) for a match.
 * Run: node scripts/alive-catalog-audit.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const API_KEY = process.env.ALIVE_API_KEY;
const HEADER_NAME = process.env.ALIVE_API_HEADER_NAME || 'X-API-Key';
const INGREDIENTS_URL = process.env.ALIVE_API_INGREDIENTS_URL || 'https://dev.aliveinnovations.com/api/ingredients';

// ── Our complete ingredient catalog ─────────────────────────────────────
const SYSTEM_SUPPORTS = [
  'Adrenal Support', 'Beta Max', 'C Boost', 'Endocrine Support',
  'Heart Support', 'Histamine Support', 'Immune-C',
  'Kidney & Bladder Support', 'Ligament Support', 'Liver Support',
  'Lung Support', 'MG/K', 'Mold RX', 'Ovary Uterus Support',
  'Para X', 'Prostate Support', 'Spleen Support', 'Thyroid Support',
];

const INDIVIDUAL_INGREDIENTS = [
  'Aloe Vera', 'Ashwagandha', 'Astragalus', 'Blackcurrant Extract',
  'Broccoli Concentrate', 'Camu Camu', 'Cats Claw', 'Chaga',
  'Curcumin', 'Cinnamon 20:1', 'CoEnzyme Q10', 'Colostrum Powder',
  'GABA', 'Garlic', 'Ginger Root', 'Ginkgo Biloba Extract 24%',
  'Graviola', 'Hawthorn Berry', 'InnoSlim',
  'Lutein', 'Maca', 'Magnesium', 'Resveratrol',
  'Omega 3', 'Phosphatidylcholine', 'Saw Palmetto Extract',
  'Stinging Nettle', 'Suma Root', 'Vitamin E (Mixed Tocopherols)',
  'Milk Thistle', 'Calcium', 'Vitamin C', 'Cape Aloe',
];

// ── Helpers ─────────────────────────────────────────────────────────────
function norm(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ');
}

const MIN_SUBSTR_LEN = 4;

function tryMatch(oursName, catalog) {
  const n = norm(oursName);
  const matches = [];

  for (const item of catalog) {
    const cv = norm(item.name);

    // Exact match
    if (cv === n) {
      matches.push({ type: 'exact', aliveEntry: item.name, aliveId: item.ingredient_id });
      continue;
    }

    // Partial/substring (with min length guard)
    if (n.length >= MIN_SUBSTR_LEN && cv.length >= MIN_SUBSTR_LEN) {
      if (cv.includes(n) || n.includes(cv)) {
        matches.push({ type: 'substring', aliveEntry: item.name, aliveId: item.ingredient_id });
      }
    }
  }
  return matches;
}

// ── Fetch Alive catalog ─────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  ONES ↔ Alive Catalog Full Audit                       ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const res = await fetch(INGREDIENTS_URL, {
  headers: { [HEADER_NAME]: API_KEY },
});
if (!res.ok) { console.error('Failed to fetch catalog:', res.status); process.exit(1); }
const data = await res.json();
const catalog = data.data || data.ingredients || data;
console.log(`Alive catalog: ${catalog.length} entries\n`);

// Print full Alive catalog for reference
console.log('── Full Alive Catalog ─────────────────────────────────────');
catalog.forEach((item, i) => {
  console.log(`  ${String(i + 1).padStart(3)}. "${item.name}"`);
});
console.log();

// ── Audit each ingredient ───────────────────────────────────────────────
const matched = [];
const unmatched = [];
const ambiguous = [];

function audit(name, category) {
  const results = tryMatch(name, catalog);
  if (results.length === 0) {
    unmatched.push({ name, category });
  } else if (results.length === 1) {
    matched.push({ name, category, alive: results[0].aliveEntry, matchType: results[0].type });
  } else {
    // Multiple matches — possibly ambiguous
    ambiguous.push({ name, category, matches: results });
  }
}

console.log('── Checking System Supports (18) ─────────────────────────');
SYSTEM_SUPPORTS.forEach(name => audit(name, 'system'));

console.log('── Checking Individual Ingredients (32) ──────────────────');
INDIVIDUAL_INGREDIENTS.forEach(name => audit(name, 'individual'));

// ── Results ─────────────────────────────────────────────────────────────
const total = SYSTEM_SUPPORTS.length + INDIVIDUAL_INGREDIENTS.length;

console.log(`\n${'═'.repeat(60)}`);
console.log(`  RESULTS: ${total} ingredients checked`);
console.log(`${'═'.repeat(60)}\n`);

console.log(`✅ MATCHED: ${matched.length}`);
matched.forEach(m => {
  const tag = m.matchType === 'exact' ? '' : ` [${m.matchType}]`;
  const nameMatch = m.name === m.alive ? '' : ` → "${m.alive}"`;
  console.log(`   ${m.category.padEnd(10)} ${m.name}${nameMatch}${tag}`);
});

if (ambiguous.length > 0) {
  console.log(`\n⚠️  AMBIGUOUS (multiple matches): ${ambiguous.length}`);
  ambiguous.forEach(a => {
    console.log(`   ${a.category.padEnd(10)} ${a.name}`);
    a.matches.forEach(m => console.log(`              → "${m.aliveEntry}" [${m.type}]`));
  });
}

console.log(`\n❌ UNMATCHED (not in Alive catalog): ${unmatched.length}`);
unmatched.forEach(u => {
  console.log(`   ${u.category.padEnd(10)} ${u.name}`);
});

// ── Name mismatch analysis ──────────────────────────────────────────────
const nameMismatches = matched.filter(m => norm(m.name) !== norm(m.alive));
if (nameMismatches.length > 0) {
  console.log(`\n── Name Mismatches (should rename at source?) ─────────────`);
  nameMismatches.forEach(m => {
    console.log(`   OURS: "${m.name}"  →  ALIVE: "${m.alive}"`);
  });
}

// ── Alive entries with NO match in our catalog ──────────────────────────
const ourNames = new Set([...SYSTEM_SUPPORTS, ...INDIVIDUAL_INGREDIENTS].map(n => norm(n)));
const aliveNotInOurs = catalog.filter(item => {
  const cn = norm(item.name);
  // Check if any of our names match
  for (const ours of ourNames) {
    if (cn === ours || (cn.length >= MIN_SUBSTR_LEN && ours.length >= MIN_SUBSTR_LEN && (cn.includes(ours) || ours.includes(cn)))) {
      return false;
    }
  }
  return true;
});

if (aliveNotInOurs.length > 0) {
  console.log(`\n── Alive entries NOT in our catalog (${aliveNotInOurs.length}) ──────────────`);
  aliveNotInOurs.forEach(item => {
    console.log(`   "${item.name}"`);
  });
}

console.log('\n✔ Audit complete');
