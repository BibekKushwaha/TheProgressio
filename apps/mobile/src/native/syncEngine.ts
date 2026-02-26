/**
 * Offline Sync Engine — React Native (SQLite + /api/sync push/pull)
 *
 * - Push queued operations (tasks/categories) to planner-service /api/sync/push
 * - Pull remote operations from planner-service /api/sync/pull
 * - Apply lamport/vector metadata deterministically into SQLite
 *
 * Notes:
 * - Uses Bearer tokens (mobile access token) for auth.
 * - On 401, performs one refresh attempt using auth-service /api/auth/mobile/refresh.
 */
import NetInfo from '@react-native-community/netinfo';
import {
  getAccessTokenSync,
  getRefreshTokenSync,
  setMobileTokens,
} from '@repo/store';
import { captureError } from './sentry';
import {
  applyRemoteSyncOperation,
  getSyncClientId,
  getSyncCursor,
  initLocalDb,
  isOnline,
  localCategories,
  localTasks,
  setSyncCursor,
  syncQueue,
  type SyncQueueItem,
} from './localDbAdapter';

const PLANNER_SERVICE_URL = process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';
const AUTH_SERVICE_URL = process.env.EXPO_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4000';

const SYNC_INTERVAL_MS = 30_000;
const MAX_RETRIES = 5;

type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

interface SyncPushResponse {
  message: string;
  cursor: number;
  appliedOps: string[];
  rejectedOps: Array<{ opId: string; reason: string }>;
  mergeHints: Array<Record<string, unknown>>;
}

interface SyncPullResponse {
  message: string;
  cursor: number;
  operations: any[];
}

let refreshInFlight: Promise<boolean> | null = null;

async function ensureFreshMobileSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshToken = getRefreshTokenSync();
      if (!refreshToken) return false;

      const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/mobile/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: string;
      };

      if (data?.accessToken && data?.refreshToken) {
        await setMobileTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        } as any);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function fetchPlanner(input: string, init?: RequestInit): Promise<Response> {
  const accessToken = getAccessTokenSync();
  const headers = new Headers(init?.headers ?? {});
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  const refreshed = await ensureFreshMobileSession();
  if (!refreshed) return res;

  const nextToken = getAccessTokenSync();
  const retryHeaders = new Headers(init?.headers ?? {});
  if (nextToken) retryHeaders.set('Authorization', `Bearer ${nextToken}`);
  return fetch(input, { ...init, headers: retryHeaders });
}

class MobileBackgroundSyncEngine {
  private status: SyncStatus = 'idle';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;
  private startRefCount = 0;
  private isProcessing = false;
  private listeners: Set<(status: SyncStatus, pendingCount: number) => void> = new Set();

