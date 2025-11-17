import path from "path";
import { config as loadEnv } from "dotenv";

const envPath = path.resolve(process.cwd(), "server/.env");
loadEnv({ path: envPath, override: true });
