import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Load .env.local file
// config({ path: ".env.local" }); // Removed dotenv config as it's not needed in Next.js environment usually

const connectionString = process.env.SUPABASE_DB_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
