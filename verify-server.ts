import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkEndpoint(path: string, expectedStatus: number | number[]): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const status = res.status;
    const isExpected = Array.isArray(expectedStatus) 
      ? expectedStatus.includes(status) 
      : status === expectedStatus;

    if (isExpected) {
      log(`[PASS] ${path} returned ${status}`, colors.green);
      return true;
    } else {
      log(`[FAIL] ${path} returned ${status} (Expected: ${expectedStatus})`, colors.red);
      return false;
    }
  } catch (e: any) {
    log(`[FAIL] ${path} - ${e.message}`, colors.red);
    return false;
  }
}

async function checkFrontendBuild() {
  const distPath = path.join(__dirname, 'dist', 'public', 'index.html');
  if (fs.existsSync(distPath)) {
    log(`[PASS] Frontend build found at dist/public/index.html`, colors.green);
    return true;
  } else {
    log(`[FAIL] Frontend build NOT found. Run 'npm run build' first.`, colors.red);
    return false;
  }
}

async function run() {
  log("Starting System Verification...", colors.cyan);
  
  // 1. Check Frontend Build
  const buildOk = await checkFrontendBuild();
  
  // 2. Check Server Connectivity
  log(`\nChecking Server at ${BASE_URL}...`, colors.cyan);
  
  // Health Check
  const healthOk = await checkEndpoint('/api/health', 200);
  
  // Auth Check
  const authOk = await checkEndpoint('/api/auth/me', [200, 401]);
  
  // Frontend Serve Check
  const frontendOk = await checkEndpoint('/', [200, 304]);

  log("\nSummary:", colors.cyan);
  if (buildOk && healthOk && authOk && frontendOk) {
    log("✅ ALL CHECKS PASSED. The system appears to be healthy.", colors.green);
    process.exit(0);
  } else {
    log("❌ SOME CHECKS FAILED. Please investigate.", colors.red);
    if (!healthOk || !authOk || !frontendOk) {
        log("Tip: Ensure the server is running (npm start or npm run dev).", colors.yellow);
    }
    process.exit(1);
  }
}

run();
