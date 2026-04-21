import 'dotenv/config';
/**
 * Cleanup Script — Delete un-pitched prospects, research audience for pitched ones
 * 
 * 1. Delete all prospects with status = 'new' or 'cold' (never sent out)
 * 2. For each remaining 'pitched' prospect, research actual audience size
 */
import pg from 'pg';
import OpenAI from 'openai';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Step 1: Delete prospects that were never sent out
console.log('=== Step 1: Deleting un-pitched prospects ===');

// First delete any pitches associated with prospects we're about to delete
const deletedPitches = await pool.query(`
  DELETE FROM outreach_pitches
  WHERE prospect_id IN (
    SELECT id FROM outreach_prospects WHERE status IN ('new', 'cold')
  )
  RETURNING id
`);
console.log(`Deleted ${deletedPitches.rowCount} orphan pitches`);

const deleted = await pool.query(`
  DELETE FROM outreach_prospects
  WHERE status IN ('new', 'cold')
  RETURNING id, name
`);
console.log(`Deleted ${deleted.rowCount} un-pitched prospects`);

// Step 2: Get remaining prospects
const remaining = await pool.query(`
  SELECT id, name, category, audience_estimate, url
  FROM outreach_prospects
  ORDER BY name
`);
console.log(`\n=== Step 2: Researching audience for ${remaining.rows.length} pitched prospects ===`);

// Step 3: Use OpenAI to research audience sizes
import { readFileSync } from 'fs';
const envContent = readFileSync('server/.env', 'utf-8');
const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
if (!apiKeyMatch) {
  console.error('No OPENAI_API_KEY found in server/.env');
  process.exit(1);
}
const openaiClient = new OpenAI({ apiKey: apiKeyMatch[1].trim() });

// Batch prospects into groups of 10 for efficiency
const batchSize = 10;
const prospects = remaining.rows;
let updated = 0;

for (let i = 0; i < prospects.length; i += batchSize) {
  const batch = prospects.slice(i, i + batchSize);
  const prospectList = batch.map((p, idx) => 
    `${idx + 1}. "${p.name}" (${p.category}) — URL: ${p.url}`
  ).join('\n');

  console.log(`\nResearching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(prospects.length / batchSize)}...`);

  try {
    const response = await openaiClient.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        {
          role: 'system',
          content: `You are a research assistant. For each podcast or publication listed, find the ACTUAL audience size — look up their social media followers (Instagram, Twitter/X, YouTube, Facebook, LinkedIn), Apple Podcasts ratings count, Spotify listeners, monthly website visitors, or any other verifiable audience metric.

Return a JSON array with one object per item:
[
  {
    "name": "...",
    "audienceEstimate": "85,000 Instagram followers, 12,000 YouTube subscribers",
    "numericEstimate": 85000
  }
]

For numericEstimate, use the LARGEST single platform number you can verify.
If you truly cannot find any audience data, set numericEstimate to 0 and audienceEstimate to "Could not verify".
Do NOT guess — only report numbers you actually find in search results.`,
        },
        {
          role: 'user',
          content: `Research the audience size for each of these:\n\n${prospectList}`,
        },
      ],
    });

    // Extract text
    let textOutput = '';
    for (const item of response.output) {
      if (item.type === 'message') {
        for (const c of item.content) {
          if (c.type === 'output_text') textOutput += c.text;
          else if (c.type === 'text') textOutput += c.text;
        }
      }
    }
    if (!textOutput && response.output_text) {
      textOutput = response.output_text;
    }

    // Parse JSON
    const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, textOutput];
    const jsonStr = jsonMatch[1]?.trim() || '[]';
    
    let results;
    try {
      results = JSON.parse(jsonStr);
    } catch {
      console.log('  Failed to parse batch response, trying to extract...');
      // Try to find any JSON array in the text
      const arrMatch = textOutput.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try { results = JSON.parse(arrMatch[0]); } catch { results = []; }
      } else {
        results = [];
      }
    }

    // Update each prospect
    for (const result of results) {
      const prospect = batch.find(p => 
        p.name.toLowerCase().includes(result.name?.toLowerCase()?.substring(0, 20)) ||
        result.name?.toLowerCase()?.includes(p.name.toLowerCase().substring(0, 20))
      );
      if (prospect && result.audienceEstimate) {
        await pool.query(
          'UPDATE outreach_prospects SET audience_estimate = $1 WHERE id = $2',
          [result.audienceEstimate, prospect.id]
        );
        console.log(`  ✓ ${prospect.name}: ${result.audienceEstimate} (${result.numericEstimate || '?'})`);
        updated++;
      }
    }
  } catch (err) {
    console.error(`  Batch error: ${err.message}`);
  }

  // Rate limit pause between batches
  if (i + batchSize < prospects.length) {
    await new Promise(r => setTimeout(r, 2000));
  }
}

console.log(`\n=== Summary ===`);
console.log(`Deleted: ${deleted.rowCount} un-pitched prospects`);
console.log(`Audience updated: ${updated}/${prospects.length} pitched prospects`);

// Show final state
const final = await pool.query(`
  SELECT name, category, audience_estimate, contact_method, contact_email
  FROM outreach_prospects
  ORDER BY name
`);
console.log(`\n=== Final ${final.rows.length} prospects ===`);
final.rows.forEach(r => {
  console.log(`  ${r.name} | ${r.category} | audience: ${r.audience_estimate || 'N/A'} | ${r.contact_method} | ${r.contact_email || 'no email'}`);
});

await pool.end();
