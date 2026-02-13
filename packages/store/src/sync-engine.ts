/**
 * Background Sync Engine
 * 
 * Processes the local sync queue and reconciles with the server.
 * Runs automatically when online, pauses when offline.
 * Uses Last-Write-Wins (LWW) conflict resolution.
 */
import { localDb, syncQueue, localTasks, localCategories, localHabits, localHabitLogs, localTimetable, type SyncQueueItem } from './local-db';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';
const HABIT_SERVICE_URL = process.env.NEXT_PUBLIC_HABIT_SERVICE_URL || 'http://localhost:4002';
const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 5000; // 5 seconds

type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

class BackgroundSyncEngine {
    private status: SyncStatus = 'idle';
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private listeners: Set<(status: SyncStatus, pendingCount: number) => void> = new Set();

    /**
     * Start the background sync loop.
     */
    start(): void {
        if (this.intervalId) return;

        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.onOnline());
            window.addEventListener('offline', () => this.onOffline());
        }

        this.intervalId = setInterval(() => this.processQueue(), SYNC_INTERVAL_MS);
        console.log('[Sync] Background sync engine started');

        // Process immediately
        this.processQueue();
    }

    /**
     * Stop the background sync loop.
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', () => this.onOnline());
            window.removeEventListener('offline', () => this.onOffline());
        }
        console.log('[Sync] Background sync engine stopped');
    }

    /**
     * Subscribe to sync status changes.
     */
    onStatusChange(listener: (status: SyncStatus, pendingCount: number) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getStatus(): SyncStatus {
        return this.status;
    }

    /**
     * Force an immediate sync cycle.
     */
    async forceSync(): Promise<void> {
        await this.processQueue();
    }

    /**
     * Hydrate local DB from server (pull fresh data).
     */
    async pullFromServer(): Promise<void> {
        if (!navigator.onLine) return;

        try {
            // Fetch tasks
            const tasksRes = await fetch(`${PLANNER_SERVICE_URL}/api/tasks?limit=500`, {
                credentials: 'include',
            });
            if (tasksRes.ok) {
                const tasks = await tasksRes.json();
                await localTasks.hydrate(tasks);
            }

            // Fetch categories
            const catsRes = await fetch(`${PLANNER_SERVICE_URL}/api/categories`, {
                credentials: 'include',
            });
            if (catsRes.ok) {
                const categories = await catsRes.json();
                await localCategories.hydrate(categories);
            }

            // Fetch habits
            const habitsRes = await fetch(`${HABIT_SERVICE_URL}/api/habits`, {
                credentials: 'include',
            });
            if (habitsRes.ok) {
                const habits = await habitsRes.json();
                await localHabits.hydrate(Array.isArray(habits) ? habits : habits.habits ?? []);
            }

            // Fetch timetable entries
            const timetableRes = await fetch(`${PLANNER_SERVICE_URL}/api/timetable`, {
                credentials: 'include',
            });
            if (timetableRes.ok) {
                const entries = await timetableRes.json();
                await localTimetable.hydrate(Array.isArray(entries) ? entries : entries.entries ?? []);
            }

            console.log('[Sync] Pulled fresh data from server (tasks, categories, habits, timetable)');
        } catch (error) {
            console.warn('[Sync] Pull from server failed:', error);
        }
    }

    // ─── Private ────────────────────────────────────────────────────────────────

    private async processQueue(): Promise<void> {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            this.setStatus('offline');
            return;
        }

        const pending = await syncQueue.getPending();
        if (pending.length === 0) {
            this.setStatus('idle');
            return;
        }

        this.setStatus('syncing');

        for (const item of pending) {
            if (item.retryCount >= MAX_RETRIES) {
                console.error(`[Sync] Giving up on ${item.entityType}/${item.entityId} after ${MAX_RETRIES} retries`);
                await syncQueue.remove(item.id!);
                continue;
            }

            try {
                await this.processItem(item);
                await syncQueue.remove(item.id!);

                // Mark entity as synced locally
                if (item.entityType === 'task') {
                    const task = await localDb.tasks.get(item.entityId);
                    if (task) {
                        await localDb.tasks.update(item.entityId, {
                            _localOnly: false,
                            _dirty: false,
                            _lastSyncedAt: new Date().toISOString(),
                        });
                    }
                } else if (item.entityType === 'category') {
                    const cat = await localDb.categories.get(item.entityId);
                    if (cat) {
                        await localDb.categories.update(item.entityId, {
                            _localOnly: false,
                            _dirty: false,
                        });
                    }
                } else if (item.entityType === 'habit') {
                    const habit = await localDb.habits.get(item.entityId);
                    if (habit) {
                        await localDb.habits.update(item.entityId, {
                            _localOnly: false,
                            _dirty: false,
                            _lastSyncedAt: new Date().toISOString(),
                        });
                    }
                } else if (item.entityType === 'habitLog') {
                    const log = await localDb.habitLogs.get(item.entityId);
                    if (log) {
                        await localDb.habitLogs.update(item.entityId, {
                            _localOnly: false,
                            _dirty: false,
                            _lastSyncedAt: new Date().toISOString(),
                        });
                    }
                }
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.warn(`[Sync] Failed to sync ${item.entityType}/${item.entityId}:`, errMsg);
                await syncQueue.markRetry(item.id!, errMsg);
            }
        }

        const remaining = await syncQueue.count();
        this.setStatus(remaining > 0 ? 'error' : 'idle');
    }

    private async processItem(item: SyncQueueItem): Promise<void> {
        const { entityType, entityId, action, payload } = item;

        if (entityType === 'task') {
            await this.syncTask(entityId, action, payload);
        } else if (entityType === 'category') {
            await this.syncCategory(entityId, action, payload);
        } else if (entityType === 'subtask') {
            await this.syncSubTask(entityId, action, payload);
        } else if (entityType === 'habit') {
            await this.syncHabit(entityId, action, payload);
        } else if (entityType === 'habitLog') {
            await this.syncHabitLog(entityId, action, payload);
        }
    }

    private async syncTask(id: string, action: string, payload: Record<string, unknown>): Promise<void> {
        const base = `${PLANNER_SERVICE_URL}/api/tasks`;

        switch (action) {
            case 'CREATE': {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _localOnly, _dirty, _deletedLocally, _lastSyncedAt, ...data } = payload as any;
                const res = await fetch(base, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error(`Create task failed: ${res.status}`);
                const serverTask = await res.json();
                // If server assigned a different ID, update local
                if (serverTask.id !== id) {
                    await localDb.tasks.delete(id);
                    await localDb.tasks.put({ ...serverTask, _localOnly: false, _dirty: false });
                }
                break;
            }
            case 'UPDATE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`Update task failed: ${res.status}`);
                break;
            }
            case 'DELETE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                if (!res.ok && res.status !== 404) throw new Error(`Delete task failed: ${res.status}`);
                // Remove soft-deleted local entry
                await localDb.tasks.delete(id);
                break;
            }
            case 'TOGGLE': {
                const res = await fetch(`${base}/${id}/toggle`, {
                    method: 'PATCH',
                    credentials: 'include',
                });
                if (!res.ok) throw new Error(`Toggle task failed: ${res.status}`);
                break;
            }
        }
    }

    private async syncCategory(id: string, action: string, payload: Record<string, unknown>): Promise<void> {
        const base = `${PLANNER_SERVICE_URL}/api/categories`;

        switch (action) {
            case 'CREATE': {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _localOnly, _dirty, ...data } = payload as any;
                const res = await fetch(base, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error(`Create category failed: ${res.status}`);
                break;
            }
            case 'UPDATE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`Update category failed: ${res.status}`);
                break;
            }
            case 'DELETE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                if (!res.ok && res.status !== 404) throw new Error(`Delete category failed: ${res.status}`);
                break;
            }
        }
    }

    private async syncSubTask(id: string, action: string, payload: Record<string, unknown>): Promise<void> {
        const base = `${PLANNER_SERVICE_URL}/api/subtasks`;

        switch (action) {
            case 'CREATE': {
                const res = await fetch(base, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`Create subtask failed: ${res.status}`);
                break;
            }
            case 'UPDATE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`Update subtask failed: ${res.status}`);
                break;
            }
            case 'DELETE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                if (!res.ok && res.status !== 404) throw new Error(`Delete subtask failed: ${res.status}`);
                break;
            }
        }
    }

    private async syncHabit(id: string, action: string, payload: Record<string, unknown>): Promise<void> {
        const base = `${HABIT_SERVICE_URL}/api/habits`;

        switch (action) {
            case 'CREATE': {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _localOnly, _dirty, _deletedLocally, _lastSyncedAt, ...data } = payload as any;
                const res = await fetch(base, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error(`Create habit failed: ${res.status}`);
                const serverHabit = await res.json();
                if (serverHabit.id !== id) {
                    await localDb.habits.delete(id);
                    await localDb.habits.put({ ...serverHabit, _localOnly: false, _dirty: false });
                }
                break;
            }
            case 'UPDATE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`Update habit failed: ${res.status}`);
                break;
            }
            case 'DELETE': {
                const res = await fetch(`${base}/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                if (!res.ok && res.status !== 404) throw new Error(`Delete habit failed: ${res.status}`);
                await localDb.habits.delete(id);
                break;
            }
        }
    }

    private async syncHabitLog(id: string, action: string, payload: Record<string, unknown>): Promise<void> {
        const habitId = typeof payload.habitId === 'string' ? payload.habitId : '';

        switch (action) {
            case 'LOG':
            case 'CREATE': {
                const res = await fetch(`${HABIT_SERVICE_URL}/api/habits/${habitId}/log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        completedValue: payload.completedValue ?? 1,
                    }),
                });
                if (!res.ok) throw new Error(`Log habit failed: ${res.status}`);
                break;
            }
        }
    }

    private onOnline(): void {
        console.log('[Sync] Back online — triggering sync');
        this.processQueue();
    }

    private onOffline(): void {
        console.log('[Sync] Gone offline — pausing sync');
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
