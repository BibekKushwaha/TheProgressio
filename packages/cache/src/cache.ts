import { getRedisClient } from './client.js';

export interface SetCacheOptions {
  ttlSeconds?: number;
}

// ── L1: in-process LRU cache ───────────────────────────────────────────
// Serves hot keys (SWOT, predictive, dashboard) from memory with zero network
// latency.  Backed by Redis (L2) for cross-process / cross-restart sharing.
//
// Implementation: a Map keeps insertion order; we re-insert on access so the
// most-recently-used entry is always at the end.  Eviction removes the oldest
// (first) entry when the map exceeds MAX_ENTRIES.

interface L1Entry {
  value: unknown;
  expiresAt: number; // ms timestamp; 0 = no expiry
}

const MAX_ENTRIES = 256;
const l1: Map<string, L1Entry> = new Map();

function l1Get<T>(key: string): T | null {
  const entry = l1.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    l1.delete(key);
    return null;
  }
  // Re-insert to mark as recently used (LRU semantics).
  l1.delete(key);
  l1.set(key, entry);
  return entry.value as T;
}

function l1Set(key: string, value: unknown, ttlSeconds?: number): void {
  // Evict oldest entry if at capacity.
  if (l1.size >= MAX_ENTRIES) {
    const oldest = l1.keys().next().value;
    if (oldest !== undefined) l1.delete(oldest);
  }
  l1.set(key, {
    value,
    expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
  });
}

function l1Delete(key: string): void {
  l1.delete(key);
}

// ── Public cache API ───────────────────────────────────────────────────

export async function getCache<T>(key: string): Promise<T | null> {
  // Check L1 first — zero latency on a hit.
  const l1Hit = l1Get<T>(key);
  if (l1Hit !== null) return l1Hit;

  // L2: Redis
  const client = getRedisClient();
  const value = await client.get<T>(key);
  if (value === null || value === undefined) return null;

  // Warm L1 for subsequent calls. TTL is unknown here so we use a conservative
  // 60-second in-process window to avoid stale reads across TTL boundaries.
  l1Set(key, value, 60);
  return value;
}

export async function setCache<T>(key: string, value: T, options?: SetCacheOptions): Promise<void> {
  const client = getRedisClient();

  if (options?.ttlSeconds && options.ttlSeconds > 0) {
    await client.set(key, value, { ex: options.ttlSeconds });
    l1Set(key, value, options.ttlSeconds);
    return;
  }

  await client.set(key, value);
  l1Set(key, value);
}

export async function deleteCache(key: string): Promise<boolean> {
  l1Delete(key);
  const client = getRedisClient();
  const deletedCount = await client.del(key);
  return deletedCount > 0;
}
