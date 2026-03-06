require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await c.connect();
  const r = await c.query("SELECT content FROM blog_posts WHERE slug = 'omega-3-fish-oil-benefits-epa-dha-ratio'");
  const content = r.rows[0].content;
  const idx = content.indexOf('## References');
  if (idx >= 0) {
    console.log(content.substring(idx));
  } else {
    console.log('No References section');
  }
  await c.end();
}
main().catch(e => { console.error(e); c.end(); });
