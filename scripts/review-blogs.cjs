require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Get column names first
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'blog_posts' ORDER BY ordinal_position"
  );
  console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));

  // Get all articles
  const res = await pool.query(
    'SELECT id, slug, title, content, meta_title, meta_description, tags FROM blog_posts ORDER BY id'
  );

  console.log(`\n========== ${res.rows.length} BLOG ARTICLES ==========\n`);

  for (let i = 0; i < res.rows.length; i++) {
    const a = res.rows[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ARTICLE ${i + 1}: ${a.title}`);
    console.log(`Slug: ${a.slug}`);
    console.log(`Tags: ${a.tags || 'none'}`);
    console.log(`Meta Title: ${a.meta_title || 'none'}`);
    console.log(`Meta Desc: ${(a.meta_description || '').substring(0, 120)}`);
    console.log(`Content Length: ${a.content.length} chars`);
    console.log(`${'='.repeat(80)}`);
    console.log(a.content);
    console.log(`\n--- END ARTICLE ${i + 1} ---\n`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
