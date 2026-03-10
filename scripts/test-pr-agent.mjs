/**
 * PR Agent Test — Live web search for outreach opportunities
 * Uses OpenAI Responses API with web_search tool
 */
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', 'server', '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SEARCH_QUERIES = [
  // Podcast guest spots
  `health wellness podcast "accepting guest applications" OR "be a guest" personalized supplements 2025 2026`,
  // Guest posts & contributor spots
  `"write for us" OR "contributor guidelines" personalized nutrition supplements health blog`,
  // Press/feature opportunities
  `supplement brand feature OR review biohacking longevity personalized nutrition newsletter`,
];

async function searchForOpportunities(query) {
  console.log(`\n🔍 Searching: "${query.substring(0, 80)}..."\n`);

  const response = await openai.responses.create({
    model: 'gpt-4o',
    tools: [{ type: 'web_search_preview' }],
    input: [
      {
        role: 'system',
        content: `You are a PR research agent for Ones (ones.health), a personalized supplement platform that builds custom capsule formulas from actual blood work. 

Your job is to find REAL, ACTIONABLE outreach opportunities. For each opportunity you find, extract:
1. Name of the publication/podcast/newsletter
2. Type (podcast, blog, newsletter, magazine, conference)
3. URL (the actual page where you can submit/apply/pitch)
4. Contact email (if visible on the page)
5. Host/editor name (if available)
6. Audience size estimate (any signals — social followers, reviews, etc.)
7. Why it's relevant to Ones (1-2 sentences)
8. Relevance score (1-100)

Return ONLY real opportunities you found in search results. Do not fabricate any. If you find a contact email on the page, include it. If not, note "email not found — check page".

Format as JSON array.`
      },
      {
        role: 'user',
        content: `Search the web for this query and find PR/outreach opportunities for a personalized supplement company:\n\n${query}\n\nReturn the top 5 most actionable results as a JSON array.`
      }
    ],
  });

  // Debug: log response structure
  let textOutput = '';
  for (const item of response.output) {
    if (item.type === 'message') {
      for (const c of item.content) {
        if (c.type === 'text') textOutput += c.text + '\n';
      }
    } else if (item.type === 'web_search_call') {
      console.log(`  [Web Search] Query: "${item.query || item.action?.query || 'searching...'}" Status: ${item.status}`);
    }
  }

  if (!textOutput && response.output_text) {
    textOutput = response.output_text;
  }

  // Last resort: dump structure keys
  if (!textOutput) {
    console.log('  Response keys:', Object.keys(response));
    console.log('  Output items:', response.output?.map(o => ({ type: o.type, keys: Object.keys(o) })));
    textOutput = JSON.stringify(response.output, null, 2).substring(0, 2000);
  }

  return textOutput;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ONES PR Agent — Live Web Search Test');
  console.log('  Searching for real outreach opportunities...');
  console.log('═══════════════════════════════════════════════════════════');

  for (const query of SEARCH_QUERIES) {
    try {
      const results = await searchForOpportunities(query);
      console.log(results);
      console.log('\n' + '─'.repeat(60));
    } catch (err) {
      console.error(`Error searching: ${err.message}`);
      if (err.message.includes('responses')) {
        console.log('\nFallback: Trying chat completions API instead...');
        // Fallback to chat completions with a simulated approach
        const fallback = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a PR research agent. Based on your training knowledge, identify REAL publications, podcasts, and blogs that accept guest pitches in the health/supplements/biohacking space. Only list ones you are confident actually exist. Include their real URLs and any known submission processes.`
            },
            {
              role: 'user',
              content: `Find 5 real outreach opportunities matching this search intent: ${query}\n\nFor each, provide: name, type, URL, contact method, audience size estimate, relevance to a personalized supplement brand. Format as JSON array.`
            }
          ],
          temperature: 0.3,
        });
        console.log(fallback.choices[0].message.content);
        console.log('\n' + '─'.repeat(60));
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  How Email Discovery Works:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`
  The agent finds emails through 4 methods:

  1. PAGE SCRAPING — Most "write for us" and "be a guest" pages
     include a contact email directly on the page. The AI reads
     the page content and extracts it.

  2. CONTACT PAGE CRAWLING — If no email on the submission page,
     the agent follows links to /contact, /about, /team pages
     and looks for editorial/booking emails.

  3. PATTERN INFERENCE — Most publications use patterns:
     editorial@publication.com, guests@podcastname.com,
     hello@brandname.com. The agent can identify the domain
     and suggest likely patterns.

  4. SOCIAL PROFILE EXTRACTION — Many podcast hosts list their
     booking email in their Twitter/Instagram/LinkedIn bios.
     The agent can check these.

  What the agent CANNOT do (by design):
  - Use email finder services (Hunter.io, etc.) — privacy concern
  - Scrape private databases — ethical issue
  - Guess personal emails — spam risk

  If no email is found, the prospect is flagged as
  "contact method: form submission" or "contact method: DM required"
  and you handle those manually.
  `);
}

main().catch(console.error);
