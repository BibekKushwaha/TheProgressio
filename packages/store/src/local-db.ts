/**
 * Local-First Persistence Layer using Dexie.js (IndexedDB)
 * 
 * Provides instant offline access to tasks, categories, habits, habit logs,
 * timetable entries, and sync queue.
 * Background sync reconciles local changes with the server when online.
 */
import Dexie, { type Table } from 'dexie';

// ─── Local DB Types ─────────────────────────────────────────────────────────────

export interface LocalTask {
    id: string;
    title: string;
    description?: string | null;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate: string | null;
    isRecurring: boolean;
    userId: string;
    categoryId: string | null;
    category?: LocalCategory | null;
    subtasks?: LocalSubTask[];
    attachments?: LocalAttachment[];
    // Sync metadata
    _localOnly?: boolean;      // true if not yet synced to server
    _dirty?: boolean;          // true if modified locally since last sync
    _deletedLocally?: boolean; // soft-delete marker for sync
    _lastSyncedAt?: string;
}

export interface LocalCategory {
    id: string;
    name: string;
    colorCode: string;
    icon?: string | null;
    userId: string;
    _count?: { tasks: number };
    _localOnly?: boolean;
    _dirty?: boolean;
}

export interface LocalSubTask {
    id: string;
    title: string;
    completed: boolean;
    taskId: string;
    createdAt: string;
    updatedAt: string;
}

export interface LocalAttachment {
    id: string;
    name: string;
    url: string;
    size?: string | null;
    taskId: string;
    createdAt: string;
}

export interface LocalHabit {
    id: string;
    name: string;
    frequency: 'DAILY' | 'WEEKLY';
    targetValue: number;
    currentStreak: number;
    longestStreak: number;
    mercyDaysAllowed: number;
    mercyDaysUsed: number;
    icon?: string | null;
    color?: string | null;
    lastLogDate?: string | null;
    linkedCategoryId?: string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
    // Sync metadata
    _localOnly?: boolean;
    _dirty?: boolean;
    _deletedLocally?: boolean;
    _lastSyncedAt?: string;
}

export interface LocalHabitLog {
    id: string;
    habitId: string;
    completedValue: number;
    loggedAt: string;
    // Sync metadata
    _localOnly?: boolean;
    _dirty?: boolean;
    _lastSyncedAt?: string;
}

export interface LocalTimetableEntry {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectId: string;
    subjectName?: string;
    subjectColor?: string;
    userId: string;
    rotation?: string | null;
    // Timetable is read-only locally (rare changes made on server)
    _lastSyncedAt?: string;
}

export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE' | 'LOG';

export interface SyncQueueItem {
    id?: number; // auto-incremented
    entityType: 'task' | 'category' | 'subtask' | 'habit' | 'habitLog';
    entityId: string;
    action: SyncAction;
    payload: Record<string, unknown>;
    createdAt: string;
    retryCount: number;
    lastError?: string;
}

// ─── Dexie Database Definition ──────────────────────────────────────────────────

class TransitionDB extends Dexie {
    tasks!: Table<LocalTask, string>;
    categories!: Table<LocalCategory, string>;
    habits!: Table<LocalHabit, string>;
    habitLogs!: Table<LocalHabitLog, string>;
    timetableEntries!: Table<LocalTimetableEntry, string>;
    syncQueue!: Table<SyncQueueItem, number>;

    constructor() {
        super('TransitionLocalDB');

        this.version(1).stores({
            tasks: 'id, userId, status, priority, categoryId, dueDate, _dirty, _localOnly',
            categories: 'id, userId, name, _dirty, _localOnly',
            syncQueue: '++id, entityType, entityId, action, createdAt',
        });

        this.version(2).stores({
            tasks: 'id, userId, status, priority, categoryId, dueDate, _dirty, _localOnly',
            categories: 'id, userId, name, _dirty, _localOnly',
            habits: 'id, userId, frequency, _dirty, _localOnly, _deletedLocally',
            habitLogs: 'id, habitId, loggedAt, _dirty, _localOnly',
            timetableEntries: 'id, userId, dayOfWeek, subjectId',
            syncQueue: '++id, entityType, entityId, action, createdAt',
        });
    }
}

export const localDb = new TransitionDB();

// ─── Task Operations (Local-First) ─────────────────────────────────────────────

