const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const API_KEY = process.env.ALIVE_API_KEY;
const API_ORIGIN = process.env.ALIVE_API_ORIGIN || 'https://myones.onrender.com';
const BASE_URL = 'https://dev.aliveinnovations.com/api';

function fetchJSON(url, options) {
  const https = require('https');
  const { URL } = require('url');
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options?.method || 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Origin': API_ORIGIN,
        'Accept': 'application/json',
        ...(options?.headers || {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error(data)); } });
    });
    req.on('error', reject);
    if (options?.body) {
      req.setHeader('Content-Type', 'application/json');
      req.write(options.body);
    }
    req.end();
  });
}

function normalizeName(n) {
  return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

async function run() {
  // 1. Find formula
  const formulas = await pool.query(
    `SELECT id, name, version, target_capsules, bases, additions, user_customizations, created_at
     FROM formulas
     WHERE (name ILIKE '%Cardio Shield%Cognitive Drive%' OR name ILIKE '%Cognitive Drive%Cardio Shield%')
     ORDER BY created_at DESC LIMIT 1`
  );
  if (formulas.rowCount === 0) {
    console.log('No matching formula found');
    await pool.end();
    return;
  }
  const formula = formulas.rows[0];
  const capsPerDay = formula.target_capsules;
  console.log(`Formula: ${formula.name} v${formula.version}`);
  console.log(`Capsules/day: ${capsPerDay}`);
  console.log(`Created: ${formula.created_at}\n`);

  // 2. Collect ingredients
  const bases = Array.isArray(formula.bases) ? formula.bases : [];
  const additions = Array.isArray(formula.additions) ? formula.additions : [];
  const items = [...bases, ...additions].filter(i => i?.ingredient && Number(i.amount) > 0);

  console.log('--- Ingredients ---');
  let totalMg = 0;
  items.forEach(i => { console.log(`  ${i.ingredient} — ${i.amount}mg`); totalMg += i.amount; });
  console.log(`Total fill: ${totalMg}mg (${items.length} ingredients)\n`);

  // 3. Fetch Alive catalog
  const catalogJson = await fetchJSON(`${BASE_URL}/ingredients`);
  const catalog = Array.isArray(catalogJson?.data) ? catalogJson.data : (Array.isArray(catalogJson) ? catalogJson : []);
  console.log(`Alive catalog: ${catalog.length} ingredients\n`);

  // 4. Match and build payload
  const payloadIngredients = [];
  const unmapped = [];
  for (const item of items) {
    const norm = normalizeName(item.ingredient);
    const match = catalog.find(c => normalizeName(c.name) === norm);
    if (!match) {
      // Try substring
      const sub = catalog.find(c => {
        const cn = normalizeName(c.name);
        return cn.length >= 4 && norm.length >= 4 && (cn.includes(norm) || norm.includes(cn));
      });
      if (sub) {
        const perCap = Math.round((item.amount / capsPerDay) * 1000) / 1000;
        payloadIngredients.push({ ingredient_id: sub.ingredient_id, weight_in_mg: perCap });
        console.log(`  MATCH (sub): ${item.ingredient} → ID ${sub.ingredient_id} (${sub.name}), ${perCap}mg/cap`);
      } else {
        unmapped.push(item.ingredient);
        console.log(`  MISS: ${item.ingredient}`);
      }
    } else {
      const perCap = Math.round((item.amount / capsPerDay) * 1000) / 1000;
      payloadIngredients.push({ ingredient_id: match.ingredient_id, weight_in_mg: perCap });
      console.log(`  MATCH: ${item.ingredient} → ID ${match.ingredient_id} (${match.name}), ${perCap}mg/cap`);
    }
  }

  if (unmapped.length > 0) console.log(`\nUnmapped: ${unmapped.join(', ')}`);
  console.log(`\nMapped: ${payloadIngredients.length}/${items.length}`);

  // 5. Get quote
  const QUOTE_WEEKS = 8;
  const totalCapsules = capsPerDay * QUOTE_WEEKS * 7;
  const quoteBody = {
    ingredients: payloadIngredients,
    number_of_weeks: QUOTE_WEEKS,
    capsule_count: totalCapsules,
  };
  console.log(`\nQuote request: ${totalCapsules} total capsules (${capsPerDay}/day × ${QUOTE_WEEKS} weeks)`);

  const quote = await fetchJSON(`${BASE_URL}/get-quote`, {
    method: 'POST',
    body: JSON.stringify(quoteBody),
  });

  console.log('\n--- Alive Quote Response ---');
  console.log(JSON.stringify(quote, null, 2));

  const cost = parseFloat(quote.total || quote.price || '0');
  if (cost > 0) {
    const multiplier = 1.65;
    const nonMemberPrice = Math.round(cost * multiplier * 100) / 100;
    const memberPrice = Math.round(nonMemberPrice * 0.85 * 100) / 100;

    console.log('\n--- Pricing Breakdown (8-week supply) ---');
    console.log(`                         Non-Member       Member (15% off)`);
    console.log(`Our cost (Alive)         $${cost.toFixed(2)}          $${cost.toFixed(2)}`);
    console.log(`Customer price           $${nonMemberPrice.toFixed(2)}         $${memberPrice.toFixed(2)}`);
    console.log(`Gross profit             $${(nonMemberPrice - cost).toFixed(2)}         $${(memberPrice - cost).toFixed(2)}`);
    console.log(`Markup %                 ${((nonMemberPrice - cost) / cost * 100).toFixed(1)}%            ${((memberPrice - cost) / cost * 100).toFixed(1)}%`);
    console.log(`Margin %                 ${((nonMemberPrice - cost) / nonMemberPrice * 100).toFixed(1)}%            ${((memberPrice - cost) / memberPrice * 100).toFixed(1)}%`);
    console.log(`Monthly (÷2)             $${(nonMemberPrice / 2).toFixed(2)}         $${(memberPrice / 2).toFixed(2)}`);
  } else {
    console.log('\nNo valid cost returned from quote.');
  }

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
