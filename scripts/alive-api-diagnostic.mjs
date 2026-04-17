/**
 * Alive Innovations API Diagnostic
 * Tests: /ingredients catalog, /get-quote pricing, and name resolution
 * Run: node scripts/alive-api-diagnostic.mjs
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const API_KEY = process.env.ALIVE_API_KEY;
const HEADER_NAME = process.env.ALIVE_API_HEADER_NAME || 'X-API-Key';
const API_ORIGIN = process.env.ALIVE_API_ORIGIN;
const INGREDIENTS_URL = process.env.ALIVE_API_INGREDIENTS_URL || 'https://dev.aliveinnovations.com/api/ingredients';
const QUOTE_URL = process.env.ALIVE_API_GET_QUOTE_URL || 'https://dev.aliveinnovations.com/api/get-quote';

function authHeaders(extra = {}) {
  const headers = {
    [HEADER_NAME]: API_KEY,
    Accept: 'application/json',
    ...extra,
  };
  if (API_ORIGIN) {
    headers.Origin = API_ORIGIN;
    headers.Referer = `${API_ORIGIN.replace(/\/$/, '')}/`;
  }
  return headers;
}

const QUOTE_DAYS = 56; // 8 weeks
const MARGIN = 2.0;

// ─── Helpers ────────────────────────────────────────────────────────────
function norm(name) {
  return String(name || '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[-_/]/g, ' ').replace(/\s+/g, ' ');
}

const NAME_ALIASES = {
  ashwagandha: 'ashwaganda',
  'mens health support': 'mens health mix',
  'cardiovascular support': 'cardiovascular support mix',
  'digestive support': 'digestive enzyme mix',
  'anti-inflammatory support': 'anti-inflammatory mix',
  'antioxidant support': 'antioxidant support mix',
  'blood sugar support': 'blood sugar support mix',
  'eye health support': 'eye health mix',
  'hair, skin & nails support': 'hair, skin & nail mix',
  'joint support': 'joint support mix',
  'sleep support': 'sleep support mix',
};

function variants(name) {
  const n = norm(name);
  const alias = norm(NAME_ALIASES[n] || n);
  const set = new Set([n, alias]);
  set.add(n.replace(/\bmix\b/g, '').replace(/\s+/g, ' ').trim());
  set.add(n.replace(/\bsupport\b/g, 'support mix').replace(/\s+/g, ' ').trim());
  set.add(n.replace(/\bsupport mix\b/g, 'support').replace(/\s+/g, ' ').trim());
  set.add(n.replace(/\bashwagandha\b/g, 'ashwaganda'));
  set.add(n.replace(/\baloe vera powder\b/g, 'aloe vera'));
  set.add(n.replace(/\baloe vera\b/g, 'cape aloe'));
  set.add(n.replace(/\bblackcurrant\b/g, 'black currant'));
  return [...set].filter(Boolean);
}

function resolveId(name, catalog) {
  const tv = new Set([...variants(name)]);
  // exact match first
  for (const item of catalog) {
    const iv = variants(item.name);
    if (iv.some(v => tv.has(v))) return item.ingredient_id;
  }
  // substring match
  for (const item of catalog) {
    const itemN = norm(item.name);
    for (const v of tv) {
      if (!v) continue;
      if (itemN.includes(v) || v.includes(itemN)) return item.ingredient_id;
    }
  }
  return null;
}

// ─── Step 1: Fetch catalog ──────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log('  Alive Innovations API Diagnostic');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`API Key: ${API_KEY ? API_KEY.slice(0, 8) + '...' : 'MISSING'}`);
console.log(`Header:  ${HEADER_NAME}`);
console.log(`URLs:    ${INGREDIENTS_URL}`);
console.log(`         ${QUOTE_URL}\n`);

console.log('── Step 1: Fetching ingredient catalog ──────────────────');
const catRes = await fetch(INGREDIENTS_URL, {
  headers: authHeaders(),
});
console.log(`Status: ${catRes.status} ${catRes.statusText}`);

if (!catRes.ok) {
  console.error('FAILED to fetch catalog. Raw response:', await catRes.text());
  process.exit(1);
}

const catJson = await catRes.json();
const catalog = Array.isArray(catJson?.data) ? catJson.data : (Array.isArray(catJson) ? catJson : []);
console.log(`Catalog entries: ${catalog.length}`);
console.log(`Sample (first 5):`);
catalog.slice(0, 5).forEach(i => console.log(`  #${i.ingredient_id}: "${i.name}"`));
console.log();

// ─── Step 2: Load current formula from DB ───────────────────────────────
console.log('── Step 2: Loading current formula from DB ──────────────');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const userId = 'ccc783a5-1cf6-49e5-99d3-760d71e2434d';
const { rows } = await pool.query(
  `SELECT id, version, bases, additions, target_capsules, total_mg
   FROM formulas WHERE user_id = $1 ORDER BY version DESC LIMIT 1`,
  [userId]
);
await pool.end();

if (rows.length === 0) {
  console.error('No formula found for user');
  process.exit(1);
}

const formula = rows[0];
const bases = typeof formula.bases === 'string' ? JSON.parse(formula.bases) : formula.bases;
const additions = typeof formula.additions === 'string' ? JSON.parse(formula.additions) : formula.additions;
const targetCapsules = formula.target_capsules || 9;

console.log(`Formula:  v${formula.version} (${formula.id})`);
console.log(`Total:    ${formula.total_mg}mg`);
console.log(`Capsules: ${targetCapsules}/day`);
console.log(`Bases:    ${bases.length}`);
console.log(`Adds:     ${additions.length}\n`);

// ─── Step 3: Resolve ingredient IDs ─────────────────────────────────────
console.log('── Step 3: Ingredient name resolution ───────────────────');
const allIngredients = [...bases, ...additions]
  .filter(i => i && i.ingredient && Number(i.amount) > 0)
  .map(i => ({ name: i.ingredient, amount: Number(i.amount) }));

const mapped = [];
const unmapped = [];
for (const item of allIngredients) {
  const id = resolveId(item.name, catalog);
  const perCapsuleMg = Math.round((item.amount / targetCapsules) * 1000) / 1000;
  if (id) {
    mapped.push({ name: item.name, id, dailyMg: item.amount, perCapsuleMg });
    console.log(`  ✅ ${item.name} → ID #${id} (${item.amount}mg/day, ${perCapsuleMg}mg/cap)`);
  } else {
    unmapped.push(item.name);
    console.log(`  ❌ ${item.name} → NOT FOUND in catalog`);
  }
}
console.log(`\nMapped: ${mapped.length}/${allIngredients.length}`);
if (unmapped.length) console.log(`Unmapped: ${unmapped.join(', ')}`);
console.log();

// ─── Step 4: Call get-quote ─────────────────────────────────────────────
console.log('── Step 4: Calling /get-quote API ───────────────────────');
const totalCapsules = targetCapsules * QUOTE_DAYS;
const quotePayload = {
  ingredients: mapped.map(m => ({ ingredient_id: m.id, weight_in_mg: m.perCapsuleMg })),
  number_of_weeks: 8,
  capsule_count: totalCapsules,
};

console.log('Request payload:');
console.log(JSON.stringify(quotePayload, null, 2));
console.log();

const quoteRes = await fetch(QUOTE_URL, {
  method: 'POST',
  headers: authHeaders({ 'Content-Type': 'application/json' }),
  body: JSON.stringify(quotePayload),
});

console.log(`Status: ${quoteRes.status} ${quoteRes.statusText}`);
const rawText = await quoteRes.text();
console.log('\nRaw API response:');
console.log(rawText);
console.log();

let quoteData;
try {
  quoteData = JSON.parse(rawText);
} catch {
  console.error('Failed to parse JSON response');
  process.exit(1);
}

// ─── Step 5: Pricing analysis ───────────────────────────────────────────
console.log('── Step 5: Pricing analysis ─────────────────────────────');
const mfgSubtotal = Number(quoteData.subtotal ?? quoteData.total ?? 0);
const mfgTotal = Number(quoteData.total ?? quoteData.subtotal ?? 0);
const aliveShipping = Math.round((mfgTotal - mfgSubtotal) * 100) / 100;
const customerPrice = Math.round(mfgSubtotal * MARGIN * 100) / 100;
const perDay = Math.round((customerPrice / QUOTE_DAYS) * 100) / 100;

console.log(`Manufacturer subtotal (cost only): $${mfgSubtotal.toFixed(2)}`);
console.log(`Manufacturer total (incl shipping): $${mfgTotal.toFixed(2)}`);
console.log(`Alive shipping:                    $${aliveShipping.toFixed(2)}`);
console.log(`Margin multiplier:                 ${MARGIN}x`);
console.log(`Customer price (8-week supply):    $${customerPrice.toFixed(2)}`);
console.log(`Per-day cost to customer:          $${perDay.toFixed(2)}`);
console.log();

// Check for unexpected fields
const knownFields = ['status', 'success', 'total', 'subtotal', 'shipping', 'data', 'message', 'error', 'quote', 'price', 'cost'];
const responseKeys = Object.keys(quoteData);
const unexpected = responseKeys.filter(k => !knownFields.includes(k));
if (unexpected.length) {
  console.log('⚠️  Unexpected response fields:', unexpected.join(', '));
  console.log('   These may contain pricing data we\'re not reading!');
  for (const k of unexpected) {
    console.log(`   ${k}: ${JSON.stringify(quoteData[k])}`);
  }
}

if (mfgTotal === 0) {
  console.log('\n🚨 WARNING: Manufacturer total is $0.00!');
  console.log('   Checking all numeric fields in response:');
  for (const [k, v] of Object.entries(quoteData)) {
    if (typeof v === 'number') console.log(`   ${k}: ${v}`);
    if (typeof v === 'string' && !isNaN(Number(v))) console.log(`   ${k}: "${v}" (string-number)`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Diagnostic complete');
console.log('═══════════════════════════════════════════════════════════');
