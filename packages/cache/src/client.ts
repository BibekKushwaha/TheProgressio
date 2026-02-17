import { Redis } from '@upstash/redis';

type UpstashRedis = Redis;

type MinimalRedisClient = {
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

function readRedisEnv(): { url?: string; token?: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
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
      // For simple behavior, return -1 to let callers fall back to windowSeconds
      return -1;
    },
  };
}

export function getRedisClient(): RedisClient {
  if (globalThis.__repoCacheRedisClient) return globalThis.__repoCacheRedisClient;

  const { url, token } = readRedisEnv();

  if (url && token) {
    const client = new Redis({ url, token });
    globalThis.__repoCacheRedisClient = client;
    return client;
  }

  // Fallback: non-throwing in-memory client for dev/tests
  const mem = createInMemoryClient();
  globalThis.__repoCacheRedisClient = mem;
  return mem;
}

export function resetRedisClientForTests(): void {
  globalThis.__repoCacheRedisClient = undefined;
}
