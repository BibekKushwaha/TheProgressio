import { getRedisClient } from './client.js';

export interface SetCacheOptions {
  ttlSeconds?: number;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const value = await client.get<T>(key);
  return value ?? null;
}

export async function setCache<T>(key: string, value: T, options?: SetCacheOptions): Promise<void> {
  const client = getRedisClient();

  if (options?.ttlSeconds && options.ttlSeconds > 0) {
    await client.set(key, value, { ex: options.ttlSeconds });
    return;
  }

  await client.set(key, value);
}

export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  const deletedCount = await client.del(key);
  return deletedCount > 0;
}
