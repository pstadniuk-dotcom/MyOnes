import cron from 'node-cron';
import { storage } from './storage';
import { refreshExpiredTokens } from './wearableTokenRefresh';

export function startTokenRefreshScheduler() {
  console.log('🔄 Starting wearable token refresh scheduler...');
  
  // Run immediate check on startup to avoid blind spot after restart
  (async () => {
    console.log('⚡ Running immediate token refresh check on startup...');
    try {
      await refreshExpiredTokens(storage);
      console.log('✅ Startup token refresh check completed successfully');
    } catch (error) {
      console.error('❌ Error during startup token refresh:', error);
    }
  })();
  
  // Run token refresh check every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running scheduled wearable token refresh check...');
    try {
      await refreshExpiredTokens(storage);
      console.log('✅ Token refresh check completed successfully');
    } catch (error) {
      console.error('❌ Error during scheduled token refresh:', error);
    }
  });
  
  console.log('✅ Wearable token refresh scheduler started - immediate run + hourly checks');
}
