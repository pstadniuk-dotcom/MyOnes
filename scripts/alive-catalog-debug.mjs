/**
 * Dump full Alive catalog and debug duplicate ID resolution
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const API_KEY = process.env.ALIVE_API_KEY;
const HEADER_NAME = process.env.ALIVE_API_HEADER_NAME || 'X-API-Key';
const INGREDIENTS_URL = process.env.ALIVE_API_INGREDIENTS_URL;

const res = await fetch(INGREDIENTS_URL, {
  headers: { [HEADER_NAME]: API_KEY, Accept: 'application/json' },
});
const json = await res.json();
const catalog = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

console.log('=== FULL ALIVE CATALOG ===');
console.log(`Total entries: ${catalog.length}\n`);
catalog.forEach((item, i) => {
  console.log(`  ${String(i+1).padStart(2)}. "${item.name}" → ID: ${String(item.ingredient_id).slice(0, 20)}...`);
});

// Now test what our current name resolution does
function norm(name) {
  return String(name || '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[-_/]/g, ' ').replace(/\s+/g, ' ');
}

function variants(name) {
  const n = norm(name);
  const set = new Set([n]);
  set.add(n.replace(/\bmix\b/g, '').replace(/\s+/g, ' ').trim());
  set.add(n.replace(/\bsupport\b/g, 'support mix').replace(/\s+/g, ' ').trim());
  set.add(n.replace(/\bsupport mix\b/g, 'support').replace(/\s+/g, ' ').trim());
  set.add(n.replace(/\bashwagandha\b/g, 'ashwaganda'));
  set.add(n.replace(/\baloe vera powder\b/g, 'aloe vera'));
  set.add(n.replace(/\baloe vera\b/g, 'cape aloe'));
  set.add(n.replace(/\bblackcurrant\b/g, 'black currant'));
  return [...set].filter(Boolean);
}

// Test the problematic ingredients
const testNames = ['Phosphatidylcholine', 'Curcumin', 'Quercetin'];
console.log('\n=== DUPLICATE ID DEBUG ===');
for (const name of testNames) {
  const tv = new Set(variants(name));
  console.log(`\nResolving "${name}":`);
  console.log(`  Our variants: [${[...tv].join(', ')}]`);
  
  // Phase 1: exact variant match
  let phase1Match = null;
  for (const item of catalog) {
    const iv = variants(item.name);
    if (iv.some(v => tv.has(v))) {
      phase1Match = item;
      break;
    }
  }
  if (phase1Match) {
    console.log(`  Phase 1 (exact): MATCHED → "${phase1Match.name}"`);
    continue;
  }
  
  // Phase 2: substring match
  console.log(`  Phase 1 (exact): no match`);
  for (const item of catalog) {
    const itemN = norm(item.name);
    for (const v of tv) {
      if (!v) continue;
      if (itemN.includes(v) || v.includes(itemN)) {
        console.log(`  Phase 2 (substring): MATCHED → "${item.name}" because`);
        console.log(`    catalog normalized: "${itemN}"`);
        console.log(`    our variant: "${v}"`);
        console.log(`    itemN.includes(v): ${itemN.includes(v)}`);
        console.log(`    v.includes(itemN): ${v.includes(itemN)}`);
      }
    }
  }
}
