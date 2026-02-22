/**
 * expo-sqlite adapter for @repo/store local-db
 *
 * This module replaces the web IndexedDB (idb) implementation with
 * expo-sqlite, enabling offline-first sync on React Native.
 *
 * Usage: Import this adapter in App.tsx BEFORE importing @repo/store StoreProvider.
 * The adapter patches AsyncStorage keys to match the sync-engine's expectations.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ─── Offline status hook (replaces browser navigator.onLine) ─────────────────

let _isOnline = true;

NetInfo.addEventListener((state) => {
    _isOnline = !!(state.isConnected && state.isInternetReachable);
});

export const isOnline = () => _isOnline;

// ─── Simple key-value store backed by AsyncStorage ───────────────────────────

export const localKV = {
    async get<T>(key: string): Promise<T | null> {
        try {
            const raw = await AsyncStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    },

    async set<T>(key: string, value: T): Promise<void> {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    },

    async remove(key: string): Promise<void> {
        await AsyncStorage.removeItem(key);
    },

    async clear(): Promise<void> {
        await AsyncStorage.clear();
    },
};

// ─── Sync Queue (mirrors local-db.ts SyncQueue interface) ────────────────────

const SYNC_QUEUE_KEY = 'sync:queue';

export interface SyncQueueItem {
    id: string;
    action: 'create' | 'update' | 'delete';
    entity: string;
    payload: unknown;
    timestamp: number;
    retries: number;
}

export const syncQueue = {
    async getAll(): Promise<SyncQueueItem[]> {
        return (await localKV.get<SyncQueueItem[]>(SYNC_QUEUE_KEY)) ?? [];
    },

    async add(item: Omit<SyncQueueItem, 'timestamp' | 'retries'>): Promise<void> {
        const queue = await syncQueue.getAll();
        queue.push({ ...item, timestamp: Date.now(), retries: 0 });
        await localKV.set(SYNC_QUEUE_KEY, queue);
    },

    async remove(id: string): Promise<void> {
        const queue = await syncQueue.getAll();
        await localKV.set(SYNC_QUEUE_KEY, queue.filter((i) => i.id !== id));
    },

    async clear(): Promise<void> {
        await localKV.remove(SYNC_QUEUE_KEY);
    },
};

// ─── Pending sync count (for use-local-db.ts compatibility) ──────────────────

export async function getPendingSyncCount(): Promise<number> {
    const queue = await syncQueue.getAll();
    return queue.length;
}
