import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";

const candidates = ["server/.env.local", "server/.env"];
let loadedFromFile = false;
for (const candidate of candidates) {
	const envPath = path.resolve(process.cwd(), candidate);
	console.log(`Checking env path: ${envPath}`);
	if (fs.existsSync(envPath)) {
		console.log(`Loading env from: ${envPath}`);
		loadEnv({ path: envPath, override: true });
		loadedFromFile = true;
		break;
	}
}

if (!loadedFromFile && process.env.NODE_ENV !== "production") {
	console.warn("No local env file found. Relying on host environment variables.");
}

// Fail fast if any required env vars are missing — prevents silent runtime failures
const REQUIRED_ENV_VARS = [
	"DATABASE_URL",
	"JWT_SECRET",
	"FIELD_ENCRYPTION_KEY",
	"SESSION_SECRET",
];

// Additional vars required in production to prevent silent misconfiguration
const PROD_REQUIRED_ENV_VARS = [
	"FRONTEND_URL",
	"STRIPE_SECRET_KEY",
];

if (process.env.NODE_ENV === "production") {
	REQUIRED_ENV_VARS.push(...PROD_REQUIRED_ENV_VARS);
}

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
	console.error(`FATAL: Missing required environment variables: ${missing.join(", ")}`);
	process.exit(1);
}
