require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(async () => {
  const slugs = [
    'omega-3-fish-oil-benefits-epa-dha-ratio',
    'coq10-ubiquinol-benefits-dosage-heart-energy',
    'thyroid-support-hashimotos-hypothyroid-supplements',
  ];
  for (const slug of slugs) {
    const { rows } = await c.query('SELECT content FROM blog_posts WHERE slug = $1', [slug]);
    const content = rows[0]?.content ?? '';
    // Find and show lines containing "ONES AI includes"
    const lines = content.split('\n');
    const flagged = lines.filter(l => l.toLowerCase().includes('ones ai includes') || l.toLowerCase().includes('ones ai uses'));
    console.log(`\n=== ${slug} ===`);
    if (flagged.length === 0) {
      console.log('  (No direct matches found — checking nearby context...)');
      const nearOnes = lines.filter(l => l.toLowerCase().includes('ones ai'));
      nearOnes.slice(0, 5).forEach(l => console.log('  >', l.trim()));
    } else {
      flagged.forEach(l => console.log('  FLAGGED:', l.trim()));
    }
  }
  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
