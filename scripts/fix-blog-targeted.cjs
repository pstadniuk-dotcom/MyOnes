/**
 * Targeted fix for 3 remaining articles with false ONES AI claims.
 * Uses simple string splitting (more robust than regex for this case).
 */
require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');

const SAFE_CTA_BLOCK = `## How Ones Personalizes Your Formula

Every Ones formula is built around *your* data — not population averages, generic recommendations, or marketing copy.

When your lab results, health history, and symptom picture suggest a need in the area discussed above, our AI health practitioner will:

- Explain which compounds the clinical evidence supports for your situation
- Select ingredients and doses from our catalog of 200+ clinically validated options
- Build a formula that fits your daily capsule budget and avoids interactions with your current medications or supplements
- Provide a clear rationale for every ingredient included — and every ingredient left out

No guessing. No one-size-fits-all blends. A formula that reflects your actual physiology.

**[Start your personalized assessment →](/)**

*These statements have not been evaluated by the Food and Drug Administration. This content is for educational purposes only and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare provider before starting any supplement regimen.*`;

// For each article: a list of section headers to remove (everything from that header to the next ## or end)
const SECTION_REMOVALS = {
  'omega-3-fish-oil-benefits-epa-dha-ratio': [
    "## ONES AI's Omega-3 Protocol",
    "## ONES AI\u2019s Omega-3 Protocol", // curly quote variant
  ],
  'coq10-ubiquinol-benefits-dosage-heart-energy': [
    '## ONES AI CoQ10 Protocol',
    "## ONES AI's CoQ10 Protocol",
  ],
};

// For thyroid article: remove a specific sentence (doesn't have a standalone section header)
const SENTENCE_REMOVALS = {
  'thyroid-support-hashimotos-hypothyroid-supplements': [
    'ONES AI includes ashwagandha in thyroid support protocols where HPA axis dysregulation co-exists, not specifically for thyroid hormone production.',
  ],
};

function removeSectionFromContent(content, sectionHeaders) {
  let result = content;
  for (const header of sectionHeaders) {
    const idx = result.indexOf(header);
    if (idx === -1) continue;
    // Find next ## section or end of string
    const afterHeader = result.indexOf('\n## ', idx + header.length);
    if (afterHeader !== -1) {
      result = result.slice(0, idx).trimEnd() + '\n' + result.slice(afterHeader);
    } else {
      // It's the last section
      result = result.slice(0, idx).trimEnd();
    }
    console.log(`    Removed section: "${header}"`);
  }
  return result;
}

function removeSentences(content, sentences) {
  let result = content;
  for (const sentence of sentences) {
    if (result.includes(sentence)) {
      result = result.replace(sentence, '').replace(/\n{3,}/g, '\n\n');
      console.log(`    Removed sentence: "${sentence.substring(0, 60)}..."`);
    }
  }
  return result;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const allSlugs = [
      ...Object.keys(SECTION_REMOVALS),
      ...Object.keys(SENTENCE_REMOVALS),
    ];

    for (const slug of allSlugs) {
      const { rows } = await client.query('SELECT id, content FROM blog_posts WHERE slug = $1', [slug]);
      if (!rows[0]) { console.log(`  ⚠️  Not found: ${slug}`); continue; }

      let { id, content } = rows[0];
      const original = content;

      // Remove entire sections
      if (SECTION_REMOVALS[slug]) {
        content = removeSectionFromContent(content, SECTION_REMOVALS[slug]);
      }

      // Remove specific sentences
      if (SENTENCE_REMOVALS[slug]) {
        content = removeSentences(content, SENTENCE_REMOVALS[slug]);
      }

      // Ensure safe CTA is present at end (if not already there after removals)
      if (!content.includes('## How Ones Personalizes Your Formula') && !content.includes('## How ONES AI Personalizes Your Formula')) {
        content = content.trimEnd() + '\n\n' + SAFE_CTA_BLOCK;
      }

      if (content !== original) {
        await client.query('UPDATE blog_posts SET content = $1, updated_at = NOW() WHERE id = $2', [content, id]);
        console.log(`  ✅ Fixed: ${slug}`);
      } else {
        console.log(`  — No changes needed: ${slug}`);
      }
    }

    console.log('\n✨ Targeted fix complete.\n');
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
