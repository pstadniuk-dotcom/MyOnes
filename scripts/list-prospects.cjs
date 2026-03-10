// Quick script to list press prospects
const dotenv = require('dotenv');
dotenv.config({ path: 'server/.env' });
const pg = require('pg');

(async () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('\n=== ALL PROSPECTS ===\n');

  const r = await pool.query(`
    SELECT name, category, sub_type, url, contact_email, contact_form_url, 
           host_name, publication_name, relevance_score, contact_method, status,
           topics
    FROM outreach_prospects 
    ORDER BY category, relevance_score DESC NULLS LAST
  `);

  let currentCat = '';
  r.rows.forEach((row, i) => {
    if (row.category !== currentCat) {
      currentCat = row.category;
      console.log(`\n${'─'.repeat(60)}`);
      console.log(` ${currentCat.toUpperCase()} PROSPECTS`);
      console.log('─'.repeat(60));
    }
    console.log(`\n  ${i + 1}. ${row.name}`);
    console.log(`     Score: ${row.relevance_score} | Contact: ${row.contact_method} | Type: ${row.sub_type || 'general'}`);
    console.log(`     URL: ${row.url}`);
    if (row.contact_email) console.log(`     Email: ${row.contact_email}`);
    if (row.publication_name) console.log(`     Publication: ${row.publication_name}`);
    if (row.topics?.length) console.log(`     Topics: ${row.topics.join(', ')}`);
  });

  // Summary
  const podcasts = r.rows.filter(r => r.category === 'podcast');
  const press = r.rows.filter(r => r.category === 'press');
  console.log(`\n${'═'.repeat(60)}`);
  console.log(` TOTAL: ${r.rows.length} prospects (${podcasts.length} podcast, ${press.length} press)`);
  console.log(`═`.repeat(60));

  await pool.end();
})();
