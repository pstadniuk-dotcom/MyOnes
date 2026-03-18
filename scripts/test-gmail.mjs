/**
 * Test Gmail OAuth sender — sends a test email via the PR Agent's Gmail integration
 */
import { google } from 'googleapis';
import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync('server/.env', 'utf-8');
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

// Load Gmail OAuth config from app_settings
const result = await client.query(`SELECT value FROM app_settings WHERE key = 'gmail_oauth_config'`);
if (!result.rows.length) { console.error('No gmail_oauth_config found'); process.exit(1); }

const config = typeof result.rows[0].value === 'string' 
  ? JSON.parse(result.rows[0].value) 
  : result.rows[0].value;

await client.end();

const { clientId, clientSecret, refreshToken } = config;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
oauth2Client.setCredentials({ refresh_token: refreshToken });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function buildRawEmail(to, subject, body) {
  const lines = [
    `From: Pete Stadniuk <pete@ones.health>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    body,
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

const htmlBody = `
<div style="font-family:sans-serif;max-width:500px;margin:40px auto;padding:30px;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <h1 style="color:#004700;margin:0 0 16px">ONES</h1>
  <p style="color:#374151;font-size:15px;line-height:1.7">
    This is a test email sent via <strong>Gmail OAuth</strong> from the ONES PR Agent.<br><br>
    Sent from: <strong>pete@ones.health</strong><br>
    If you received this, the Gmail integration is working correctly.
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px">ONES AI &bull; Personalized Supplements &bull; PR Agent Test</p>
</div>
`;

const recipients = process.argv.slice(2);
if (!recipients.length) {
  console.error('Usage: node test-gmail.mjs email1 email2 ...');
  process.exit(1);
}

for (const to of recipients) {
  try {
    const raw = buildRawEmail(to, 'ONES PR Agent - Gmail Test', htmlBody);
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
    console.log(`✓ Sent to ${to} (messageId: ${res.data.id})`);
  } catch (err) {
    console.error(`✗ Failed to send to ${to}: ${err.message}`);
    if (err.response?.data) console.error('  Details:', JSON.stringify(err.response.data));
  }
}

console.log('\nDone.');
