import Redis, { type RedisOptions } from "ioredis";
import { Cache } from "drizzle-orm/cache/core";
import { entityKind, is } from "drizzle-orm/entity";
import { Table, getTableName } from "drizzle-orm";
import type { CacheConfig } from "drizzle-orm/cache/core/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableReference = Table<any>;

type MutationOption = {
  tags?: string | string[];
  tables?: TableReference | TableReference[] | string | string[];
};

// Lua script to get cache value by tag
const getByTagScript = `
local tagsMapKey = KEYS[1] -- tags map key
local tag        = ARGV[1] -- tag

local compositeTableName = redis.call('HGET', tagsMapKey, tag)
if not compositeTableName then
  return nil
end

local value = redis.call('HGET', compositeTableName, tag)
return value
`;

// Lua script to handle cache invalidation on mutations
const onMutateScript = `
local tagsMapKey = KEYS[1] -- tags map key
local tables     = {}      -- initialize tables array
local tags       = ARGV    -- tags array

for i = 2, #KEYS do
  tables[#tables + 1] = KEYS[i] -- add all keys except the first one to tables
end

if #tags > 0 then
  for _, tag in ipairs(tags) do
    if tag ~= nil and tag ~= '' then
      local compositeTableName = redis.call('HGET', tagsMapKey, tag)
      if compositeTableName then
        redis.call('HDEL', compositeTableName, tag)
      end
    end
  end
  redis.call('HDEL', tagsMapKey, unpack(tags))
end

local keysToDelete = {}

if #tables > 0 then
  local compositeTableNames = redis.call('SUNION', unpack(tables))
  for _, compositeTableName in ipairs(compositeTableNames) do
    keysToDelete[#keysToDelete + 1] = compositeTableName
  end
  for _, table in ipairs(tables) do
    keysToDelete[#keysToDelete + 1] = table
  end
  if #keysToDelete > 0 then
    redis.call('DEL', unpack(keysToDelete))
  end
end
`;

type InternalConfig = {
  seconds: number;
  hexOptions?: "NX" | "nx" | "XX" | "xx" | "GT" | "gt" | "LT" | "lt";
};

export type LocalRedisCacheOptions = {
  /** Redis connection URL (e.g., redis://localhost:6379) */
  url?: string;
  /** Redis host (default: localhost) */
  host?: string;
  /** Redis port (default: 6379) */
  port?: number;
  /** Redis password (optional) */
  password?: string;
  /** Redis database number (default: 0) */
  db?: number;
  /** Default cache configuration */
  config?: CacheConfig;
  /** Enable caching for all queries by default */
  global?: boolean;
};

/**
 * Custom Redis cache adapter for Drizzle ORM
 * Compatible with local Redis server (drop-in replacement for upstashCache)
 */
export class LocalRedisCache extends Cache {
  static readonly [entityKind] = "LocalRedisCache";

  private static compositeTableSetPrefix = "__CTS__";
  private static compositeTablePrefix = "__CT__";
  private static tagsMapKey = "__tagsMap__";
  private static nonAutoInvalidateTablePrefix = "__nonAutoInvalidate__";

  private redis: Redis;
  private useGlobally: boolean;
  private internalConfig: InternalConfig;

  constructor(redis: Redis, config?: CacheConfig, useGlobally = false) {
    super();
    this.redis = redis;
    this.useGlobally = useGlobally;
    this.internalConfig = this.toInternalConfig(config);

    // Define Lua scripts
    this.redis.defineCommand("getByTag", {
      numberOfKeys: 1,
      lua: getByTagScript,
    });

    this.redis.defineCommand("onMutate", {
      lua: onMutateScript,
    });
  }

  strategy(): "all" | "explicit" {
    return this.useGlobally ? "all" : "explicit";
  }

  private toInternalConfig(config?: CacheConfig): InternalConfig {
    return config
      ? {
          seconds: config.ex ?? 1,
          hexOptions: config.hexOptions,
        }
      : { seconds: 1 };
  }

  async get(
    key: string,
    tables: string[],
    isTag = false,
    isAutoInvalidate?: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[] | undefined> {
    if (!isAutoInvalidate) {
      const result = await this.redis.hget(
        LocalRedisCache.nonAutoInvalidateTablePrefix,
        key,
      );
      if (result === null) return undefined;
      return this.parseValue(result);
    }

    if (isTag) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.redis as any).getByTag(
        LocalRedisCache.tagsMapKey,
        key,
      );
      if (result === null) return undefined;
      return this.parseValue(result);
    }