  start(): void {
    this.startRefCount += 1;
    if (this.intervalId) return;

    void initLocalDb();

    this.unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      if (online) {
        void this.processQueue();
      } else {
        this.setStatus('offline');
      }
    });

    this.intervalId = setInterval(() => {
      void this.processQueue();
    }, SYNC_INTERVAL_MS);

    void this.processQueue();
  }

  stop(): void {
    if (this.startRefCount > 0) this.startRefCount -= 1;
    if (this.startRefCount > 0) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.setStatus('idle');
  }

  onStatusChange(listener: (status: SyncStatus, pendingCount: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async forceSync(): Promise<void> {
    await this.processQueue();
  }

  async pullFromServer(): Promise<void> {
    if (!isOnline()) return;
    await this.pullOperations();
    const cursor = await getSyncCursor();
    if (cursor > 0) return;
    await this.hydrateFallbackSnapshots();
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      if (!isOnline()) {
        this.setStatus('offline');
        return;
      }

      const accessToken = getAccessTokenSync();
      if (!accessToken) {
        this.setStatus('idle');
        return;
      }

      this.setStatus('syncing');
      await this.pushPendingOperations();
      await this.pullOperations();

      const remaining = await syncQueue.count();
      this.setStatus(remaining > 0 ? 'error' : 'idle');
    } catch (error) {
      captureError(error, { context: 'mobile_sync_cycle' });
      this.setStatus('error');
    } finally {
      this.isProcessing = false;
    }
  }

  private async pushPendingOperations(): Promise<void> {
    const pending = await syncQueue.getPending();
    if (pending.length === 0) return;

    const supported = pending.filter((item) => item.entityType === 'task' || item.entityType === 'category');
    if (supported.length === 0) return;

    const clientId = await getSyncClientId();
    const body = {
      clientId,
      operations: supported.map((item) => ({
        opId: item.opId,
        entityType: item.entityType,
        entityId: item.entityId,
        action: item.action === 'DELETE' ? 'DELETE' : 'UPSERT',
        lamportTs: item.lamportTs,
        vectorClock: item.vectorClock,
        payload: item.payload,
        tombstone: item.tombstone,
      })),
    };

    const response = await fetchPlanner(`${PLANNER_SERVICE_URL}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await this.handlePushFailure(supported, `push_failed_${response.status}`);
      throw new Error(`Push sync failed: ${response.status}`);
    }

    const data = (await response.json()) as SyncPushResponse;

    const processedOpIds = [
      ...(Array.isArray(data.appliedOps) ? data.appliedOps : []),
      ...((Array.isArray(data.rejectedOps) ? data.rejectedOps : []).map((entry) => entry.opId)),
    ];

    if (processedOpIds.length > 0) {
      await syncQueue.removeByOpIds(processedOpIds);
    }

    if (typeof data.cursor === 'number' && Number.isFinite(data.cursor)) {
      await setSyncCursor(data.cursor);
    }
  }

  private async handlePushFailure(items: SyncQueueItem[], reason: string): Promise<void> {
    for (const item of items) {
      if (!item.id) continue;
      if (item.retryCount + 1 >= MAX_RETRIES) {
        // Drop exhausted items to avoid permanent queue blockage.
        await syncQueue.removeByOpIds([item.opId]);
      } else {
        await syncQueue.markRetry(item.id, reason);
      }
    }
  }

  private async pullOperations(): Promise<void> {
    const since = await getSyncCursor();

    const response = await fetchPlanner(`${PLANNER_SERVICE_URL}/api/sync/pull?since=${since}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Pull sync failed: ${response.status}`);
    }

    const data = (await response.json()) as SyncPullResponse;
    const operations = Array.isArray(data.operations) ? data.operations : [];

    for (const operation of operations) {
      await applyRemoteSyncOperation(operation);
    }

    if (typeof data.cursor === 'number' && Number.isFinite(data.cursor)) {
      await setSyncCursor(data.cursor);
    }
  }

  private async hydrateFallbackSnapshots(): Promise<void> {
    try {
      const [tasksResponse, categoriesResponse] = await Promise.all([
        fetchPlanner(`${PLANNER_SERVICE_URL}/api/tasks?limit=500`, { method: 'GET' }),
        fetchPlanner(`${PLANNER_SERVICE_URL}/api/categories`, { method: 'GET' }),
      ]);

      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        await localTasks.hydrate(Array.isArray(tasks) ? tasks : []);
      }

      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        const list = Array.isArray(categories?.categories)
          ? categories.categories
          : Array.isArray(categories)
            ? categories
            : [];
        await localCategories.hydrate(list);
      }
    } catch (error) {
      captureError(error, { context: 'mobile_fallback_hydration' });
    }
  }

  private setStatus(status: SyncStatus): void {
    if (this.status !== status) {
      this.status = status;
      void syncQueue.count().then((count) => {
        this.listeners.forEach((fn) => fn(status, count));
      });
    }
  }
}

export const syncEngine = new MobileBackgroundSyncEngine();

// Backwards-compatible exports used by App.tsx
export function startSyncEngine(): void {
  syncEngine.start();
}

export function stopSyncEngine(): void {
  syncEngine.stop();
}

