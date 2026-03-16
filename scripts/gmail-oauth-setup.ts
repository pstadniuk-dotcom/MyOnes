/**
 * Gmail OAuth Setup — Get a refresh token for the PR Agent email sender.
 *
 * Usage:
 *   npx tsx scripts/gmail-oauth-setup.ts <CLIENT_ID> <CLIENT_SECRET>
 *
 * It will:
 *  1. Open a browser for you to sign in with pete@ones.health
 *  2. Listen on localhost:3456 for the callback
 *  3. Exchange the code for tokens
 *  4. Print your Refresh Token
 */
import { google } from 'googleapis';
import http from 'http';
import { exec } from 'child_process';

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Usage: npx tsx scripts/gmail-oauth-setup.ts <CLIENT_ID> <CLIENT_SECRET>\n');
  console.error('Get these from https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3456/callback';
const SCOPES = ['https://mail.google.com/'];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // force refresh token
});

// Start a tiny local server to catch the callback
const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const url = new URL(req.url, `http://localhost:3456`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h2>Auth failed: ${error}</h2><p>Close this tab and try again.</p>`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h2>No code received</h2>');
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h2 style="color: green;">✅ Gmail OAuth setup complete!</h2>
      <p>You can close this tab. Check the terminal for your credentials.</p>
    `);

    console.log('\n' + '═'.repeat(60));
    console.log('  ✅ Gmail OAuth Setup Complete!');
    console.log('═'.repeat(60));
    console.log();
    console.log('  Paste these into Admin → PR Agent → Settings → Gmail OAuth:');
    console.log();
    console.log(`  Client ID:     ${CLIENT_ID}`);
    console.log(`  Client Secret: ${CLIENT_SECRET}`);
    console.log(`  Refresh Token: ${tokens.refresh_token}`);
    console.log();
    console.log('═'.repeat(60) + '\n');

  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h2>Token exchange failed</h2><pre>${err.message}</pre>`);
    console.error('Token exchange failed:', err.message);
  }

  server.close();
  process.exit(0);
});

server.listen(3456, () => {
  console.log('\n🔐 Gmail OAuth Setup');
  console.log('━'.repeat(40));
  console.log('Opening browser for sign-in...');
  console.log('Sign in with: pete@ones.health');
  console.log('');
  console.log('If the browser doesn\'t open, go to:');
  console.log(authUrl);
  console.log('');

  // Try to open browser (Windows)
  exec(`start "" "${authUrl}"`);
});
