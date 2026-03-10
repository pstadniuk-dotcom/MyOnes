/**
 * fix-blog-ones-claims.cjs
 *
 * Strips any fabricated "ONES AI Protocol" sections from blog articles
 * and replaces them with an accurate, safe standard CTA block.
 *
 * Run: node scripts/fix-blog-ones-claims.cjs
 */

require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');

// ─── Safe replacement CTA ───────────────────────────────────────────────────
// Uses only accurate, verifiable language — no invented doses or ingredients.
const SAFE_CTA = `## How ONES AI Personalizes Your Formula

Every ONES AI formula is built around *your* data — not population averages, generic recommendations, or marketing copy.

When your lab results, health history, and symptom picture suggest a need in the area discussed above, our AI health practitioner will:

- Explain which compounds the clinical evidence supports for your situation
- Select ingredients and doses from our catalog of 200+ clinically validated options
- Build a formula that fits your daily capsule budget and avoids interactions with your current medications or supplements
- Provide a clear rationale for every ingredient included — and every ingredient left out

No guessing. No one-size-fits-all blends. A formula that reflects your actual physiology.

**[Start your personalized assessment →](/)**

*These statements have not been evaluated by the Food and Drug Administration. This content is for educational purposes only and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare provider before starting any supplement regimen.*`;

// Regex patterns that capture ONES AI-specific protocol sections
// These are the headers used in the seed articles
const ONES_AI_SECTION_PATTERNS = [
  /## ONES AI['']s? [\w\s&+]+Protocol[\s\S]*?(?=\n## |\n---|\n\*\*\[|$)/gi,
  /## How ONES AI (Uses|Approaches|Includes|Handles) [\s\S]*?(?=\n## |\n---|\n\*\*\[|$)/gi,
  /## The ONES AI Approach[\s\S]*?(?=\n## |\n---|\n\*\*\[|$)/gi,
  /## ONES AI [\w\s]+ Formula[\s\S]*?(?=\n## |\n---|\n\*\*\[|$)/gi,
];

// Also strip any inline "ONES AI includes X at Ymg" type sentences
const ONES_AI_INLINE_PATTERN = /ONES AI (includes?|uses?|adds?|provides?) [^.]*?\d+\s?mg[^.]*\./gi;

function fixContent(content) {
  let fixed = content;
  let changed = false;

  // Remove whole ONES AI protocol sections and append the safe CTA
  for (const pattern of ONES_AI_SECTION_PATTERNS) {
    const before = fixed;
    fixed = fixed.replace(pattern, '');
    if (fixed !== before) changed = true;
  }

  // Remove inline fabricated dose claims
  const before2 = fixed;
  fixed = fixed.replace(ONES_AI_INLINE_PATTERN, '');
  if (fixed !== before2) changed = true;

  // If we removed sections, append the safe CTA at the end (only once)
  if (changed && !fixed.includes('## How ONES AI Personalizes Your Formula')) {
    fixed = fixed.trimEnd() + '\n\n' + SAFE_CTA;
  }

  // If the article didn't have any ONES AI sections at all, still add CTA if missing
  if (!changed && !fixed.includes('## How ONES AI Personalizes Your Formula')) {
    // Only add if it looks like it should have one (long-form article)
    if (fixed.length > 2000) {
      fixed = fixed.trimEnd() + '\n\n' + SAFE_CTA;
      changed = true;
    }
  }

  return { fixed, changed };
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: posts } = await client.query('SELECT id, slug, content FROM blog_posts ORDER BY published_at');
    console.log(`\n🔍 Checking ${posts.length} articles for false ONES AI claims...\n`);

    let updatedCount = 0;
    for (const post of posts) {
      const { fixed, changed } = fixContent(post.content);
      if (changed) {
        await client.query(
          'UPDATE blog_posts SET content = $1, updated_at = NOW() WHERE id = $2',
          [fixed, post.id]
        );
        console.log(`  ✅ Fixed: ${post.slug}`);
        updatedCount++;
      } else {
        console.log(`  — No changes: ${post.slug}`);
      }
    }

    console.log(`\n✨ Done. ${updatedCount}/${posts.length} articles updated.\n`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
