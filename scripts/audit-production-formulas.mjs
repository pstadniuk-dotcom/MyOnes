#!/usr/bin/env node
/**
 * Production Formula Audit
 *
 * Pulls every active (non-archived) formula from production Supabase
 * and validates against the ingredient catalog + capsule budget rules.
 *
 * Run: node scripts/audit-production-formulas.mjs
 */

import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from server/.env if not already loaded
if (!process.env.DATABASE_URL) {
  const envPath = resolve(__dirname, '..', 'server', '.env');
  try {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {/* ignore */}
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// ── Load catalog by parsing shared/ingredients.ts (no TS runtime needed) ─────
const ingredientsTs = readFileSync(resolve(__dirname, '..', 'shared', 'ingredients.ts'), 'utf8');

function parseCatalog(source, sectionName) {
  const re = new RegExp(`export const ${sectionName}: IngredientInfo\\[\\] = \\[([\\s\\S]*?)^\\];`, 'm');
  const m = source.match(re);
  if (!m) throw new Error(`Could not find ${sectionName}`);
  const block = m[1];
  const items = [];
  const itemRe = /\{\s*([\s\S]*?)\s*\},?\s*(?=\{|$)/g;
  let im;
  while ((im = itemRe.exec(block)) !== null) {
    const body = im[1];
    const nameM = body.match(/name:\s*['"]([^'"]+)['"]/);
    const doseM = body.match(/doseMg:\s*(\d+)/);
    const minM = body.match(/doseRangeMin:\s*(\d+)/);
    const maxM = body.match(/doseRangeMax:\s*(\d+)/);
    if (nameM) {
      items.push({
        name: nameM[1],
        doseMg: doseM ? Number(doseM[1]) : null,
        min: minM ? Number(minM[1]) : null,
        max: maxM ? Number(maxM[1]) : null,
      });
    }
  }
  return items;
}

const SYSTEM_SUPPORTS = parseCatalog(ingredientsTs, 'SYSTEM_SUPPORTS');
const INDIVIDUAL_INGREDIENTS = parseCatalog(ingredientsTs, 'INDIVIDUAL_INGREDIENTS');
const CATALOG = new Map();
[...SYSTEM_SUPPORTS, ...INDIVIDUAL_INGREDIENTS].forEach((i) => {
  CATALOG.set(normalize(i.name), { ...i, isBase: SYSTEM_SUPPORTS.includes(i) });
});

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const CAPSULE_CAPACITY_MG = 550;

// ── Connect ──────────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

console.log('\n┌────────────────────────────────────────────────────────────┐');
console.log('│  ONES Production Formula Audit                             │');
console.log('└────────────────────────────────────────────────────────────┘\n');
console.log(`Catalog: ${SYSTEM_SUPPORTS.length} system supports + ${INDIVIDUAL_INGREDIENTS.length} individual ingredients = ${CATALOG.size} total\n`);

const { rows: formulas } = await pool.query(`
  SELECT id, user_id, version, name, user_created, bases, additions,
         user_customizations, total_mg, target_capsules, recommended_capsules,
         rationale, warnings, safety_validation, needs_reformulation,
         discontinued_ingredients, created_at, archived_at
    FROM formulas
   WHERE archived_at IS NULL
   ORDER BY created_at DESC
`);

const { rows: userRows } = await pool.query(
  `SELECT id, email, created_at FROM users WHERE id = ANY($1)`,
  [Array.from(new Set(formulas.map((f) => f.user_id)))]
);
const userById = new Map(userRows.map((u) => [u.id, u]));

console.log(`Loaded ${formulas.length} active formulas across ${userById.size} users.\n`);

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = {
  total: formulas.length,
  aiGenerated: 0,
  userCreated: 0,
  hasRationale: 0,
  hasWarnings: 0,
  flaggedForReformulation: 0,
  perCapsuleCount: { 6: 0, 9: 0, 12: 0, other: 0 },
};

const issues = {
  unknownIngredients: new Map(), // name -> { count, formulas: [{id, version, user}] }
  doseRangeViolations: [],       // { formulaId, version, user, ingredient, dose, min, max }
  missingDoseRange: [],          // { formulaId, ingredient }
  totalMgOverBudget: [],         // { formulaId, version, user, totalMg, budget, capsules }
  totalMgUnderfilled: [],        // 9-cap formulas <4400mg, etc.
  totalMgMismatch: [],           // stored total_mg != computed
  duplicateIngredients: [],      // same ingredient listed twice in bases or additions
  emptyFormula: [],              // 0 ingredients
  capsuleCountInvalid: [],
  noRationale: [],
  zeroDose: [],
};

const allIngredientUsage = new Map(); // ingredient -> count

function getDose(item) {
  return Number(item?.amount ?? item?.doseMg ?? 0);
}

for (const f of formulas) {
  if (f.user_created) stats.userCreated++; else stats.aiGenerated++;
  if (f.rationale && f.rationale.trim().length > 20) stats.hasRationale++;
  else issues.noRationale.push({ id: f.id, user: userById.get(f.user_id)?.email || f.user_id });

  if (Array.isArray(f.warnings) && f.warnings.length > 0) stats.hasWarnings++;
  if (f.needs_reformulation) stats.flaggedForReformulation++;

  const tc = f.target_capsules;
  if ([6, 9, 12].includes(tc)) stats.perCapsuleCount[tc]++;
  else { stats.perCapsuleCount.other++; issues.capsuleCountInvalid.push({ id: f.id, target_capsules: tc }); }

  const bases = Array.isArray(f.bases) ? f.bases : [];
  const additions = Array.isArray(f.additions) ? f.additions : [];
  const addedBases = f.user_customizations?.addedBases ?? [];
  const addedIndividuals = f.user_customizations?.addedIndividuals ?? [];
  const allItems = [...bases, ...additions, ...addedBases, ...addedIndividuals];

  if (allItems.length === 0) {
    issues.emptyFormula.push({ id: f.id, version: f.version, user: userById.get(f.user_id)?.email });
    continue;
  }

  // Track unique-by-name within bases+additions (AI-emitted)
  const seenInBasesAdds = new Map();
  for (const it of [...bases, ...additions]) {
    const key = normalize(it?.ingredient);
    if (!key) continue;
    if (seenInBasesAdds.has(key)) {
      issues.duplicateIngredients.push({
        id: f.id, version: f.version, user: userById.get(f.user_id)?.email,
        ingredient: it.ingredient,
      });
    }
    seenInBasesAdds.set(key, true);
  }

  let computedTotal = 0;
  for (const item of allItems) {
    const ingName = String(item?.ingredient || '').trim();
    const dose = getDose(item);
    if (!ingName) continue;

    allIngredientUsage.set(ingName, (allIngredientUsage.get(ingName) || 0) + 1);
    computedTotal += dose;

    if (dose <= 0) {
      issues.zeroDose.push({ id: f.id, version: f.version, ingredient: ingName, dose });
      continue;
    }

    const cat = CATALOG.get(normalize(ingName));
    if (!cat) {
      const entry = issues.unknownIngredients.get(ingName) || { count: 0, formulas: [] };
      entry.count++;
      entry.formulas.push({ id: f.id, version: f.version, user: userById.get(f.user_id)?.email });
      issues.unknownIngredients.set(ingName, entry);
      continue;
    }

    if (cat.min == null || cat.max == null) {
      issues.missingDoseRange.push({ id: f.id, ingredient: ingName });
      continue;
    }

    if (dose < cat.min || dose > cat.max) {
      issues.doseRangeViolations.push({
        id: f.id, version: f.version, user: userById.get(f.user_id)?.email,
        ingredient: ingName, dose, min: cat.min, max: cat.max,
      });
    }
  }

  // Capsule budget check (system intentionally allows up to 2.5% overage from auto-fill top-up)
  const capsules = [6, 9, 12].includes(tc) ? tc : 9;
  const budget = capsules * CAPSULE_CAPACITY_MG;
  const hardCap = Math.floor(budget * 1.025); // matches autoFitFormulaToBudget tolerance
  const minFill = Math.round(budget * 2 / 3); // 2/3 fill threshold = "underfilled"
  if (computedTotal > hardCap) {
    issues.totalMgOverBudget.push({
      id: f.id, version: f.version, user: userById.get(f.user_id)?.email,
      totalMg: computedTotal, budget, hardCap, capsules,
      overshootPct: (((computedTotal - budget) / budget) * 100).toFixed(2),
    });
  }
  if (computedTotal < minFill && !f.user_created) {
    issues.totalMgUnderfilled.push({
      id: f.id, version: f.version, user: userById.get(f.user_id)?.email,
      totalMg: computedTotal, minFill, capsules,
    });
  }
  if (Math.abs(computedTotal - (f.total_mg ?? 0)) > 5) {
    issues.totalMgMismatch.push({
      id: f.id, version: f.version, user: userById.get(f.user_id)?.email,
      stored: f.total_mg, computed: computedTotal, diff: computedTotal - (f.total_mg ?? 0),
    });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
const fmtPct = (n) => `${((n / Math.max(1, stats.total)) * 100).toFixed(1)}%`;
console.log('═══════════════════════════════════════════════════════════════');
console.log('  OVERVIEW');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Total active formulas:           ${stats.total}`);
console.log(`    AI-generated:                  ${stats.aiGenerated}  (${fmtPct(stats.aiGenerated)})`);
console.log(`    User-created (manual):         ${stats.userCreated}  (${fmtPct(stats.userCreated)})`);
console.log(`  With rationale:                  ${stats.hasRationale}  (${fmtPct(stats.hasRationale)})`);
console.log(`  With safety warnings:            ${stats.hasWarnings}  (${fmtPct(stats.hasWarnings)})`);
console.log(`  Flagged for reformulation:       ${stats.flaggedForReformulation}`);
console.log(`  Capsule count distribution:`);
for (const c of [6, 9, 12]) {
  console.log(`    ${c}-cap formulas:                 ${stats.perCapsuleCount[c]}  (${fmtPct(stats.perCapsuleCount[c])})`);
}
if (stats.perCapsuleCount.other) console.log(`    Other/invalid:                   ${stats.perCapsuleCount.other}`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  INTEGRITY ISSUES');
console.log('═══════════════════════════════════════════════════════════════');

function section(label, count, extra = '') {
  const status = count === 0 ? '✓' : (count < 3 ? '⚠' : '✗');
  console.log(`  ${status} ${label.padEnd(40)} ${String(count).padStart(4)} ${extra}`);
}

section('Empty formulas (0 ingredients)', issues.emptyFormula.length);
section('Unknown / off-catalog ingredients', issues.unknownIngredients.size, `(${[...issues.unknownIngredients.values()].reduce((s,e)=>s+e.count,0)} occurrences)`);
section('Dose outside catalog range', issues.doseRangeViolations.length);
section('Catalog entry missing dose range', issues.missingDoseRange.length);
section('Total mg exceeds 2.5% overage cap', issues.totalMgOverBudget.length);
section('Underfilled (AI under 2/3 budget)', issues.totalMgUnderfilled.length);
section('total_mg ≠ sum of ingredients', issues.totalMgMismatch.length);
section('Duplicate ingredient in same formula', issues.duplicateIngredients.length);
section('Zero-dose ingredients', issues.zeroDose.length);
section('Invalid target_capsules value', issues.capsuleCountInvalid.length);
section('Missing/empty rationale', issues.noRationale.length);

// Detail dumps
function dump(label, items, formatter, limit = 20) {
  if (items.length === 0) return;
  console.log(`\n--- ${label}${items.length > limit ? ` (showing ${limit} of ${items.length})` : ''} ---`);
  items.slice(0, limit).forEach((it) => console.log('  ' + formatter(it)));
}

if (issues.unknownIngredients.size > 0) {
  console.log('\n--- UNKNOWN / OFF-CATALOG INGREDIENTS ---');
  const sorted = [...issues.unknownIngredients.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [name, entry] of sorted) {
    console.log(`  • "${name}" — used in ${entry.count} formula(s)`);
    entry.formulas.slice(0, 3).forEach((f) => console.log(`      ↳ ${f.user || '?'} v${f.version} (${f.id.slice(0, 8)})`));
  }
}

dump('DOSE OUTSIDE CATALOG RANGE', issues.doseRangeViolations,
  (v) => `${v.user || '?'} v${v.version}: ${v.ingredient} ${v.dose}mg (allowed ${v.min}–${v.max})`);

dump('TOTAL MG EXCEEDS 2.5% OVERAGE CAP', issues.totalMgOverBudget,
  (v) => `${v.user || '?'} v${v.version}: ${v.totalMg}mg total, budget ${v.budget}mg + tolerance ${v.hardCap}mg (${v.capsules} caps, +${v.overshootPct}%)`);

dump('UNDERFILLED FORMULAS (<2/3 budget)', issues.totalMgUnderfilled,
  (v) => `${v.user || '?'} v${v.version}: ${v.totalMg}mg total, expected ≥${v.minFill}mg (${v.capsules} caps)`);

dump('TOTAL_MG MISMATCH (stored vs computed)', issues.totalMgMismatch,
  (v) => `${v.user || '?'} v${v.version}: stored=${v.stored} computed=${v.computed} diff=${v.diff > 0 ? '+' : ''}${v.diff}`);

dump('DUPLICATE INGREDIENTS', issues.duplicateIngredients,
  (v) => `${v.user || '?'} v${v.version}: ${v.ingredient}`);

dump('ZERO-DOSE INGREDIENTS', issues.zeroDose,
  (v) => `formula ${v.id.slice(0, 8)} v${v.version}: ${v.ingredient} dose=${v.dose}`);

// Top ingredients
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  TOP 20 INGREDIENTS BY USAGE');
console.log('═══════════════════════════════════════════════════════════════');
[...allIngredientUsage.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([name, count]) => console.log(`  ${String(count).padStart(4)}× ${name}`));

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  Audit complete · ${new Date().toISOString()}`);
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
