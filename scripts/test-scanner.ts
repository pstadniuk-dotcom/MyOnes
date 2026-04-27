/**
 * Smoke-test scanSupplementLabel() with the new relaxed prompt.
 * Uses any supplement-style image we have locally as a proof the pipeline
 * still extracts ingredients with the updated prompt (and doesn't regress).
 *
 * For IM8 specifically, we need Joshua's actual photos to verify — but this
 * confirms the code path works and the new prompt didn't break the happy path.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('server/.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { scanSupplementLabel } = await import('../server/utils/fileAnalysis');

const imagePath = process.argv[2] || 'attached_assets/generated_images/Premium_supplement_bottle_product_2500f07c.png';
if (!fs.existsSync(imagePath)) {
  console.error('Image not found:', imagePath);
  process.exit(1);
}

const buf = fs.readFileSync(imagePath);
const ext = path.extname(imagePath).toLowerCase().slice(1);
const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';

console.log(`Scanning ${imagePath} (${buf.length} bytes, ${mimeType})...`);
const t0 = Date.now();
const result = await scanSupplementLabel(buf, mimeType);
console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s\n`);

console.log('=== RESULT ===');
console.log('productName:', result.productName);
console.log('brand:', result.brand);
console.log('servingSize:', result.servingSize);
console.log('servingsPerContainer:', result.servingsPerContainer);
console.log('notes:', result.notes);
console.log(`ingredients: ${result.ingredients.length}`);
for (const i of result.ingredients) {
  const dose = [i.dose, i.unit].filter(Boolean).join(' ');
  console.log(`  - ${i.name}${dose ? ` — ${dose}` : ''}${i.percentDailyValue ? ` (${i.percentDailyValue} DV)` : ''}`);
}

// Pass criteria: either we got ingredients, OR we got a productName (so the
// new "fall back to product name when panel is unreadable" behavior still works).
const ok = result.ingredients.length > 0 || !!result.productName;
console.log(`\n${ok ? '✅ PASS' : '❌ FAIL'} — ${result.ingredients.length === 0 && result.productName ? 'No panel detected, but product name extracted (graceful fallback)' : result.ingredients.length > 0 ? 'Ingredients extracted from label' : 'Returned nothing usable'}`);
process.exit(ok ? 0 : 1);
