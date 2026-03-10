require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(async () => {
  const { rows } = await c.query(`
    SELECT slug,
      (content LIKE '%ONES AI includes%'
        OR content LIKE '%ONES AI''s specific protocol%'
        OR content LIKE '%ONES AI Adrenal Support formula%'
      ) AS has_false_claims,
      (content LIKE '%How ONES AI Personalizes Your Formula%') AS has_safe_cta
    FROM blog_posts ORDER BY published_at
  `);
  console.log('\n--- Blog Article Content Audit ---');
  let allClean = true;
  rows.forEach(r => {
    const status = r.has_false_claims ? '❌ HAS FALSE CLAIMS' : '✅ clean';
    const cta = r.has_safe_cta ? '✅ safe CTA present' : '⚠️  no CTA';
    console.log(`  ${r.slug.padEnd(55)} ${status}  |  ${cta}`);
    if (r.has_false_claims) allClean = false;
  });
  console.log(`\n${allClean ? '✅ All articles are clean.' : '❌ Some articles still have issues.'}\n`);
  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
