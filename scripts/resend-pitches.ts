/**
 * Re-send all approved pitches from pete@ones.health
 * Run: npx tsx scripts/resend-pitches.ts
 */
import 'dotenv/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env from server directory
config({ path: resolve(import.meta.dirname, '../server/.env') });

const { sendApprovedPitches } = await import('../server/modules/agent/engines/gmail-sender');

console.log('Sending all approved pitches from pete@ones.health...\n');
const result = await sendApprovedPitches();
console.log(`\nDone! Sent: ${result.sent}, Failed: ${result.failed}`);
if (result.errors.length > 0) {
  console.log('Errors:');
  result.errors.forEach(e => console.log(`  - ${e}`));
}
process.exit(0);
