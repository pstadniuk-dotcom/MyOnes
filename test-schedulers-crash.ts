
import { startSmsReminderScheduler, checkAndSendReminders } from "./server/smsReminderScheduler";
import { startTokenRefreshScheduler } from "./server/tokenRefreshScheduler";
import { startWearableDataScheduler } from "./server/wearableDataScheduler";

async function test() {
  console.log("Testing schedulers...");
  try {
    // Test the logic directly
    console.log("Running checkAndSendReminders directly...");
    await checkAndSendReminders();
    console.log("checkAndSendReminders finished.");

    startSmsReminderScheduler();
    startTokenRefreshScheduler();
    startWearableDataScheduler();
    console.log("Schedulers started.");
    
    // Keep alive for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log("Done.");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

test();
