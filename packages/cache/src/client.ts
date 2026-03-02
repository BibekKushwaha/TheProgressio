import { Redis } from '@upstash/redis';
import { Redis as IORedis } from 'ioredis';

type UpstashRedis = Redis;

export type MinimalRedisClient = {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, opts?: { ex?: number }): Promise<void>;
  del(key: string): Promise<number>;
  incr?(key: string): Promise<number>;
  expire?(key: string, seconds: number): Promise<void>;
  ttl?(key: string): Promise<number>;
};

type RedisClient = UpstashRedis | MinimalRedisClient;

declare global {
  var __repoCacheRedisClient: RedisClient | undefined;
}

function readUpstashEnv(): { url?: string; token?: string } {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

function readStandardRedisEnv(): { host?: string; port?: number; password?: string } {
  const host = process.env.REDIS_HOST;
  const rawPort = process.env.REDIS_PORT;
  const password = process.env.REDIS_PASSWORD;
  return {
    host,
    port: rawPort ? parseInt(rawPort, 10) : undefined,
    password,
  };
}

/**
 * Wrap a native ioredis `Redis` instance in the `MinimalRedisClient` interface.
 * All operations that hit Redis are wrapped in try/catch so a temporary Redis
 * outage results in a cache miss rather than a 500 error.
 */
function createIORedisAdapter(ioredis: IORedis): MinimalRedisClient {
  return {
    async get<T = any>(key: string): Promise<T | null> {
      try {
        const raw = await ioredis.get(key);
        if (raw === null || raw === undefined) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      } catch {
        return null;
      }
    },

    async set(key: string, value: any, opts?: { ex?: number }): Promise<void> {
      try {
        const raw = typeof value === 'string' ? value : JSON.stringify(value);
        if (opts?.ex && opts.ex > 0) {
          await ioredis.setex(key, opts.ex, raw);
        } else {
          await ioredis.set(key, raw);
        }
      } catch {
        // Cache write failures are non-fatal — the next read will be a cache miss.
      }
    },

    async del(key: string): Promise<number> {
      try {
        return await ioredis.del(key);
      } catch {
        return 0;
      }
    },

    async incr(key: string): Promise<number> {
      try {
        return await ioredis.incr(key);
      } catch {
        return 0;
      }
    },

    async expire(key: string, seconds: number): Promise<void> {
      try {
        await ioredis.expire(key, seconds);
      } catch {
        // Non-fatal
      }
    },

    async ttl(key: string): Promise<number> {
      try {
        return await ioredis.ttl(key);
      } catch {
        return -1;
      }
    },
  };
}

function createInMemoryClient(): MinimalRedisClient {
  const store = new Map<string, string>();
  return {
    async get<T = any>(key: string) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return (raw as unknown) as T;
      }
    },
    async set(key: string, value: any, opts?: { ex?: number }) {
      const raw = typeof value === 'string' ? value : JSON.stringify(value);
      store.set(key, raw);
      if (opts?.ex && opts.ex > 0) {
        setTimeout(() => store.delete(key), opts.ex * 1000);
      }
    },
    async del(key: string) {
      const had = store.delete(key);
      return had ? 1 : 0;
    },
    async incr(key: string) {
      const raw = store.get(key);
      let n = 0;
      if (raw !== undefined) {
        try {
          n = parseInt(JSON.parse(raw), 10);
          if (Number.isNaN(n)) n = parseInt(raw as string, 10) || 0;
        } catch {
          n = parseInt(raw as string, 10) || 0;
        }
      }
      n += 1;
      store.set(key, JSON.stringify(n));
      return n;
    },
    async expire(key: string, seconds: number) {
      if (seconds <= 0) return;
      setTimeout(() => store.delete(key), seconds * 1000);
    },
    async ttl(_key: string) {
      // In-memory store does not track TTL precisely; return -1 when not set
      return -1;
    },
  };
}

/**
 * Returns the shared Redis client singleton for the current process.
 *
 * Resolution order:
 *  1. Upstash HTTP REST  — when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set
 *  2. Standard ioredis   — when REDIS_HOST is set (uses REDIS_HOST / REDIS_PORT / REDIS_PASSWORD)
 *  3. In-memory fallback — for local dev / tests when no Redis is available
 */
export function getRedisClient(): RedisClient {
  if (globalThis.__repoCacheRedisClient) return globalThis.__repoCacheRedisClient;

  // ── 1. Upstash (production cloud Redis via HTTP REST) ─────────────────
  const { url, token } = readUpstashEnv();
  if (url && token) {
    const client = new Redis({ url, token });
    globalThis.__repoCacheRedisClient = client;
    return client;
  }

  // ── 2. Standard Redis via ioredis (REDIS_HOST / REDIS_PORT) ──────────
  const { host, port, password } = readStandardRedisEnv();
  if (host) {
    const ioredis = new IORedis({
      host,
      port: port ?? 6379,
      password: password || undefined,
      // Disable ioredis's aggressive retry strategy in tests / short-lived
      // processes so the process can exit cleanly.
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: false,
    });

    // Log connection events in non-test environments so operators can see
    // whether the cache is actually reaching Redis.
    if (process.env.NODE_ENV !== 'test') {
      ioredis.on('connect', () => {
        console.log(`[@repo/cache] ioredis connected to ${host}:${port ?? 6379}`);
      });
      ioredis.on('error', (err: Error) => {
        console.warn(`[@repo/cache] ioredis error: ${err.message}`);
      });
    }

    const adapter = createIORedisAdapter(ioredis);
    globalThis.__repoCacheRedisClient = adapter;
    return adapter;
  }

  // ── 3. In-memory fallback (dev / test without Redis) ─────────────────
  const mem = createInMemoryClient();
  globalThis.__repoCacheRedisClient = mem;
  return mem;
}

export function resetRedisClientForTests(): void {
  globalThis.__repoCacheRedisClient = undefined;
}
