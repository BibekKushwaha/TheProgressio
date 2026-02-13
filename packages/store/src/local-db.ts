/**
 * Local-First Persistence Layer using Dexie.js (IndexedDB)
 *
 * CRDT upgrade:
 * - operation queue includes opId/clientId/lamport/vectorClock/tombstone metadata
 * - sync cursor persisted for deterministic push/pull replay
 * - local entities track last applied lamport/vector metadata
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
    _localOnly?: boolean;
    _dirty?: boolean;
    _deletedLocally?: boolean;
    _lastSyncedAt?: string;
    _syncLamportTs?: number;
    _syncVectorClock?: Record<string, number> | null;
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
    _syncLamportTs?: number;
    _syncVectorClock?: Record<string, number> | null;
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
    userId: string;
    title: string;
    frequency?: string | null;
    targetCount?: number | null;
    isActive?: boolean;
}

export interface LocalHabitLog {
    id: string;
    habitId: string;
    userId: string;
    completedValue: number;
    occurredAt: string;
}

export interface LocalTimetableEntry {
    id: string;
    userId: string;
    dayOfWeek: number;
    subject: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
}

export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
export type SyncEntityType = 'task' | 'category' | 'subtask';
export type VectorClock = Record<string, number>;

export interface SyncQueueItem {
    id?: number;
    opId: string;
    clientId: string;
    entityType: SyncEntityType;
    entityId: string;
    action: SyncAction;
    payload: Record<string, unknown>;
    lamportTs: number;
    vectorClock: VectorClock;
    tombstone: boolean;
    createdAt: string;
    retryCount: number;
    lastError?: string;
}

interface SyncMetaEntry {
    key: string;
    value: string;
}

export interface RemoteSyncOperation {
    id: number;
    clientId: string;
    opId: string;
    entityType: 'task' | 'category';
    entityId: string;
    action: 'UPSERT' | 'DELETE';
    payload: Record<string, unknown> | null;
    lamportTs: number;
    vectorClock: VectorClock | null;
    tombstone: boolean;
    createdAt: string;
}

// ─── Dexie Database Definition ──────────────────────────────────────────────────

class TransitionDB extends Dexie {
    tasks!: Table<LocalTask, string>;
    categories!: Table<LocalCategory, string>;
    syncQueue!: Table<SyncQueueItem, number>;
    syncMeta!: Table<SyncMetaEntry, string>;

    constructor() {
        super('TransitionLocalDB');

        this.version(1).stores({
            tasks: 'id, userId, status, priority, categoryId, dueDate, _dirty, _localOnly',
            categories: 'id, userId, name, _dirty, _localOnly',
            syncQueue: '++id, entityType, entityId, action, createdAt',
        });

        this.version(2).stores({
            tasks: 'id, userId, status, priority, categoryId, dueDate, _dirty, _localOnly, _syncLamportTs',
            categories: 'id, userId, name, _dirty, _localOnly, _syncLamportTs',
            syncQueue: '++id, opId, clientId, entityType, entityId, action, lamportTs, createdAt',
            syncMeta: '&key',
        });
    }
}

export const localDb = new TransitionDB();

// ─── Sync Meta Keys ─────────────────────────────────────────────────────────────

const SYNC_CLIENT_ID_KEY = 'sync:client-id';
const SYNC_LAMPORT_KEY = 'sync:lamport-ts';
const SYNC_VECTOR_CLOCK_KEY = 'sync:vector-clock';
const SYNC_CURSOR_KEY = 'sync:cursor';

const makeClientId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readMeta = async (key: string): Promise<string | null> => {
    const row = await localDb.syncMeta.get(key);
    return row?.value ?? null;
};

const writeMeta = async (key: string, value: string): Promise<void> => {
    await localDb.syncMeta.put({ key, value });
};

const readLamportClock = async (): Promise<number> => {
    const raw = await readMeta(SYNC_LAMPORT_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const writeLamportClock = async (value: number): Promise<void> => {
    await writeMeta(SYNC_LAMPORT_KEY, String(Math.max(0, Math.floor(value))));
};

const readVectorClock = async (): Promise<VectorClock> => {
    const raw = await readMeta(SYNC_VECTOR_CLOCK_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isObject(parsed)) return {};
        const vectorClock: VectorClock = {};
        for (const [key, val] of Object.entries(parsed)) {
            if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
                vectorClock[key] = Math.floor(val);
            }
        }
        return vectorClock;
    } catch {
        return {};
    }
};

const writeVectorClock = async (vectorClock: VectorClock): Promise<void> => {
    await writeMeta(SYNC_VECTOR_CLOCK_KEY, JSON.stringify(vectorClock));
};

const cloneVectorClock = (vectorClock: VectorClock): VectorClock => ({ ...vectorClock });

const mergeVectorClock = (base: VectorClock, incoming: VectorClock): VectorClock => {
    const merged: VectorClock = { ...base };
    for (const [node, clock] of Object.entries(incoming)) {
        const previous = merged[node] ?? 0;
        if (clock > previous) merged[node] = clock;
    }
    return merged;
};

export interface LocalOperationMeta {
    opId: string;
    clientId: string;
    lamportTs: number;
    vectorClock: VectorClock;
}

const allocateLocalOperationMeta = async (): Promise<LocalOperationMeta> => {
    const clientId = await getSyncClientId();

    const currentLamport = await readLamportClock();
    const lamportTs = currentLamport + 1;
    await writeLamportClock(lamportTs);

    const currentVectorClock = await readVectorClock();
    const nextVectorClock = cloneVectorClock(currentVectorClock);
    nextVectorClock[clientId] = (nextVectorClock[clientId] ?? 0) + 1;
    await writeVectorClock(nextVectorClock);

    const opId = `${clientId}:${lamportTs}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

    return {
        opId,
        clientId,
        lamportTs,
        vectorClock: nextVectorClock,
    };
};

export const getSyncClientId = async (): Promise<string> => {
    const existing = await readMeta(SYNC_CLIENT_ID_KEY);
    if (existing) return existing;

    const created = makeClientId();
    await writeMeta(SYNC_CLIENT_ID_KEY, created);
    return created;
};

export const getSyncCursor = async (): Promise<number> => {
    const raw = await readMeta(SYNC_CURSOR_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const setSyncCursor = async (cursor: number): Promise<void> => {
    const normalized = Number.isFinite(cursor) && cursor >= 0 ? Math.floor(cursor) : 0;
    await writeMeta(SYNC_CURSOR_KEY, String(normalized));
};

export const observeRemoteClock = async (lamportTs: number, vectorClock: VectorClock | null): Promise<void> => {
    const currentLamport = await readLamportClock();
    if (lamportTs > currentLamport) {
        await writeLamportClock(lamportTs);
    }

    if (vectorClock) {
        const currentVector = await readVectorClock();
        const merged = mergeVectorClock(currentVector, vectorClock);
        await writeVectorClock(merged);
    }
};

const isValidTaskStatus = (value: unknown): value is LocalTask['status'] =>
    value === 'PENDING' || value === 'IN_PROGRESS' || value === 'COMPLETED';

const isValidTaskPriority = (value: unknown): value is LocalTask['priority'] =>
    value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';

const normalizeTaskForRemote = (
    existing: LocalTask | undefined,
    payload: Record<string, unknown> | null,
    lamportTs: number,
    vectorClock: VectorClock | null,
    createdAt: string
): LocalTask | null => {
    const source = payload ?? {};
    const id = typeof source.id === 'string' ? source.id : existing?.id;
    const userId = typeof source.userId === 'string' ? source.userId : existing?.userId;

    if (!id || !userId) return null;

    return {
        id,
        title: typeof source.title === 'string' ? source.title : existing?.title ?? 'Untitled Task',
        description: typeof source.description === 'string'
            ? source.description
            : source.description === null
                ? null
                : existing?.description ?? null,
        status: isValidTaskStatus(source.status) ? source.status : existing?.status ?? 'PENDING',
        priority: isValidTaskPriority(source.priority) ? source.priority : existing?.priority ?? 'MEDIUM',
        dueDate: typeof source.dueDate === 'string'
            ? source.dueDate
            : source.dueDate === null
                ? null
                : existing?.dueDate ?? null,
        isRecurring: typeof source.isRecurring === 'boolean' ? source.isRecurring : existing?.isRecurring ?? false,
        userId,
        categoryId: typeof source.categoryId === 'string'
            ? source.categoryId
            : source.categoryId === null
                ? null
                : existing?.categoryId ?? null,
        _localOnly: false,
        _dirty: false,
        _deletedLocally: false,
        _lastSyncedAt: createdAt,
        _syncLamportTs: lamportTs,
        _syncVectorClock: vectorClock,
    };
};

const normalizeCategoryForRemote = (
    existing: LocalCategory | undefined,
    payload: Record<string, unknown> | null,
    entityId: string,
    lamportTs: number,
    vectorClock: VectorClock | null
): LocalCategory | null => {
    const source = payload ?? {};
    const userId = typeof source.userId === 'string' ? source.userId : existing?.userId;
    if (!userId) return null;

    return {
        id: typeof source.id === 'string' ? source.id : existing?.id ?? entityId,
        name: typeof source.name === 'string' && source.name.trim().length > 0
            ? source.name.trim()
            : existing?.name ?? `Category ${entityId.slice(0, 6)}`,
        colorCode: typeof source.colorCode === 'string' && source.colorCode.trim().length > 0
            ? source.colorCode
            : existing?.colorCode ?? '#3B82F6',
        icon: typeof source.icon === 'string' ? source.icon : source.icon === null ? null : existing?.icon ?? null,
        userId,
        _localOnly: false,
        _dirty: false,
        _syncLamportTs: lamportTs,
        _syncVectorClock: vectorClock,
    };
};

export const applyRemoteSyncOperation = async (operation: RemoteSyncOperation): Promise<void> => {
    await observeRemoteClock(operation.lamportTs, operation.vectorClock);

    if (operation.entityType === 'task') {
        const existing = await localDb.tasks.get(operation.entityId);
        const localLamport = existing?._syncLamportTs ?? 0;

        if (existing?._dirty && localLamport > operation.lamportTs) {
            return;
        }

        if (operation.action === 'DELETE' || operation.tombstone) {
            await localDb.tasks.delete(operation.entityId);
            return;
        }

        const normalized = normalizeTaskForRemote(
            existing,
            operation.payload,
            operation.lamportTs,
            operation.vectorClock,
            operation.createdAt,
        );
        if (!normalized) return;

        await localDb.tasks.put(normalized);
        return;
    }

    const existingCategory = await localDb.categories.get(operation.entityId);
    const localLamport = existingCategory?._syncLamportTs ?? 0;

    if (existingCategory?._dirty && localLamport > operation.lamportTs) {
        return;
    }

    if (operation.action === 'DELETE' || operation.tombstone) {
        await localDb.categories.delete(operation.entityId);
        return;
    }

    const normalizedCategory = normalizeCategoryForRemote(
        existingCategory,
        operation.payload,
        operation.entityId,
        operation.lamportTs,
        operation.vectorClock,
    );

    if (!normalizedCategory) return;
    await localDb.categories.put(normalizedCategory);
};

// ─── Task Operations (Local-First) ─────────────────────────────────────────────

export const localTasks = {
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

    async create(task: LocalTask): Promise<LocalTask> {
        const operation = await enqueueSync('task', task.id, 'CREATE', { ...task } as unknown as Record<string, unknown>);

        const localTask: LocalTask = {
            ...task,
            _localOnly: true,
            _dirty: true,
            _syncLamportTs: operation.lamportTs,
            _syncVectorClock: operation.vectorClock,
        };

        await localDb.tasks.put(localTask);
        return localTask;
    },

    async update(id: string, changes: Partial<LocalTask>): Promise<void> {
        const operation = await enqueueSync('task', id, 'UPDATE', changes as Record<string, unknown>);

        await localDb.tasks.update(id, {
            ...changes,
            _dirty: true,
            _syncLamportTs: operation.lamportTs,
            _syncVectorClock: operation.vectorClock,
        });
    },

    async delete(id: string): Promise<void> {
        const task = await localDb.tasks.get(id);
        if (task?._localOnly) {
            await localDb.tasks.delete(id);
            await syncQueue.removeByEntity('task', id);
            return;
        }

        const operation = await enqueueSync('task', id, 'DELETE', {});
        await localDb.tasks.update(id, {
            _deletedLocally: true,
            _dirty: true,
            _syncLamportTs: operation.lamportTs,
            _syncVectorClock: operation.vectorClock,
        });
    },

    async toggle(id: string): Promise<LocalTask | undefined> {
        const task = await localDb.tasks.get(id);
        if (!task) return undefined;

        const statusCycle: Record<LocalTask['status'], LocalTask['status']> = {
            PENDING: 'IN_PROGRESS',
            IN_PROGRESS: 'COMPLETED',
            COMPLETED: 'PENDING',
        };
        const newStatus = statusCycle[task.status];

        const operation = await enqueueSync('task', id, 'TOGGLE', { status: newStatus });
        await localDb.tasks.update(id, {
            status: newStatus,
            _dirty: true,
            _syncLamportTs: operation.lamportTs,
            _syncVectorClock: operation.vectorClock,
        });

        return { ...task, status: newStatus };
    },

    async hydrate(tasks: LocalTask[]): Promise<void> {
        for (const task of tasks) {
            const existing = await localDb.tasks.get(task.id);
            const incomingLamport = task._syncLamportTs ?? 0;
            const existingLamport = existing?._syncLamportTs ?? 0;

            if (existing?._dirty && existingLamport >= incomingLamport) continue;

            await localDb.tasks.put({
                ...task,
                _localOnly: false,
                _dirty: false,
                _deletedLocally: false,
                _lastSyncedAt: new Date().toISOString(),
                _syncLamportTs: incomingLamport,
                _syncVectorClock: task._syncVectorClock ?? null,
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
        const operation = await enqueueSync('category', category.id, 'CREATE', { ...category } as unknown as Record<string, unknown>);

        const local: LocalCategory = {
            ...category,
            _localOnly: true,
            _dirty: true,
            _syncLamportTs: operation.lamportTs,
            _syncVectorClock: operation.vectorClock,
        };

        await localDb.categories.put(local);
        return local;
    },

    async update(id: string, changes: Partial<LocalCategory>): Promise<void> {
        const operation = await enqueueSync('category', id, 'UPDATE', changes as Record<string, unknown>);

        await localDb.categories.update(id, {
            ...changes,
            _dirty: true,
            _syncLamportTs: operation.lamportTs,
            _syncVectorClock: operation.vectorClock,
        });
    },

    async delete(id: string): Promise<void> {
        const existing = await localDb.categories.get(id);

        if (existing?._localOnly) {
            await localDb.categories.delete(id);
            await syncQueue.removeByEntity('category', id);
            return;
        }

        const operation = await enqueueSync('category', id, 'DELETE', {});

        await localDb.categories.update(id, {
            _dirty: true,
            _syncLamportTs: operation.lamportTs,
            _syncVectorClock: operation.vectorClock,
        });
    },

    async hydrate(categories: LocalCategory[]): Promise<void> {
        for (const category of categories) {
            const existing = await localDb.categories.get(category.id);
            const incomingLamport = category._syncLamportTs ?? 0;
            const localLamport = existing?._syncLamportTs ?? 0;

            if (existing?._dirty && localLamport >= incomingLamport) continue;

            await localDb.categories.put({
                ...category,
                _localOnly: false,
                _dirty: false,
                _syncLamportTs: incomingLamport,
                _syncVectorClock: category._syncVectorClock ?? null,
            });
        }
    },
};

// ─── Compatibility Adapters (non-persistent placeholders) ────────────────────

export const localHabits = {
    async getAll(_filters?: { userId?: string }): Promise<LocalHabit[]> {
        return [];
    },
};

export const localHabitLogs = {
    async getByHabitId(_habitId: string): Promise<LocalHabitLog[]> {
        return [];
    },
};

export const localTimetable = {
    async getAll(_filters?: { userId?: string; dayOfWeek?: number }): Promise<LocalTimetableEntry[]> {
        return [];
    },
};

// ─── Sync Queue ─────────────────────────────────────────────────────────────────

const enqueueSync = async (
    entityType: SyncQueueItem['entityType'],
    entityId: string,
    action: SyncAction,
    payload: Record<string, unknown>,
): Promise<LocalOperationMeta> => {
    const operationMeta = await allocateLocalOperationMeta();

    await localDb.syncQueue.add({
        opId: operationMeta.opId,
        clientId: operationMeta.clientId,
        entityType,
        entityId,
        action,
        payload,
        lamportTs: operationMeta.lamportTs,
        vectorClock: operationMeta.vectorClock,
        tombstone: action === 'DELETE',
        createdAt: new Date().toISOString(),
        retryCount: 0,
    });

    return operationMeta;
};

export const syncQueue = {
    async getPending(): Promise<SyncQueueItem[]> {
        const items = await localDb.syncQueue.toArray();
        return items.sort((a, b) => {
            if (a.lamportTs !== b.lamportTs) return a.lamportTs - b.lamportTs;
            return a.createdAt.localeCompare(b.createdAt);
        });
    },

    async remove(id: number): Promise<void> {
        await localDb.syncQueue.delete(id);
    },

    async removeByOpIds(opIds: string[]): Promise<void> {
        if (opIds.length === 0) return;
        const lookup = new Set(opIds);
        const all = await localDb.syncQueue.toArray();
        const toDelete = all.filter((item) => lookup.has(item.opId)).map((item) => item.id!).filter(Boolean);
        if (toDelete.length > 0) {
            await localDb.syncQueue.bulkDelete(toDelete);
        }
    },

    async removeByEntity(entityType: SyncEntityType, entityId: string): Promise<void> {
        const all = await localDb.syncQueue.toArray();
        const toDelete = all
            .filter((item) => item.entityType === entityType && item.entityId === entityId)
            .map((item) => item.id!)
            .filter(Boolean);

        if (toDelete.length > 0) {
            await localDb.syncQueue.bulkDelete(toDelete);
        }
    },

    async markRetry(id: number, error: string): Promise<void> {
        const item = await localDb.syncQueue.get(id);
        if (!item) return;

        await localDb.syncQueue.update(id, {
            retryCount: item.retryCount + 1,
            lastError: error,
        });
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
    await localDb.syncQueue.clear();
    await localDb.syncMeta.clear();
}
