import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";

const candidates = ["server/.env.local", "server/.env"];
let loadedFromFile = false;
for (const candidate of candidates) {
	const envPath = path.resolve(process.cwd(), candidate);
	if (fs.existsSync(envPath)) {
		loadEnv({ path: envPath, override: true });
		loadedFromFile = true;
		break;
	}
}

if (!loadedFromFile && process.env.NODE_ENV !== "production") {
	console.warn("No local env file found. Relying on host environment variables.");
}
