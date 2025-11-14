import { storage as storageInstance } from './storage';
import { syncAllOuraConnections } from './wearableDataSync';
import type { IStorage } from './storage';

const storage = storageInstance as IStorage;

/**
 * Schedule automatic wearable data syncing
 * Runs daily at 6am to fetch yesterday's data
 */
export function startWearableDataScheduler() {
  console.log('🔄 Starting wearable data sync scheduler...');

  // Run immediately on startup
  // Try an immediate startup sync, but guard against partially-initialized
  // storage (possible with circular imports). If the method isn't present
  // yet, schedule a delayed initial attempt so the server can finish
  // initializing without crashing.
  const tryInitialSync = async () => {
    if (typeof (storage as any).getAllWearableConnections === 'function') {
      try {
        await syncAllOuraConnections(storage);
      } catch (error) {
        console.error('Error in initial wearable sync:', error);
      }
    } else {
      console.warn('storage.getAllWearableConnections not available on startup; will retry in 30s');
      setTimeout(async () => {
        if (typeof (storage as any).getAllWearableConnections === 'function') {
          try {
            await syncAllOuraConnections(storage);
          } catch (error) {
            console.error('Error in delayed initial wearable sync:', error);
          }
        } else {
          console.error('storage.getAllWearableConnections still not available after delay; skipping initial sync');
        }
      }, 30_000);
    }
  };

  void tryInitialSync();

  // Then run daily at 6am
  const SYNC_HOUR = 6; // 6am
  const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Calculate time until next 6am
  function getTimeUntilNextSync() {
    const now = new Date();
    const next = new Date();
    next.setHours(SYNC_HOUR, 0, 0, 0);

    // If it's past 6am today, schedule for tomorrow
    if (now.getHours() >= SYNC_HOUR) {
      next.setDate(next.getDate() + 1);
    }

    return next.getTime() - now.getTime();
  }

  // Schedule first sync at 6am
  const timeUntilFirst = getTimeUntilNextSync();
  console.log(`⏰ Next wearable sync in ${Math.round(timeUntilFirst / 1000 / 60)} minutes`);

  setTimeout(() => {
    console.log('⏰ Running scheduled wearable sync at 6am...');
    syncAllOuraConnections(storage).catch(error => {
      console.error('Error in scheduled wearable sync:', error);
    });

    // Then repeat every 24 hours
    setInterval(() => {
      console.log('⏰ Running daily wearable sync...');
      syncAllOuraConnections(storage).catch(error => {
        console.error('Error in daily wearable sync:', error);
      });
    }, SYNC_INTERVAL);

  }, timeUntilFirst);

  console.log('✅ Wearable data sync scheduler started');
}