export const localTasks = {
    /**
     * Get all tasks from local DB, optionally filtered.
     */
    async getAll(filters?: {
        userId?: string;
        status?: string;
        priority?: string;
        categoryId?: string;
        search?: string;
    }): Promise<LocalTask[]> {
        let collection = localDb.tasks.toCollection();

        if (filters?.userId) {
            collection = localDb.tasks.where('userId').equals(filters.userId);
        }

        let results: LocalTask[] = await collection.toArray();

        // Filter out soft-deleted
        results = results.filter((t: LocalTask) => !t._deletedLocally);

        if (filters?.status) {
            results = results.filter((t: LocalTask) => t.status === filters.status);
        }
        if (filters?.priority) {
            results = results.filter((t: LocalTask) => t.priority === filters.priority);
        }
        if (filters?.categoryId) {
            results = results.filter((t: LocalTask) => t.categoryId === filters.categoryId);
        }
        if (filters?.search) {
            const search = filters.search.toLowerCase();
            results = results.filter((t: LocalTask) => t.title.toLowerCase().includes(search));
        }

        // Sort by dueDate ascending (nulls last)
        results.sort((a: LocalTask, b: LocalTask) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        return results;
    },

    async getById(id: string): Promise<LocalTask | undefined> {
        return localDb.tasks.get(id);
    },

    /**
     * Save a task locally and queue for sync.
     */
    async create(task: LocalTask): Promise<LocalTask> {
        const localTask: LocalTask = {
            ...task,
            _localOnly: true,
            _dirty: true,
        };
        await localDb.tasks.put(localTask);
        await enqueueSync('task', task.id, 'CREATE', { ...task } as unknown as Record<string, unknown>);
        return localTask;
    },

    async update(id: string, changes: Partial<LocalTask>): Promise<void> {
        await localDb.tasks.update(id, { ...changes, _dirty: true });
        await enqueueSync('task', id, 'UPDATE', changes);
    },

    async delete(id: string): Promise<void> {
        const task = await localDb.tasks.get(id);
        if (task?._localOnly) {
            // Never synced — safe to hard delete
            await localDb.tasks.delete(id);
        } else {
            // Mark for sync then soft-delete
            await localDb.tasks.update(id, { _deletedLocally: true, _dirty: true });
            await enqueueSync('task', id, 'DELETE', {});
        }
    },

    async toggle(id: string): Promise<LocalTask | undefined> {
        const task = await localDb.tasks.get(id);
        if (!task) return undefined;

        const statusCycle: Record<string, string> = {
            PENDING: 'IN_PROGRESS',
            IN_PROGRESS: 'COMPLETED',
            COMPLETED: 'PENDING',
        };
        const newStatus = statusCycle[task.status] as LocalTask['status'];
        await localDb.tasks.update(id, { status: newStatus, _dirty: true });
        await enqueueSync('task', id, 'TOGGLE', { status: newStatus });
        return { ...task, status: newStatus };
    },

    /**
     * Bulk upsert tasks from server response (hydration).
     */
    async hydrate(tasks: LocalTask[]): Promise<void> {
        for (const task of tasks) {
            const existing = await localDb.tasks.get(task.id);
            // Don't overwrite locally-dirty data
            if (existing?._dirty) continue;
            await localDb.tasks.put({
                ...task,
                _localOnly: false,
                _dirty: false,
                _lastSyncedAt: new Date().toISOString(),
            });
        }
    },
};

// ─── Category Operations (Local-First) ──────────────────────────────────────────

export const localCategories = {
    async getAll(userId?: string): Promise<LocalCategory[]> {
        if (userId) {
            return localDb.categories.where('userId').equals(userId).toArray();
        }
        return localDb.categories.toArray();
    },

    async create(category: LocalCategory): Promise<LocalCategory> {
        const local: LocalCategory = { ...category, _localOnly: true, _dirty: true };
        await localDb.categories.put(local);
        await enqueueSync('category', category.id, 'CREATE', { ...category } as unknown as Record<string, unknown>);
        return local;
    },

    async update(id: string, changes: Partial<LocalCategory>): Promise<void> {
        await localDb.categories.update(id, { ...changes, _dirty: true });
        await enqueueSync('category', id, 'UPDATE', changes);
    },

    async delete(id: string): Promise<void> {
        await localDb.categories.delete(id);
        await enqueueSync('category', id, 'DELETE', {});
    },

    async hydrate(categories: LocalCategory[]): Promise<void> {
        for (const cat of categories) {
            const existing = await localDb.categories.get(cat.id);
            if (existing?._dirty) continue;
            await localDb.categories.put({ ...cat, _localOnly: false, _dirty: false });
        }
    },
};

// ─── Sync Queue ─────────────────────────────────────────────────────────────────

async function enqueueSync(
    entityType: SyncQueueItem['entityType'],
    entityId: string,
    action: SyncAction,
    payload: Record<string, unknown>
): Promise<void> {
    await localDb.syncQueue.add({
        entityType,
        entityId,
        action,
        payload,
        createdAt: new Date().toISOString(),
        retryCount: 0,
    });
}

export const syncQueue = {
    async getPending(): Promise<SyncQueueItem[]> {
        return localDb.syncQueue.orderBy('createdAt').toArray();
    },

    async remove(id: number): Promise<void> {
        await localDb.syncQueue.delete(id);
    },

    async markRetry(id: number, error: string): Promise<void> {
        const item = await localDb.syncQueue.get(id);
        if (item) {
            await localDb.syncQueue.update(id, {
                retryCount: item.retryCount + 1,
                lastError: error,
            });
        }
    },

    async clear(): Promise<void> {
        await localDb.syncQueue.clear();
    },

    async count(): Promise<number> {
        return localDb.syncQueue.count();
    },
};

// ─── Clear all local data (e.g., on logout) ────────────────────────────────────

export async function clearLocalData(): Promise<void> {
    await localDb.tasks.clear();
    await localDb.categories.clear();
    await localDb.habits.clear();
    await localDb.habitLogs.clear();
    await localDb.timetableEntries.clear();
    await localDb.syncQueue.clear();
}

// ─── Habit Operations (Local-First) ─────────────────────────────────────────────

export const localHabits = {
    async getAll(filters?: { userId?: string }): Promise<LocalHabit[]> {
        let results: LocalHabit[];
        if (filters?.userId) {
            results = await localDb.habits.where('userId').equals(filters.userId).toArray();
        } else {
            results = await localDb.habits.toArray();
        }
        return results.filter((h) => !h._deletedLocally);
    },

    async getById(id: string): Promise<LocalHabit | undefined> {
        return localDb.habits.get(id);
    },

    async create(habit: LocalHabit): Promise<LocalHabit> {
        const local: LocalHabit = { ...habit, _localOnly: true, _dirty: true };
        await localDb.habits.put(local);
        await enqueueSync('habit', habit.id, 'CREATE', { ...habit } as unknown as Record<string, unknown>);
        return local;
    },

    async update(id: string, changes: Partial<LocalHabit>): Promise<void> {
        await localDb.habits.update(id, { ...changes, _dirty: true });
        await enqueueSync('habit', id, 'UPDATE', changes);
    },

    async delete(id: string): Promise<void> {
        const habit = await localDb.habits.get(id);
        if (habit?._localOnly) {
            await localDb.habits.delete(id);
        } else {
            await localDb.habits.update(id, { _deletedLocally: true, _dirty: true });
            await enqueueSync('habit', id, 'DELETE', {});
        }
    },

    async hydrate(habits: LocalHabit[]): Promise<void> {
        for (const habit of habits) {
            const existing = await localDb.habits.get(habit.id);
            if (existing?._dirty) continue;
            await localDb.habits.put({
                ...habit,
                _localOnly: false,
                _dirty: false,
                _lastSyncedAt: new Date().toISOString(),
            });
        }
    },
};

// ─── Habit Log Operations (Local-First) ─────────────────────────────────────────

export const localHabitLogs = {
    async getByHabitId(habitId: string): Promise<LocalHabitLog[]> {
        return localDb.habitLogs.where('habitId').equals(habitId).toArray();
    },

    async create(log: LocalHabitLog): Promise<LocalHabitLog> {
        const local: LocalHabitLog = { ...log, _localOnly: true, _dirty: true };
        await localDb.habitLogs.put(local);
        await enqueueSync('habitLog', log.id, 'LOG', { ...log } as unknown as Record<string, unknown>);
        return local;
    },

    async hydrate(logs: LocalHabitLog[]): Promise<void> {
        for (const log of logs) {
            const existing = await localDb.habitLogs.get(log.id);
            if (existing?._dirty) continue;
            await localDb.habitLogs.put({
                ...log,
                _localOnly: false,
                _dirty: false,
                _lastSyncedAt: new Date().toISOString(),
            });
        }
    },
};

// ─── Timetable Operations (Read-Only Local Cache) ───────────────────────────────

export const localTimetable = {
    async getAll(filters?: { userId?: string; dayOfWeek?: number }): Promise<LocalTimetableEntry[]> {
        let results: LocalTimetableEntry[];
        if (filters?.userId) {
            results = await localDb.timetableEntries.where('userId').equals(filters.userId).toArray();
        } else {
            results = await localDb.timetableEntries.toArray();
        }

        if (filters?.dayOfWeek !== undefined) {
            results = results.filter((e) => e.dayOfWeek === filters.dayOfWeek);
        }

        return results.sort((a, b) => a.startTime.localeCompare(b.startTime));
    },

    async hydrate(entries: LocalTimetableEntry[]): Promise<void> {
        // Timetable is server-authoritative; always overwrite local
        await localDb.timetableEntries.clear();
        for (const entry of entries) {
            await localDb.timetableEntries.put({
                ...entry,
                _lastSyncedAt: new Date().toISOString(),
            });
        }
    },
};
