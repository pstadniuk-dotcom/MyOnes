
import { storage } from "./server/storage";

async function test() {
  console.log("Testing storage...");
  try {
    const users = await storage.listAllUsers();
    console.log("Users:", users.length);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

test();
