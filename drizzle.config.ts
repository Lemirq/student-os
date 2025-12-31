import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local file before importing env
config({ path: ".env.local" });

// Dynamic import to ensure dotenv loads first
const getDbUrl = () => {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error("Missing required environment variable: SUPABASE_DB_URL");
  }
  return url;
};

export default defineConfig({
  out: "./drizzle",
  schema: "./schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: getDbUrl(),
  },
});
