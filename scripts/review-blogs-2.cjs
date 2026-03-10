require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query(
    "SELECT title, slug, content FROM blog_posts WHERE slug IN ('vitamin-d3-k2-optimal-levels-dosage','magnesium-types-benefits-which-form-to-take','liver-support-detox-science-milk-thistle-nad','coq10-ubiquinol-benefits-dosage-heart-energy') ORDER BY title"
  );

  for (const a of res.rows) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ARTICLE: ${a.title}`);
    console.log(`Slug: ${a.slug}`);
    console.log(`${'='.repeat(80)}`);
    console.log(a.content);
    console.log(`\n--- END ---\n`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
