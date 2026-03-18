/**
 * Store Gmail OAuth credentials in app_settings and enable Gmail for PR Agent.
 * Reads from GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in .env
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync('server/.env', 'utf-8');
function getEnv(key) {
  const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

const dbUrl = getEnv('DATABASE_URL');
const clientId = getEnv('GMAIL_CLIENT_ID');
const clientSecret = getEnv('GMAIL_CLIENT_SECRET');
const refreshToken = getEnv('GMAIL_REFRESH_TOKEN');

if (!clientId || !clientSecret || !refreshToken) {
  console.error('Missing one or more GMAIL_* env vars in server/.env');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

// 1. Store Gmail OAuth config
const gmailConfig = JSON.stringify({ clientId, clientSecret, refreshToken });
await client.query(`
  INSERT INTO app_settings (key, value) VALUES ('gmail_oauth_config', $1)
  ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()
`, [gmailConfig]);
console.log('✓ Gmail OAuth credentials stored in app_settings');

// 2. Enable Gmail in PR Agent config
const existing = await client.query(`SELECT value FROM app_settings WHERE key = 'pr_agent_config'`);
if (existing.rows.length > 0) {
  const config = typeof existing.rows[0].value === 'string' 
    ? JSON.parse(existing.rows[0].value) 
    : existing.rows[0].value;
  config.gmailEnabled = true;
  config.gmailFrom = 'pete@ones.health';
  await client.query(`UPDATE app_settings SET value = $1, updated_at = now() WHERE key = 'pr_agent_config'`, [JSON.stringify(config)]);
  console.log('✓ PR Agent config updated: gmailEnabled=true, gmailFrom=pete@ones.health');
} else {
  const defaultConfig = { gmailEnabled: true, gmailFrom: 'pete@ones.health' };
  await client.query(`INSERT INTO app_settings (key, value) VALUES ('pr_agent_config', $1)`, [JSON.stringify(defaultConfig)]);
  console.log('✓ PR Agent config created: gmailEnabled=true, gmailFrom=pete@ones.health');
}

// 3. Verify
const verify = await client.query(`SELECT key, substring(value::text, 1, 50) as preview FROM app_settings WHERE key IN ('gmail_oauth_config', 'pr_agent_config')`);
console.log('\n--- Stored configs ---');
verify.rows.forEach(r => console.log(`  ${r.key}: ${r.preview}...`));

await client.end();
console.log('\n✓ Gmail setup complete. PR Agent will now send pitches from pete@ones.health');
