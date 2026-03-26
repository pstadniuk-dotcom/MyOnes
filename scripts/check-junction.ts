import { config } from 'dotenv';
config({ path: 'server/.env', override: true });

import { getConnectedProviders, getSleepData, getActivityData, getBodyData } from '../server/junction';

const JUNCTION_USER_ID = '49a2aedf-6409-4b77-b999-343ba94ba22f';

async function main() {
  try {
    console.log('=== Checking Junction for user:', JUNCTION_USER_ID, '===\n');

    const providers = await getConnectedProviders(JUNCTION_USER_ID);
    console.log('Connected Providers:', JSON.stringify(providers, null, 2));
    console.log('\nProvider count:', providers.length);

    if (providers.length > 0) {
      for (const p of providers) {
        console.log(`\n  Provider: ${p?.slug || p?.name || 'unknown'}`);
        console.log(`    status: ${p?.status}`);
        console.log(`    connected: ${p?.connected}`);
        console.log(`    isConnected: ${p?.isConnected}`);
        console.log(`    connectedAt: ${p?.connectedAt}`);
        console.log(`    lastSyncAt: ${p?.lastSyncAt}`);
      }
    }

    // Check last 7 days of data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log(`\n=== Checking data ${startDate} to ${endDate} ===\n`);

    const [sleep, activity, body] = await Promise.all([
      getSleepData(JUNCTION_USER_ID, startDate, endDate).catch(e => { console.error('Sleep error:', e.message); return []; }),
      getActivityData(JUNCTION_USER_ID, startDate, endDate).catch(e => { console.error('Activity error:', e.message); return []; }),
      getBodyData(JUNCTION_USER_ID, startDate, endDate).catch(e => { console.error('Body error:', e.message); return []; }),
    ]);

    console.log('Sleep records:', sleep.length);
    console.log('Activity records:', activity.length);
    console.log('Body records:', body.length);

    if (sleep.length > 0) console.log('Latest sleep:', JSON.stringify(sleep[0], null, 2).substring(0, 300));
    if (activity.length > 0) console.log('Latest activity:', JSON.stringify(activity[0], null, 2).substring(0, 300));
  } catch (e: any) {
    console.error('Fatal error:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

main();
