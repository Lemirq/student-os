// Public env vars - must access process.env directly for Next.js inlining
export const NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "";

export const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
export const tavilyApiKey = process.env.TAVILY_API_KEY ?? "";
export const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
export const UPSTASH_REDIS_REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

// Local Redis configuration
export const REDIS_URL = process.env.REDIS_URL ?? "";
export const REDIS_HOST = process.env.REDIS_HOST ?? "localhost";
export const REDIS_PORT = parseInt(process.env.REDIS_PORT ?? "6379", 10);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? "";
export const REDIS_DB = parseInt(process.env.REDIS_DB ?? "0", 10);

// Server-only env vars - validated lazily when accessed
export function getServerEnv() {
  const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
  if (!SUPABASE_DB_URL) {
    throw new Error("Missing required environment variable: SUPABASE_DB_URL");
  }
  return { SUPABASE_DB_URL };
}

// For direct import on server-side only
export const SUPABASE_DB_URL =
  typeof window === "undefined" ? (process.env.SUPABASE_DB_URL ?? "") : "";

export const NODE_ENV = process.env.NODE_ENV ?? "development";

// Cron job secret for secure API access
export const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Validation helper - call this in server components/API routes
export function validateEnv() {
  const missing: string[] = [];

  if (!NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
  if (typeof window === "undefined" && !process.env.SUPABASE_DB_URL)
    missing.push("SUPABASE_DB_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
