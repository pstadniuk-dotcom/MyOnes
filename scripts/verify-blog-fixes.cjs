require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await c.connect();
  const r = await c.query('SELECT slug, content FROM blog_posts ORDER BY slug');
  
  let issues = 0;
  
  for (const row of r.rows) {
    const checks = [];
    
    // Check for "pending" citations
    const pendingMatches = row.content.match(/pending.*?(PMID|verification|confirmation)/gi);
    if (pendingMatches) {
      checks.push(`⚠️  ${pendingMatches.length} pending citation(s)`);
      issues++;
    }
    
    // Check for ONES AI + specific doses/ingredients
    const protocolMatch = row.content.match(/ONES AI.{0,50}(mg\/day|protocol|uses most)/gi);
    if (protocolMatch) {
      checks.push(`❌ ONES AI brand + dose/protocol: "${protocolMatch[0]}"`);
      issues++;
    }
    
    // Check for References section
    const hasRefs = row.content.includes('## References');
    if (!hasRefs) {
      checks.push('⚠️  No References section');
      issues++;
    }
    
    // Count PMID links
    const pmidLinks = row.content.match(/PMID:\s*\d+/g);
    const pmidCount = pmidLinks ? pmidLinks.length : 0;
    
    // Check for Hemingway
    if (row.content.includes('Hemingway')) {
      checks.push('❌ Contains fabricated "Hemingway" author');
      issues++;
    }
    
    const status = checks.length === 0 ? '✅' : '⚠️';
    console.log(`${status} ${row.slug} — ${pmidCount} PMID links`);
    for (const check of checks) {
      console.log(`   ${check}`);
    }
  }
  
  console.log(`\n${issues === 0 ? '✅ All articles clean!' : `⚠️  ${issues} issue(s) found`}`);
  await c.end();
}
main().catch(e => { console.error(e); c.end(); });
