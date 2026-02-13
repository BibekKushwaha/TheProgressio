/**
 * Background Sync Engine
 *
 * CRDT protocol:
 * - push queued operations to /api/sync/push
 * - pull remote operations from /api/sync/pull
 * - apply deterministic lamport/vector metadata locally
 */
import {
    applyRemoteSyncOperation,
    getSyncClientId,
    getSyncCursor,
    localCategories,
    localTasks,
    setSyncCursor,
    syncQueue,
    type SyncQueueItem,
} from './local-db';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';
const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 5000;

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
    operations: Array<{
        id: number;
        clientId: string;
        opId: string;
        entityType: 'task' | 'category';
        entityId: string;
        action: 'UPSERT' | 'DELETE';
        payload: Record<string, unknown> | null;
        lamportTs: number;
        vectorClock: Record<string, number> | null;
        tombstone: boolean;
        createdAt: string;
    }>;
}

class BackgroundSyncEngine {
    private status: SyncStatus = 'idle';
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private listeners: Set<(status: SyncStatus, pendingCount: number) => void> = new Set();

    start(): void {
        if (this.intervalId) return;

        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.onOnline());
            window.addEventListener('offline', () => this.onOffline());
        }

        this.intervalId = setInterval(() => {
            this.processQueue().catch((error) => {
                console.warn('[Sync] process queue failed:', error);
            });
        }, SYNC_INTERVAL_MS);

        this.processQueue().catch((error) => {
            console.warn('[Sync] initial process queue failed:', error);
        });
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', () => this.onOnline());
            window.removeEventListener('offline', () => this.onOffline());
        }
    }

    onStatusChange(listener: (status: SyncStatus, pendingCount: number) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getStatus(): SyncStatus {
        return this.status;
    }

    async forceSync(): Promise<void> {
        await this.processQueue();
    }

    async pullFromServer(): Promise<void> {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;

        await this.pullOperations();

        const cursor = await getSyncCursor();
        if (cursor > 0) {
            return;
        }

        // Backward-compatible bootstrap for accounts with no sync op history yet.
        await this.hydrateFallbackSnapshots();
    }

    // ─── Private ────────────────────────────────────────────────────────────────

    private async processQueue(): Promise<void> {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            this.setStatus('offline');
            return;
        }

        this.setStatus('syncing');

        try {
            await this.pushPendingOperations();
            await this.pullOperations();

            const remaining = await syncQueue.count();
            this.setStatus(remaining > 0 ? 'error' : 'idle');
        } catch (error) {
            console.warn('[Sync] Queue cycle failed:', error);
            this.setStatus('error');
        }
    }

    private async pushPendingOperations(): Promise<void> {
        const pending = await syncQueue.getPending();
        if (pending.length === 0) return;

        const supported = pending.filter((item) => item.entityType === 'task' || item.entityType === 'category');
        const unsupported = pending.filter((item) => item.entityType !== 'task' && item.entityType !== 'category');

        if (unsupported.length > 0) {
            await syncQueue.removeByOpIds(unsupported.map((item) => item.opId));
        }

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

        const response = await fetch(`${PLANNER_SERVICE_URL}/api/sync/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            await this.handlePushFailure(supported, `push_failed_${response.status}`);
            throw new Error(`Push sync failed: ${response.status}`);
        }

        const data = await response.json() as SyncPushResponse;

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
                await syncQueue.remove(item.id);
            } else {
                await syncQueue.markRetry(item.id, reason);
            }
        }
    }

    private async pullOperations(): Promise<void> {
        const since = await getSyncCursor();

        const response = await fetch(`${PLANNER_SERVICE_URL}/api/sync/pull?since=${since}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Pull sync failed: ${response.status}`);
        }

        const data = await response.json() as SyncPullResponse;
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
                fetch(`${PLANNER_SERVICE_URL}/api/tasks?limit=500`, { credentials: 'include' }),
                fetch(`${PLANNER_SERVICE_URL}/api/categories`, { credentials: 'include' }),
            ]);

            if (tasksResponse.ok) {
                const tasks = await tasksResponse.json();
                await localTasks.hydrate(Array.isArray(tasks) ? tasks : []);
            }

            if (categoriesResponse.ok) {
                const categories = await categoriesResponse.json();
                await localCategories.hydrate(Array.isArray(categories) ? categories : []);
            }
        } catch (error) {
            console.warn('[Sync] Fallback hydration failed:', error);
        }
    }

    private onOnline(): void {
        this.processQueue().catch((error) => {
            console.warn('[Sync] online sync failed:', error);
        });
    }

    private onOffline(): void {
        this.setStatus('offline');
    }

    private setStatus(status: SyncStatus): void {
        if (this.status !== status) {
            this.status = status;
            syncQueue.count().then((count) => {
                this.listeners.forEach((fn) => fn(status, count));
            });
        }
    }
}

export const syncEngine = new BackgroundSyncEngine();
