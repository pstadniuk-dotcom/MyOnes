/**
 * PR Agent — Live Integration Test
 * 
 * Tests the full pipeline:
 * 1. Web search for podcast opportunities
 * 2. Web search for press/magazine opportunities
 * 3. Deep scrape contact info from top results
 * 4. Score prospects
 * 5. Draft a pitch
 * 
 * Usage: node scripts/test-pr-agent-live.mjs
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', 'server', '.env') });

// We need to use the compiled server modules — register path aliases
import { register } from 'node:module';
import { pathToFileURL } from 'url';

// Since these are TypeScript modules, we'll call the API endpoints instead
const BASE = 'http://localhost:5000';

// ── Helpers ──────────────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`\n${emoji}  ${msg}`);
}

function divider(title) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

async function getAdminToken() {
  // Get an admin user's email from the DB to log in
  // First try to use a direct JWT generation approach via a quick endpoint
  // Or we'll just read the JWT_SECRET and sign our own token for testing
  const jwt = await import('jsonwebtoken');
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret';
  
  // Find an admin user
  const pg = await import('pg');
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const result = await pool.query("SELECT id FROM users WHERE is_admin = true LIMIT 1");
  await pool.end();
  
  if (result.rows.length === 0) {
    throw new Error('No admin user found in DB. Create one first.');
  }
  
  const adminId = result.rows[0].id;
  const token = jwt.default.sign({ userId: adminId, isAdmin: true }, secret, { expiresIn: '1h' });
  log('🔑', `Admin token generated for user ${adminId.substring(0, 8)}...`);
  return token;
}

async function apiCall(method, path, body, token) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`API ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ── Main Test ────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 PR Agent — Live Integration Test');
  console.log(`   Server: ${BASE}`);
  console.log(`   Time: ${new Date().toLocaleString()}`);
  
  // Step 0: Get admin token
  const token = await getAdminToken();
  
  // ── Test 1: Dashboard ──────────────────────────────────────────────────
  divider('TEST 1: Dashboard');
  try {
    const dash = await apiCall('GET', '/api/agent/dashboard', null, token);
    log('📊', `Stats: ${JSON.stringify(dash.stats)}`);
    log('⚡', `Agent enabled: ${dash.enabled}`);
    log('🏃', `Recent runs: ${dash.recentRuns?.length || 0}`);
  } catch (err) {
    log('❌', `Dashboard failed: ${err.message}`);
  }
  
  // ── Test 2: Config ─────────────────────────────────────────────────────
  divider('TEST 2: Config & Profile');
  try {
    const config = await apiCall('GET', '/api/agent/config', null, token);
    log('⚙️', `Config loaded: model=${config.model}, minScore=${config.minRelevanceScore}`);
    
    const profile = await apiCall('GET', '/api/agent/profile', null, token);
    log('👤', `Profile: ${profile.name} — ${profile.title}`);
  } catch (err) {
    log('❌', `Config/Profile failed: ${err.message}`);
  }
  
  // ── Test 3: Templates ──────────────────────────────────────────────────
  divider('TEST 3: Pitch Templates');
  try {
    const templates = await apiCall('GET', '/api/agent/templates', null, token);
    log('📝', `${templates.length} templates loaded:`);
    templates.forEach(t => console.log(`     • ${t.id}: ${t.name} (${t.category})`));
  } catch (err) {
    log('❌', `Templates failed: ${err.message}`);
  }
  
  // ── Test 4: Run Scan (this is the big one) ─────────────────────────────
  divider('TEST 4: Run PR Scan');
  log('🔍', 'Starting scan for podcast + press opportunities...');
  log('⏳', 'This will call OpenAI web search — expect ~30-60 seconds...');
  
  try {
    const scanResult = await apiCall('POST', '/api/agent/scan', {
      categories: ['podcast', 'press'],
      queriesPerCategory: 2,
      maxProspects: 10,
    }, token);
    
    log('✅', `Scan initiated: ${JSON.stringify(scanResult)}`);
    
    // Wait for scan to complete (it runs async on the server)
    log('⏳', 'Waiting for scan to finish (polling every 5s)...');
    let attempts = 0;
    let scanDone = false;
    
    while (attempts < 24 && !scanDone) { // Max 2 minutes
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
      
      try {
        const runs = await apiCall('GET', '/api/agent/runs?limit=1', null, token);
        if (Array.isArray(runs) && runs.length > 0) {
          const latest = runs[0];
          if (latest.status === 'completed') {
            log('✅', `Scan completed! Found ${latest.prospectsFound} prospects, drafted ${latest.pitchesDrafted} pitches`);
            if (latest.tokensUsed) log('💰', `Tokens used: ${latest.tokensUsed.toLocaleString()}`);
            scanDone = true;
          } else if (latest.status === 'failed') {
            log('❌', `Scan FAILED: ${latest.errorMessage}`);
            scanDone = true;
          } else {
            process.stdout.write(`   ... still running (${attempts * 5}s)\r`);
          }
        }
      } catch { /* retry */ }
    }
    
    if (!scanDone) {
      log('⚠️', 'Scan is still running after 2 minutes — continuing with tests...');
    }
  } catch (err) {
    log('❌', `Scan failed to start: ${err.message}`);
  }
  
  // ── Test 5: Check Prospects Found ──────────────────────────────────────
  divider('TEST 5: Review Discovered Prospects');
  
  let podcastProspects = [];
  let pressProspects = [];
  
  try {
    const podcasts = await apiCall('GET', '/api/agent/prospects?category=podcast&limit=20', null, token);
    podcastProspects = podcasts.prospects || [];
    log('🎙️', `PODCAST PROSPECTS (${podcasts.total} total):`);
    
    if (podcastProspects.length === 0) {
      log('⚠️', 'No podcast prospects found yet.');
    } else {
      podcastProspects.forEach((p, i) => {
        console.log(`\n   ${i + 1}. ${p.name}`);
        console.log(`      Score: ${p.relevanceScore || 'N/A'} | Status: ${p.status} | Contact: ${p.contactMethod}`);
        console.log(`      URL: ${p.url}`);
        if (p.contactEmail) console.log(`      Email: ${p.contactEmail}`);
        if (p.hostName) console.log(`      Host: ${p.hostName}`);
        if (p.topics?.length) console.log(`      Topics: ${p.topics.join(', ')}`);
      });
    }
  } catch (err) {
    log('❌', `Podcast prospects failed: ${err.message}`);
  }
  
  try {
    const press = await apiCall('GET', '/api/agent/prospects?category=press&limit=20', null, token);
    pressProspects = press.prospects || [];
    log('📰', `\nPRESS/MAGAZINE PROSPECTS (${press.total} total):`);
    
    if (pressProspects.length === 0) {
      log('⚠️', 'No press prospects found yet.');
    } else {
      pressProspects.forEach((p, i) => {
        console.log(`\n   ${i + 1}. ${p.name}`);
        console.log(`      Score: ${p.relevanceScore || 'N/A'} | Status: ${p.status} | Contact: ${p.contactMethod}`);
        console.log(`      URL: ${p.url}`);
        if (p.contactEmail) console.log(`      Email: ${p.contactEmail}`);
        if (p.publicationName) console.log(`      Publication: ${p.publicationName}`);
        if (p.topics?.length) console.log(`      Topics: ${p.topics.join(', ')}`);
      });
    }
  } catch (err) {
    log('❌', `Press prospects failed: ${err.message}`);
  }
  
  // ── Test 6: Draft Pitches ──────────────────────────────────────────────
  divider('TEST 6: Draft Pitches for Top Prospects');
  
  const allProspects = [...podcastProspects, ...pressProspects];
  const topProspects = allProspects
    .filter(p => p.status === 'new')
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, 3);
  
  if (topProspects.length === 0) {
    log('⚠️', 'No new prospects available for pitching. Skipping draft test.');
  } else {
    for (const prospect of topProspects) {
      log('📝', `Drafting pitch for: ${prospect.name} (score: ${prospect.relevanceScore})...`);
      
      try {
        const result = await apiCall('POST', `/api/agent/prospects/${prospect.id}/draft`, {}, token);
        log('✅', `Pitch drafted!`);
        console.log(`      Subject: ${result.subject}`);
        console.log(`      Template: ${result.templateUsed}`);
        console.log(`      Category: ${result.category}`);
        console.log(`\n      Preview (first 300 chars):`);
        console.log(`      ${result.body?.substring(0, 300)}...`);
      } catch (err) {
        log('❌', `Draft failed: ${err.message}`);
      }
    }
  }
  
  // ── Test 7: Check Pitches Queue ────────────────────────────────────────
  divider('TEST 7: Review Pitch Queue');
  
  try {
    const pitches = await apiCall('GET', '/api/agent/pitches?limit=10', null, token);
    const pitchList = Array.isArray(pitches) ? pitches : [];
    
    log('📬', `${pitchList.length} pitches in queue:`);
    
    pitchList.forEach(({ pitch, prospect }, i) => {
      console.log(`\n   ${i + 1}. [${pitch.status.toUpperCase()}] → ${prospect.name}`);
      console.log(`      Subject: ${pitch.subject}`);
      console.log(`      Type: ${pitch.pitchType} | Template: ${pitch.templateUsed || 'custom'}`);
      console.log(`      Category: ${pitch.category}`);
    });
  } catch (err) {
    log('❌', `Pitches list failed: ${err.message}`);
  }
  
  // ── Summary ────────────────────────────────────────────────────────────
  divider('SUMMARY');
  
  try {
    const finalDash = await apiCall('GET', '/api/agent/dashboard', null, token);
    const s = finalDash.stats;
    console.log(`
   📊 Final Stats:
   ────────────────────────────
   Total Prospects:    ${s.totalProspects}
     • Podcasts:       ${s.podcastProspects}
     • Press:          ${s.pressProspects}
   Pending Pitches:    ${s.pendingPitches}
   Sent Pitches:       ${s.sentPitches}
   Responses:          ${s.responses}
   Booked:             ${s.booked}
   ────────────────────────────
    `);
  } catch { /* best effort */ }
  
  log('🏁', 'Test complete!');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
