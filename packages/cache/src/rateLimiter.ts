import { getRedisClient } from './client.js';

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  totalHits: number;
  remaining: number;
  resetAt: number;
}

function validateRateLimitOptions(options: RateLimitOptions): void {
  if (!options.key) {
    throw new Error('Rate limit key is required.');
  }
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error('Rate limit must be a positive integer.');
  }
  if (!Number.isInteger(options.windowSeconds) || options.windowSeconds <= 0) {
    throw new Error('Rate limit windowSeconds must be a positive integer.');
  }
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  validateRateLimitOptions(options);

  const client = getRedisClient();
  const prefix = options.prefix ?? 'rate-limit';
  const storageKey = `${prefix}:${options.key}`;
  const nowSeconds = Math.floor(Date.now() / 1000);

  const clientAny: any = client;
  const totalHits = await clientAny.incr(storageKey);
  if (totalHits === 1) {
    await clientAny.expire(storageKey, options.windowSeconds);
  }

  const ttlSeconds = await clientAny.ttl(storageKey);
  const effectiveTtlSeconds = ttlSeconds > 0 ? ttlSeconds : options.windowSeconds;

  return {
    allowed: totalHits <= options.limit,
    totalHits,
    remaining: Math.max(0, options.limit - totalHits),
    resetAt: (nowSeconds + effectiveTtlSeconds) * 1000,
  };
}
