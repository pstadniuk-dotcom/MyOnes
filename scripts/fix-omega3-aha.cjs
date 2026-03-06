require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await c.connect();
  const r = await c.query("SELECT content FROM blog_posts WHERE slug = 'omega-3-fish-oil-benefits-epa-dha-ratio'");
  let content = r.rows[0].content;

  // Replace the pending AHA citation with verified one
  const oldCitation = '2. Omega-3 fatty acids and cardiovascular outcomes — AHA advisory and supporting meta-analyses. *(General omega-3 triglyceride data well-established; specific meta-analysis citations for 25–30% triglyceride reduction and depression outcomes pending individual PMID verification)*';
  const newCitation = '2. Siscovick DS, Barringer TA, Fretts AM, et al. "Omega-3 Polyunsaturated Fatty Acid (Fish Oil) Supplementation and the Prevention of Clinical Cardiovascular Disease: A Science Advisory From the American Heart Association." *Circulation.* 2017;135(15):e867–e884. [PMID: 28289069](https://pubmed.ncbi.nlm.nih.gov/28289069/)';

  if (content.includes(oldCitation)) {
    content = content.replace(oldCitation, newCitation);
    await c.query("UPDATE blog_posts SET content = $1, updated_at = NOW() WHERE slug = 'omega-3-fish-oil-benefits-epa-dha-ratio'", [content]);
    console.log('✅ Fixed AHA citation → PMID 28289069');
  } else {
    // Debug: show exact bytes around "AHA"
    const idx = content.indexOf('AHA advisory');
    if (idx >= 0) {
      const snippet = content.substring(idx - 80, idx + 200);
      console.log('Found AHA but string mismatch. Snippet:');
      console.log(JSON.stringify(snippet));
      
      // Try regex approach
      const regex = /2\.\s*Omega-3 fatty acids.*?pending individual PMID verification\)\*/s;
      if (regex.test(content)) {
        content = content.replace(regex, newCitation);
        await c.query("UPDATE blog_posts SET content = $1, updated_at = NOW() WHERE slug = 'omega-3-fish-oil-benefits-epa-dha-ratio'", [content]);
        console.log('✅ Fixed AHA citation via regex → PMID 28289069');
      } else {
        console.log('❌ Regex also failed');
      }
    } else {
      console.log('❌ AHA advisory text not found');
    }
  }

  await c.end();
}
main().catch(e => { console.error(e); c.end(); });
