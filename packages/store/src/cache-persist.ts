/**
 * RTK Query cache persistence.
 *
 * Saves the RTK Query API slice states to localStorage after each store
 * change (debounced). On the next hard refresh `makeStore()` loads this as
 * `preloadedState`, so RTK Query sees `status: 'fulfilled'` data and skips
 * the network request entirely for all non-real-time endpoints.
 *
 * TTL: 5 minutes — if the cached data is older than 5 min it is discarded
 * and all endpoints fetch fresh as normal.
 */

export const RTK_CACHE_KEY = '@sat/rtk-query-cache-v1' as const;
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const SCHEMA_VERSION = 1;

/**
 * API reduce paths to persist.  Intentionally excludes paymentApi (sensitive).
 */
const PERSIST_SLICES = [
  'authApi',
  'tasksApi',
  'categoriesApi',
  'habitsApi',
  'analyticsApi',
  'timetableApi',
  'calendarApi',
  'rotationsApi',
  'syllabusApi',
  'mentorshipApi',
] as const;

interface CacheEnvelope {
  v: number;
  ts: number;
  slices: Record<string, unknown>;
}

/** Load persisted RTK Query state — returns undefined on SSR, miss, or expiry. */
export function loadRtkCache(): Record<string, unknown> | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(RTK_CACHE_KEY);
    if (!raw) return undefined;

    const envelope = JSON.parse(raw) as CacheEnvelope;
    if (envelope.v !== SCHEMA_VERSION) {
      window.localStorage.removeItem(RTK_CACHE_KEY);
      return undefined;
    }
    if (Date.now() - envelope.ts > TTL_MS) {
      window.localStorage.removeItem(RTK_CACHE_KEY);
      return undefined;
    }
    return envelope.slices;
  } catch {
    return undefined;
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced save — writes 1.5 s after the last store change. */
export function scheduleSaveRtkCache(state: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      const slices: Record<string, unknown> = {};
      for (const key of PERSIST_SLICES) {
        if (key in state) slices[key] = state[key];
      }
      const envelope: CacheEnvelope = { v: SCHEMA_VERSION, ts: Date.now(), slices };
      window.localStorage.setItem(RTK_CACHE_KEY, JSON.stringify(envelope));
    } catch {
      // Storage quota exceeded or private browsing — silently skip.
    }
  }, 1500);
}

/** Clear persisted cache (call on logout). */
export function clearRtkCache(): void {
  if (typeof window === 'undefined') return;
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  try {
    window.localStorage.removeItem(RTK_CACHE_KEY);
  } catch { /* */ }
}
