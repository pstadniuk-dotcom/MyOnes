require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

const fixes = [
  ['ones-ai-vs-ritual-vs-care-of-personalized-vitamins', 'Ones vs Ritual vs Care/Of: Which Is More Personalized? | Ones'],
];

async function run() {
  for (const [slug, metaTitle] of fixes) {
    const res = await p.query(
      'UPDATE blog_posts SET meta_title=$1, updated_at=NOW() WHERE slug=$2 RETURNING title, meta_title',
      [metaTitle, slug]
    );
    console.log('Fixed:', res.rows[0]);
  }
  await p.end();
}
run().catch(e => { console.error(e.message); p.end(); });
