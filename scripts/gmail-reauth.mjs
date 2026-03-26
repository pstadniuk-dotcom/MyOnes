/**
 * Gmail OAuth Re-Authorization
 * 
 * Opens a browser for Google consent, captures the auth code via a local server,
 * exchanges it for a new refresh token, and updates both .env and the database.
 *
 * Usage: node scripts/gmail-reauth.mjs
 */
import { google } from 'googleapis';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import pg from 'pg';
import { resolve } from 'path';

// Load env
const envPath = resolve(import.meta.dirname, '../server/.env');
const envContent = readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : '';
};

const CLIENT_ID = getEnv('GMAIL_CLIENT_ID');
const CLIENT_SECRET = getEnv('GMAIL_CLIENT_SECRET');
const DB_URL = getEnv('DATABASE_URL');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in server/.env');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:5000/';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
});

console.log('\n🔐 Gmail OAuth Re-Authorization\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in with pete@ones.health and grant access.');
console.log('3. After authorizing, you\'ll be redirected to localhost:5000.');
console.log('   The page may show your app or an error — that\'s fine.');
console.log('4. Copy the "code" value from the URL bar.');
console.log('   It looks like: http://localhost:5000/?code=4/0AXXXXXXXXX&scope=...');
console.log('   Copy everything between "code=" and "&scope"\n');

// Open browser
try {
  execSync(`start "" "${authUrl}"`, { stdio: 'ignore' });
} catch {
  // ignore
}

// Read code from stdin
import readline from 'readline';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const code = await new Promise(resolve => {
  rl.question('Paste the code here: ', answer => {
    rl.close();
    resolve(answer.trim());
  });
});

if (!code) {
  console.error('No code provided.');
  process.exit(1);
}

try {
  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    console.error('\n✗ No refresh token received.');
    console.error('  Go to https://myaccount.google.com/permissions, remove this app, and try again.');
    process.exit(1);
  }

  console.log('\n✓ Got new refresh token!');

  // 1. Update .env file
  const currentEnv = readFileSync(envPath, 'utf-8');
  const updatedEnv = currentEnv.replace(
    /^GMAIL_REFRESH_TOKEN=.+$/m,
    `GMAIL_REFRESH_TOKEN=${refreshToken}`
  );
  writeFileSync(envPath, updatedEnv, 'utf-8');
  console.log('✓ Updated server/.env');

  // 2. Update database (app_settings)
  if (DB_URL) {
    try {
      const client = new pg.Client({ connectionString: DB_URL });
      await client.connect();
      
      const result = await client.query(`SELECT value FROM app_settings WHERE key = 'gmail_oauth_config'`);
      const updated = {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: refreshToken,
        encrypted: false,
      };
      
      if (result.rows.length > 0) {
        await client.query(
          `UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = 'gmail_oauth_config'`,
          [JSON.stringify(updated)]
        );
      } else {
        await client.query(
          `INSERT INTO app_settings (key, value, updated_at) VALUES ('gmail_oauth_config', $1, NOW())`,
          [JSON.stringify(updated)]
        );
      }
      console.log('✓ Updated database (app_settings)');
      await client.end();
    } catch (dbErr) {
      console.warn(`⚠ Database update failed: ${dbErr.message}`);
      console.log('  The .env was updated — restart the server to pick it up.');
    }
  }

  // 3. Verify the new token works
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  console.log(`✓ Verified — connected mailbox: ${profile.data.emailAddress}`);
  console.log('\n🎉 Done! Restart the server to start sending via Gmail.\n');
} catch (err) {
  console.error(`\n✗ Token exchange failed: ${err.message}`);
  if (err.message.includes('invalid_grant')) {
    console.error('  The code may have expired. Run the script again and paste the code quickly.');
  }
  process.exit(1);
}