    const compositeKey = this.getCompositeKey(tables);
    const result = await this.redis.hget(compositeKey, key);
    if (result === null) return undefined;
    return this.parseValue(result);
  }

  async put(
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any,
    tables: string[],
    isTag = false,
    config?: CacheConfig,
  ): Promise<void> {
    const isAutoInvalidate = tables.length !== 0;
    const pipeline = this.redis.pipeline();
    const ttlSeconds =
      config && config.ex ? config.ex : this.internalConfig.seconds;

    const serializedResponse = this.serializeValue(response);

    if (!isAutoInvalidate) {
      if (isTag) {
        pipeline.hset(LocalRedisCache.tagsMapKey, {
          [key]: LocalRedisCache.nonAutoInvalidateTablePrefix,
        });
        // Use HEXPIRE if available (Redis 7.4+), otherwise set key-level expiry
        this.setHashFieldExpiry(
          pipeline,
          LocalRedisCache.tagsMapKey,
          key,
          ttlSeconds,
        );
      }
      pipeline.hset(LocalRedisCache.nonAutoInvalidateTablePrefix, {
        [key]: serializedResponse,
      });
      this.setHashFieldExpiry(
        pipeline,
        LocalRedisCache.nonAutoInvalidateTablePrefix,
        key,
        ttlSeconds,
      );
      await pipeline.exec();
      return;
    }

    const compositeKey = this.getCompositeKey(tables);
    pipeline.hset(compositeKey, { [key]: serializedResponse });
    this.setHashFieldExpiry(pipeline, compositeKey, key, ttlSeconds);

    if (isTag) {
      pipeline.hset(LocalRedisCache.tagsMapKey, { [key]: compositeKey });
      this.setHashFieldExpiry(
        pipeline,
        LocalRedisCache.tagsMapKey,
        key,
        ttlSeconds,
      );
    }

    for (const table of tables) {
      pipeline.sadd(this.addTablePrefix(table), compositeKey);
    }

    await pipeline.exec();
  }

  async onMutate(params: MutationOption): Promise<void> {
    const tags = Array.isArray(params.tags)
      ? params.tags
      : params.tags
        ? [params.tags]
        : [];

    const tables = Array.isArray(params.tables)
      ? params.tables
      : params.tables
        ? [params.tables]
        : [];

    const tableNames = tables.map((table) =>
      is(table, Table) ? getTableName(table as Table) : (table as string),
    );

    const compositeTableSets = tableNames.map((table: string) =>
      this.addTablePrefix(table),
    );

    // Execute the Lua script for cache invalidation
    if (compositeTableSets.length > 0 || tags.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.redis as any).onMutate(
        compositeTableSets.length + 1,
        LocalRedisCache.tagsMapKey,
        ...compositeTableSets,
        ...tags,
      );
    }
  }

  private addTablePrefix(table: string): string {
    return `${LocalRedisCache.compositeTableSetPrefix}${table}`;
  }

  private getCompositeKey(tables: string[]): string {
    return `${LocalRedisCache.compositeTablePrefix}${tables.sort().join(",")}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseValue(value: string | null): any[] | undefined {
    if (value === null) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  /**
   * Set expiry on hash field using HEXPIRE (Redis 7.4+) or fall back to key-level EXPIRE
   */
  private setHashFieldExpiry(
    pipeline: ReturnType<Redis["pipeline"]>,
    hashKey: string,
    _field: string,
    ttlSeconds: number,
  ): void {
    // HEXPIRE is only available in Redis 7.4+
    // For compatibility, we'll use EXPIRE on the entire hash key
    // This is less granular but works with older Redis versions
    pipeline.expire(hashKey, ttlSeconds);
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Create a local Redis cache adapter for Drizzle ORM
 *
 * @example
 * ```ts
 * import { drizzle } from 'drizzle-orm/postgres-js';
 * import { localRedisCache } from '@/lib/redis-cache';
 *
 * export const db = drizzle(client, {
 *   schema,
 *   cache: localRedisCache({
 *     url: 'redis://localhost:6379',
 *     // OR use individual options:
 *     // host: 'localhost',
 *     // port: 6379,
 *     // password: 'your-password',
 *     // db: 0,
 *     global: true,
 *     config: { ex: 60 }, // 60 second TTL
 *   }),
 * });
 * ```
 */
export function localRedisCache({
  url,
  host = "localhost",
  port = 6379,
  password,
  db = 0,
  config,
  global: useGlobally = false,
}: LocalRedisCacheOptions): LocalRedisCache {
  const redisOptions: RedisOptions = {
    host,
    port,
    password,
    db,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  };

  // If URL is provided, use it instead of individual options
  const redis = url ? new Redis(url) : new Redis(redisOptions);

  return new LocalRedisCache(redis, config, useGlobally);
}

// Re-export for convenience
export type { CacheConfig } from "drizzle-orm/cache/core/types";
