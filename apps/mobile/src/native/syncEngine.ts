/**
 * Offline Sync Engine — React Native
 *
 * Integrates localDbAdapter (AsyncStorage queue) with RTK store.
 * Monitors network state via NetInfo and replays the pending queue
 * against the live API whenever connectivity is restored.
 *
 * Architecture:
 *   NetInfo listener → onConnectivityChange()
 *   → drainQueue()
 *     → for each SyncQueueItem: dispatch RTK mutation
 *     → on success: remove from queue
 *     → on failure (retries < 3): increment retries
 *     → on failure (retries >= 3): move to dead-letter log
 */
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppDispatch } from '@repo/store';
import { captureError } from './sentry';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncAction = 'create' | 'update' | 'delete' | 'log';

export interface SyncQueueItem {
    id: string;
    action: SyncAction;
    /** e.g. 'tasks', 'habits', 'sessions' */
    entity: string;
    payload: unknown;
    timestamp: number;
    retries: number;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const QUEUE_KEY = 'sync:queue:v1';
const DEAD_LETTER_KEY = 'sync:dead:v1';
const MAX_RETRIES = 3;

// ─── Queue operations ─────────────────────────────────────────────────────────

export async function getQueue(): Promise<SyncQueueItem[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? (JSON.parse(raw) as SyncQueueItem[]) : [];
    } catch {
        return [];
    }
}

export async function enqueue(item: Omit<SyncQueueItem, 'timestamp' | 'retries'>): Promise<void> {
    const queue = await getQueue();
    queue.push({ ...item, timestamp: Date.now(), retries: 0 });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function dequeue(id: string): Promise<void> {
    const queue = await getQueue();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter((i) => i.id !== id)));
}

async function incrementRetry(id: string): Promise<void> {
    const queue = await getQueue();
    const updated = queue.map((i) => (i.id === id ? { ...i, retries: i.retries + 1 } : i));
    // Move exhausted items to dead-letter
    const dead = updated.filter((i) => i.id === id && i.retries >= MAX_RETRIES);
    const live = updated.filter((i) => !(i.id === id && i.retries >= MAX_RETRIES));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(live));
    if (dead.length > 0) {
        const dl = JSON.parse((await AsyncStorage.getItem(DEAD_LETTER_KEY)) ?? '[]') as SyncQueueItem[];
        await AsyncStorage.setItem(DEAD_LETTER_KEY, JSON.stringify([...dl, ...dead]));
        console.warn('[SyncEngine] Item moved to dead-letter after 3 retries:', dead[0]);
    }
}

export async function getPendingCount(): Promise<number> {
    return (await getQueue()).length;
}

export async function getDeadLetterItems(): Promise<SyncQueueItem[]> {
    try {
        const raw = await AsyncStorage.getItem(DEAD_LETTER_KEY);
        return raw ? (JSON.parse(raw) as SyncQueueItem[]) : [];
    } catch {
        return [];
    }
}

export async function clearDeadLetter(): Promise<void> {
    await AsyncStorage.removeItem(DEAD_LETTER_KEY);
}

// ─── Flush handlers per entity ────────────────────────────────────────────────
// These are lazy-loaded so we avoid circular imports with @repo/store.

let _dispatch: AppDispatch | null = null;

export function registerDispatch(dispatch: AppDispatch) {
    _dispatch = dispatch;
}

async function replayItem(item: SyncQueueItem): Promise<boolean> {
    if (!_dispatch) return false;

    try {
        // Dynamically import only what's needed to avoid loading the full store on startup
        const store = await import('@repo/store');

        switch (item.entity) {
            case 'tasks': {
                if (item.action === 'create') {
                    await _dispatch((store as any).tasksApi.endpoints.createTask.initiate(item.payload as any));
                } else if (item.action === 'update') {
                    const { id, ...body } = item.payload as any;
                    await _dispatch((store as any).tasksApi.endpoints.updateTask.initiate({ id, ...body }));
                } else if (item.action === 'delete') {
                    await _dispatch((store as any).tasksApi.endpoints.deleteTask.initiate(item.payload as any));
                }
                break;
            }
            case 'habits': {
                if (item.action === 'log') {
                    await _dispatch((store as any).habitsApi.endpoints.logHabit.initiate(item.payload as any));
                }
                break;
            }
            case 'sessions': {
                if (item.action === 'create') {
                    await _dispatch(
                        (store as any).analyticsApi.endpoints.startLiveSession.initiate(item.payload as any)
                    );
                }
                break;
            }
            default:
                console.warn('[SyncEngine] Unknown entity in queue:', item.entity);
                return true; // Drain unknown items to prevent queue blockage
        }

        return true;
    } catch (err) {
        captureError(err, { syncItem: item });
        return false;
    }
}

// ─── Queue drain ─────────────────────────────────────────────────────────────

let _isDraining = false;

export async function drainQueue(): Promise<void> {
    if (_isDraining) return;
    _isDraining = true;

    const queue = await getQueue();
    if (queue.length === 0) {
        _isDraining = false;
        return;
    }

    console.log(`[SyncEngine] Draining ${queue.length} item(s)…`);

    for (const item of queue) {
        const ok = await replayItem(item);
        if (ok) {
            await dequeue(item.id);
            console.log(`[SyncEngine] ✅ Synced ${item.entity}/${item.action} (id: ${item.id})`);
        } else {
            await incrementRetry(item.id);
            console.warn(`[SyncEngine] ⚠️ Failed ${item.entity}/${item.action} (retries: ${item.retries + 1})`);
        }
    }

    _isDraining = false;
    console.log('[SyncEngine] Drain complete.');
}

// ─── NetInfo listener ─────────────────────────────────────────────────────────

let _unsubscribe: (() => void) | null = null;

export function startSyncEngine(dispatch: AppDispatch) {
    registerDispatch(dispatch);

    _unsubscribe = NetInfo.addEventListener((state) => {
        const online = !!(state.isConnected && state.isInternetReachable);
        if (online) {
            drainQueue().catch((err) => captureError(err, { context: 'drainQueue' }));
        }
    });

    // Also drain immediately on startup (in case we were offline and came back)
    NetInfo.fetch().then((state) => {
        if (state.isConnected && state.isInternetReachable) {
            drainQueue().catch((err) => captureError(err, { context: 'startup-drain' }));
        }
    });

    console.log('[SyncEngine] Started.');
}

export function stopSyncEngine() {
    _unsubscribe?.();
    _unsubscribe = null;
    console.log('[SyncEngine] Stopped.');
}
