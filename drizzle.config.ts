import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local file
config({ path: ".env.local" });

export default defineConfig({
  out: "./drizzle",
  schema: "./schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL!,
  },
});
