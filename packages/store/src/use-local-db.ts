/**
 * React hooks for local-first data access.
 * 
 * These hooks use Dexie's useLiveQuery for reactive IndexedDB reads,
 * falling back to RTK Query when local data isn't available yet.
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    localTasks,
    localCategories,
    localHabits,
    localHabitLogs,
    localTimetable,
    syncQueue,
    clearLocalData,
    type LocalTask,
    type LocalCategory,
    type LocalHabit,
    type LocalHabitLog,
    type LocalTimetableEntry,
} from './local-db';
import { syncEngine } from './sync-engine';

type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

// ─── Sync Status Hook ───────────────────────────────────────────────────────────

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const unsubscribe = syncEngine.onStatusChange((s, count) => {
            setStatus(s);
            setPendingCount(count);
        });

        // Start the sync engine
        syncEngine.start();

        return () => {
            unsubscribe();
        };
    }, []);

    const forceSync = useCallback(() => syncEngine.forceSync(), []);

    return { status, pendingCount, forceSync };
}

// ─── Local Tasks Hook ───────────────────────────────────────────────────────────

export function useLocalTasks(filters?: {
    userId?: string;
    status?: string;
    priority?: string;
    categoryId?: string;
    search?: string;
}) {
    const [tasks, setTasks] = useState<LocalTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const refresh = useCallback(async () => {
        try {
            const result = await localTasks.getAll(filtersRef.current);
            setTasks(result);
        } catch (error) {
            console.warn('[useLocalTasks] Failed to read local DB:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        // Poll for changes every 2 seconds (Dexie live queries would be better with dexie-react-hooks)
        const interval = setInterval(refresh, 2000);
        return () => clearInterval(interval);
    }, [refresh]);

    return { tasks, isLoading, refresh };
}

// ─── Local Categories Hook ──────────────────────────────────────────────────────

export function useLocalCategories(userId?: string) {
    const [categories, setCategories] = useState<LocalCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const result = await localCategories.getAll(userId);
            setCategories(result);
        } catch (error) {
            console.warn('[useLocalCategories] Failed to read local DB:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 2000);
        return () => clearInterval(interval);
    }, [refresh]);

    return { categories, isLoading, refresh };
}

// ─── Hydration Hook (preload local DB from server on first load) ────────────────

export function useLocalDbHydration() {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        syncEngine.pullFromServer().then(() => {
            setHydrated(true);
        }).catch(() => {
            // Offline or error — still mark as hydrated so UI shows local data
            setHydrated(true);
        });
    }, []);

    return hydrated;
}

// ─── Pending Sync Count Hook ────────────────────────────────────────────────────

export function usePendingSyncCount() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const check = async () => {
            const c = await syncQueue.count();
            setCount(c);
        };
        check();
        const interval = setInterval(check, 3000);
        return () => clearInterval(interval);
    }, []);

    return count;
}

// ─── Clear local data (e.g., on logout) ─────────────────────────────────────────

export function useClearLocalData() {
    return useCallback(async () => {
        syncEngine.stop();
        await clearLocalData();
    }, []);
}

// ─── Local Habits Hook ──────────────────────────────────────────────────────────

export function useLocalHabits(filters?: { userId?: string }) {
    const [habits, setHabits] = useState<LocalHabit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const refresh = useCallback(async () => {
        try {
            const result = await localHabits.getAll(filtersRef.current);
            setHabits(result);
        } catch (error) {
            console.warn('[useLocalHabits] Failed to read local DB:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 2000);
        return () => clearInterval(interval);
    }, [refresh]);

    return { habits, isLoading, refresh };
}

// ─── Local Habit Logs Hook ──────────────────────────────────────────────────────

export function useLocalHabitLogs(habitId?: string) {
    const [logs, setLogs] = useState<LocalHabitLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!habitId) {
            setLogs([]);
            setIsLoading(false);
            return;
        }
        try {
            const result = await localHabitLogs.getByHabitId(habitId);
            setLogs(result);
        } catch (error) {
            console.warn('[useLocalHabitLogs] Failed to read local DB:', error);
        } finally {
            setIsLoading(false);
        }
    }, [habitId]);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 2000);
        return () => clearInterval(interval);
    }, [refresh]);

    return { logs, isLoading, refresh };
}

// ─── Local Timetable Hook ───────────────────────────────────────────────────────

export function useLocalTimetable(filters?: { userId?: string; dayOfWeek?: number }) {
    const [entries, setEntries] = useState<LocalTimetableEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const refresh = useCallback(async () => {
        try {
            const result = await localTimetable.getAll(filtersRef.current);
            setEntries(result);
        } catch (error) {
            console.warn('[useLocalTimetable] Failed to read local DB:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 3000); // Less frequent — timetable changes rarely
        return () => clearInterval(interval);
    }, [refresh]);

    return { entries, isLoading, refresh };
}
