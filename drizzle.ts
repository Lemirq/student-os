import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import {
  SUPABASE_DB_URL,
  NODE_ENV,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
} from "@/lib/env";
import { upstashCache } from "drizzle-orm/cache/upstash";

// Disable prefetch as it is not supported for "Transaction" pool mode
const client =
  globalThis.postgresClient || postgres(SUPABASE_DB_URL, { prepare: false });

if (NODE_ENV !== "production") {
  globalThis.postgresClient = client;
}

export const db = drizzle(client, {
  schema,
  cache: upstashCache({
    // 👇 Upstash Redis connection
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
    // 👇 Enable caching for all queries by default
    global: true,
    // 👇 Default cache behavior (60 second TTL)
    config: { ex: 60 },
  }),
});

declare global {
  var postgresClient: ReturnType<typeof postgres> | undefined;
}
