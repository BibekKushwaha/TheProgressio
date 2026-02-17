import { deleteCache, getCache, setCache } from './cache.js';

const USER_CACHE_PREFIX = 'user';
const DEFAULT_USER_CACHE_TTL_SECONDS = 300;

export interface UserCacheValue {
  id: string;
  username?: string | null;
  email?: string | null;
  dailyGoalHours?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function getUserCacheKey(userId: string): string {
  if (!userId) throw new Error('userId is required to build user cache key');
  return `${USER_CACHE_PREFIX}:${userId}`;
}

export async function getUserCache(userId: string): Promise<UserCacheValue | null> {
  return getCache<UserCacheValue>(getUserCacheKey(userId));
}

export async function setUserCache(
  userId: string,
  payload: UserCacheValue,
  ttlSeconds: number = DEFAULT_USER_CACHE_TTL_SECONDS
): Promise<void> {
  await setCache<UserCacheValue>(getUserCacheKey(userId), payload, { ttlSeconds });
}

export async function deleteUserCache(userId: string): Promise<boolean> {
  return deleteCache(getUserCacheKey(userId));
}
