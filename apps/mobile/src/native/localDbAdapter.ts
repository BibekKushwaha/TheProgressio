/**
 * React Native local-first persistence (SQLite)
 *
 * - Stores tasks + categories locally (expo-sqlite)
 * - Queues CRDT-ish ops (lamport + vectorClock) for deterministic sync
 * - Persists sync cursor + clocks in sync_meta
 */
import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';
import type { Task, Category } from '@repo/store';

export type SyncEntityType = 'task' | 'category';
export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
export type VectorClock = Record<string, number>;

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
  lastError?: string | null;
}

// ─── Online status (NetInfo) ────────────────────────────────────────────────

let _isOnline = true;
NetInfo.addEventListener((state) => {
  _isOnline = !!(state.isConnected && state.isInternetReachable);
});
export const isOnline = (): boolean => _isOnline;

// ─── Tiny event bus for UI refresh ──────────────────────────────────────────

type Listener = () => void;
const taskListeners = new Set<Listener>();
const categoryListeners = new Set<Listener>();

function emitTasksChanged(): void {
  taskListeners.forEach((fn) => fn());
}

function emitCategoriesChanged(): void {
  categoryListeners.forEach((fn) => fn());
}

export const localEvents = {
  onTasksChanged(listener: Listener): () => void {
    taskListeners.add(listener);
    return () => taskListeners.delete(listener);
  },
  onCategoriesChanged(listener: Listener): () => void {
    categoryListeners.add(listener);
    return () => categoryListeners.delete(listener);
  },
};

// ─── SQLite bootstrap ───────────────────────────────────────────────────────

const DB_NAME = 'TransitionLocalDB.sqlite';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        colorCode TEXT NOT NULL,
        icon TEXT,
        localOnly INTEGER NOT NULL DEFAULT 0,
        dirty INTEGER NOT NULL DEFAULT 0,
        syncLamportTs INTEGER NOT NULL DEFAULT 0,
        syncVectorClock TEXT,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_categories_userId ON categories(userId);

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        dueDate TEXT,
        isRecurring INTEGER NOT NULL DEFAULT 0,
        effort TEXT,
        categoryId TEXT,
        subtasksJson TEXT,
        attachmentsJson TEXT,
        localOnly INTEGER NOT NULL DEFAULT 0,
        dirty INTEGER NOT NULL DEFAULT 0,
        deletedLocally INTEGER NOT NULL DEFAULT 0,
        lastSyncedAt TEXT,
        syncLamportTs INTEGER NOT NULL DEFAULT 0,
        syncVectorClock TEXT,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_userId ON tasks(userId);
      CREATE INDEX IF NOT EXISTS idx_tasks_categoryId ON tasks(categoryId);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opId TEXT NOT NULL UNIQUE,
        clientId TEXT NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        lamportTs INTEGER NOT NULL,
        vectorClock TEXT NOT NULL,
        tombstone INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        retryCount INTEGER NOT NULL DEFAULT 0,
        lastError TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entityType, entityId);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_lamport ON sync_queue(lamportTs, createdAt);
    `);

    return db;
  })();

  return dbPromise;
}

export async function initLocalDb(): Promise<void> {
  await getDb();
}

// ─── Meta helpers ───────────────────────────────────────────────────────────

const SYNC_CLIENT_ID_KEY = 'sync:client-id';
const SYNC_LAMPORT_KEY = 'sync:lamport-ts';
const SYNC_VECTOR_CLOCK_KEY = 'sync:vector-clock';
const SYNC_CURSOR_KEY = 'sync:cursor';

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const safeParseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

async function readMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ? LIMIT 1',
    [key],
  );
  return row?.value ?? null;
}

async function writeMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sync_meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  );
}

function makeClientId(): string {
  const maybeCrypto = (globalThis as any)?.crypto;
  if (maybeCrypto?.randomUUID) {
    return maybeCrypto.randomUUID();
  }
  return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getSyncClientId(): Promise<string> {
  const existing = await readMeta(SYNC_CLIENT_ID_KEY);
  if (existing) return existing;
  const created = makeClientId();
  await writeMeta(SYNC_CLIENT_ID_KEY, created);
  return created;
}

async function readLamportClock(): Promise<number> {
  const raw = await readMeta(SYNC_LAMPORT_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function writeLamportClock(value: number): Promise<void> {
  await writeMeta(SYNC_LAMPORT_KEY, String(Math.max(0, Math.floor(value))));
}

async function readVectorClock(): Promise<VectorClock> {
  const raw = await readMeta(SYNC_VECTOR_CLOCK_KEY);
  const parsed = safeParseJson<unknown>(raw);
  if (!isObject(parsed)) return {};

  const vector: VectorClock = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      vector[key] = Math.floor(val);
    }
  }
  return vector;
}

async function writeVectorClock(vectorClock: VectorClock): Promise<void> {
  await writeMeta(SYNC_VECTOR_CLOCK_KEY, JSON.stringify(vectorClock));
}

const cloneVectorClock = (vectorClock: VectorClock): VectorClock => ({ ...vectorClock });

const mergeVectorClock = (base: VectorClock, incoming: VectorClock): VectorClock => {
  const merged: VectorClock = { ...base };
  for (const [node, clock] of Object.entries(incoming)) {
    const previous = merged[node] ?? 0;
    if (clock > previous) merged[node] = clock;
  }
  return merged;
};

export async function observeRemoteClock(lamportTs: number, vectorClock: VectorClock | null): Promise<void> {
  const currentLamport = await readLamportClock();
  if (lamportTs > currentLamport) {
    await writeLamportClock(lamportTs);
  }

  if (vectorClock) {
    const current = await readVectorClock();
    await writeVectorClock(mergeVectorClock(current, vectorClock));
  }
}

export async function getSyncCursor(): Promise<number> {
  const raw = await readMeta(SYNC_CURSOR_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function setSyncCursor(cursor: number): Promise<void> {
  const normalized = Number.isFinite(cursor) && cursor >= 0 ? Math.floor(cursor) : 0;
  await writeMeta(SYNC_CURSOR_KEY, String(normalized));
}

export interface LocalOperationMeta {
  opId: string;
  clientId: string;
  lamportTs: number;
  vectorClock: VectorClock;
}

async function allocateLocalOperationMeta(): Promise<LocalOperationMeta> {
  const clientId = await getSyncClientId();

  const currentLamport = await readLamportClock();
  const lamportTs = currentLamport + 1;
  await writeLamportClock(lamportTs);

  const currentVector = await readVectorClock();
  const nextVector = cloneVectorClock(currentVector);
  nextVector[clientId] = (nextVector[clientId] ?? 0) + 1;
  await writeVectorClock(nextVector);

  const opId = `${clientId}:${lamportTs}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  return { opId, clientId, lamportTs, vectorClock: nextVector };
}

// ─── Sync queue ─────────────────────────────────────────────────────────────

export const syncQueue = {
  async getPending(): Promise<SyncQueueItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM sync_queue ORDER BY lamportTs ASC, createdAt ASC');
    return rows.map((row) => ({
      id: row.id,
      opId: String(row.opId),
      clientId: String(row.clientId),
      entityType: row.entityType as SyncEntityType,
      entityId: String(row.entityId),
      action: row.action as SyncAction,
      payload: safeParseJson<Record<string, unknown>>(row.payload) ?? {},
      lamportTs: Number(row.lamportTs) || 0,
      vectorClock: safeParseJson<VectorClock>(row.vectorClock) ?? {},
      tombstone: Boolean(row.tombstone),
      createdAt: String(row.createdAt),
      retryCount: Number(row.retryCount) || 0,
      lastError: typeof row.lastError === 'string' ? row.lastError : null,
    }));
  },

  async add(
    entityType: SyncEntityType,
    entityId: string,
    action: SyncAction,
    payload: Record<string, unknown>,
  ): Promise<LocalOperationMeta> {
    const meta = await allocateLocalOperationMeta();
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sync_queue(opId, clientId, entityType, entityId, action, payload, lamportTs, vectorClock, tombstone, createdAt, retryCount)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        meta.opId,
        meta.clientId,
        entityType,
        entityId,
        action,
        JSON.stringify(payload ?? {}),
        meta.lamportTs,
        JSON.stringify(meta.vectorClock ?? {}),
        action === 'DELETE' ? 1 : 0,
        new Date().toISOString(),
      ],
    );
    return meta;
  },

  async removeByOpIds(opIds: string[]): Promise<void> {
    if (opIds.length === 0) return;
    const db = await getDb();
    const placeholders = opIds.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM sync_queue WHERE opId IN (${placeholders})`, opIds);
  },

  async removeByEntity(entityType: SyncEntityType, entityId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE entityType = ? AND entityId = ?', [entityType, entityId]);
  },

  async markRetry(id: number, error: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'UPDATE sync_queue SET retryCount = retryCount + 1, lastError = ? WHERE id = ?',
      [error, id],
    );
  },

  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue');
  },

  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue');
    return Number(row?.count) || 0;
  },
};

// ─── Local entities ─────────────────────────────────────────────────────────

function toBoolInt(value: boolean | number | null | undefined): number {
  return value ? 1 : 0;
}

function parseBool(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}

function parseVectorClockText(value: unknown): VectorClock | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = safeParseJson<unknown>(value);
  if (!isObject(parsed)) return null;
  const result: VectorClock = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      result[key] = Math.floor(val);
    }
  }
  return Object.keys(result).length ? result : null;
}

function normalizeTaskRow(row: any, category?: Category | null): Task & {
  _localOnly?: boolean;
  _dirty?: boolean;
  _deletedLocally?: boolean;
  _syncLamportTs?: number;
  _syncVectorClock?: VectorClock | null;
} {
  const subtasks = safeParseJson<any[]>(row.subtasksJson) ?? undefined;
  const attachments = safeParseJson<any[]>(row.attachmentsJson) ?? undefined;
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : row.description === null ? null : null,
    status: row.status as any,
    priority: row.priority as any,
    dueDate: typeof row.dueDate === 'string' ? row.dueDate : row.dueDate === null ? null : null,
    isRecurring: parseBool(row.isRecurring),
    effort: typeof row.effort === 'string' ? row.effort : row.effort === null ? null : null,
    userId: String(row.userId),
    categoryId: typeof row.categoryId === 'string' ? row.categoryId : row.categoryId === null ? null : null,
    category: category ?? null,
    subtasks,
    attachments,
    _localOnly: parseBool(row.localOnly),
    _dirty: parseBool(row.dirty),
    _deletedLocally: parseBool(row.deletedLocally),
    _syncLamportTs: Number(row.syncLamportTs) || 0,
    _syncVectorClock: parseVectorClockText(row.syncVectorClock),
  };
}

function normalizeCategoryRow(row: any): Category & {
  _localOnly?: boolean;
  _dirty?: boolean;
  _syncLamportTs?: number;
  _syncVectorClock?: VectorClock | null;
} {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    colorCode: String(row.colorCode ?? '#3B82F6'),
    icon: typeof row.icon === 'string' ? row.icon : row.icon === null ? null : null,
    userId: String(row.userId),
    _localOnly: parseBool(row.localOnly),
    _dirty: parseBool(row.dirty),
    _syncLamportTs: Number(row.syncLamportTs) || 0,
    _syncVectorClock: parseVectorClockText(row.syncVectorClock),
  };
}

function makeEntityId(prefix: string): string {
  const maybeCrypto = (globalThis as any)?.crypto;
  if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const localCategories = {
  onChange: localEvents.onCategoriesChanged,

  async getAll(userId: string): Promise<Category[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM categories WHERE userId = ? ORDER BY name ASC',
      [userId],
    );
    return rows.map((row) => normalizeCategoryRow(row));
  },

  async getById(id: string): Promise<Category | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
    return row ? normalizeCategoryRow(row) : null;
  },

  async create(params: { userId: string; name: string; colorCode?: string; icon?: string | null }): Promise<Category> {
    const id = makeEntityId('cat');
    const payload: Category = {
      id,
      userId: params.userId,
      name: params.name,
      colorCode: params.colorCode ?? '#3B82F6',
      icon: params.icon ?? null,
    };

    const operation = await syncQueue.add('category', id, 'CREATE', payload as any);
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO categories(id, userId, name, colorCode, icon, localOnly, dirty, syncLamportTs, syncVectorClock, updatedAt)
       VALUES(?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`,
      [
        payload.id,
        payload.userId,
        payload.name,
        payload.colorCode,
        payload.icon,
        operation.lamportTs,
        JSON.stringify(operation.vectorClock),
        new Date().toISOString(),
      ],
    );

    emitCategoriesChanged();
    return payload;
  },

  async update(id: string, userId: string, changes: Partial<Category>): Promise<void> {
    const operation = await syncQueue.add('category', id, 'UPDATE', changes as any);
    const db = await getDb();
    await db.runAsync(
      `UPDATE categories
       SET name = COALESCE(?, name),
           colorCode = COALESCE(?, colorCode),
           icon = COALESCE(?, icon),
           dirty = 1,
           syncLamportTs = ?,
           syncVectorClock = ?,
           updatedAt = ?
       WHERE id = ? AND userId = ?`,
      [
        (changes.name ?? null) as any,
        (changes.colorCode ?? null) as any,
        (changes.icon ?? null) as any,
        operation.lamportTs,
        JSON.stringify(operation.vectorClock),
        new Date().toISOString(),
        id,
        userId,
      ],
    );
    emitCategoriesChanged();
  },

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.getById(id);
    const db = await getDb();

    if ((existing as any)?._localOnly) {
      await db.runAsync('DELETE FROM categories WHERE id = ? AND userId = ?', [id, userId]);
      await syncQueue.removeByEntity('category', id);
      emitCategoriesChanged();
      return;
    }

    const operation = await syncQueue.add('category', id, 'DELETE', {});
    await db.runAsync(
      `UPDATE categories
       SET dirty = 1,
           syncLamportTs = ?,
           syncVectorClock = ?,
           updatedAt = ?
       WHERE id = ? AND userId = ?`,
      [operation.lamportTs, JSON.stringify(operation.vectorClock), new Date().toISOString(), id, userId],
    );
    emitCategoriesChanged();
  },

  async hydrate(categories: Array<Category & any>): Promise<void> {
    const db = await getDb();
    for (const category of categories) {
      await db.runAsync(
        `INSERT INTO categories(id, userId, name, colorCode, icon, localOnly, dirty, syncLamportTs, syncVectorClock, updatedAt)
         VALUES(?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           userId = excluded.userId,
           name = excluded.name,
           colorCode = excluded.colorCode,
           icon = excluded.icon,
           localOnly = 0,
           dirty = 0,
           syncLamportTs = MAX(syncLamportTs, excluded.syncLamportTs),
           syncVectorClock = excluded.syncVectorClock,
           updatedAt = excluded.updatedAt`,
        [
          category.id,
          category.userId,
          category.name,
          category.colorCode ?? '#3B82F6',
          (category.icon ?? null) as any,
          Number((category as any)._syncLamportTs ?? (category as any).syncLamportTs ?? 0) || 0,
          JSON.stringify((category as any)._syncVectorClock ?? null),
          new Date().toISOString(),
        ],
      );
    }
    emitCategoriesChanged();
  },
};

export const localTasks = {
  onChange: localEvents.onTasksChanged,

  async getAll(params: {
    userId: string;
    status?: string;
    priority?: string;
    categoryId?: string;
    search?: string;
  }): Promise<Task[]> {
    const db = await getDb();

    const where: string[] = ['t.userId = ? AND t.deletedLocally = 0'];
    const args: any[] = [params.userId];
    if (params.status) {
      where.push('t.status = ?');
      args.push(params.status);
    }
    if (params.priority) {
      where.push('t.priority = ?');
      args.push(params.priority);
    }
    if (params.categoryId) {
      where.push('t.categoryId = ?');
      args.push(params.categoryId);
    }
    if (params.search && params.search.trim()) {
      where.push('LOWER(t.title) LIKE ?');
      args.push(`%${params.search.toLowerCase()}%`);
    }

    const rows = await db.getAllAsync<any>(
      `SELECT t.*, c.id as c_id, c.name as c_name, c.colorCode as c_colorCode, c.icon as c_icon, c.userId as c_userId
       FROM tasks t
       LEFT JOIN categories c ON c.id = t.categoryId
       WHERE ${where.join(' AND ')}
       ORDER BY CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END, t.dueDate ASC, t.updatedAt DESC`,
      args,
    );

    return rows.map((row) => {
      const category =
        row.c_id
          ? ({
            id: String(row.c_id),
            name: String(row.c_name ?? ''),
            colorCode: String(row.c_colorCode ?? '#3B82F6'),
            icon: typeof row.c_icon === 'string' ? row.c_icon : row.c_icon === null ? null : null,
            userId: String(row.c_userId ?? params.userId),
          } satisfies Category)
          : null;
      return normalizeTaskRow(row, category);
    });
  },

  async getById(id: string): Promise<Task | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT t.*, c.id as c_id, c.name as c_name, c.colorCode as c_colorCode, c.icon as c_icon, c.userId as c_userId
       FROM tasks t
       LEFT JOIN categories c ON c.id = t.categoryId
       WHERE t.id = ? LIMIT 1`,
      [id],
    );
    if (!row) return null;
    const category =
      row.c_id
        ? ({
          id: String(row.c_id),
          name: String(row.c_name ?? ''),
          colorCode: String(row.c_colorCode ?? '#3B82F6'),
          icon: typeof row.c_icon === 'string' ? row.c_icon : row.c_icon === null ? null : null,
          userId: String(row.c_userId ?? row.userId),
        } satisfies Category)
        : null;
    return normalizeTaskRow(row, category);
  },

  async create(params: {
    userId: string;
    title: string;
    description?: string | null;
    priority?: string;
    categoryId?: string | null;
    dueDate?: string | null;
    isRecurring?: boolean;
    effort?: string | null;
  }): Promise<string> {
    const id = makeEntityId('task');

    const payload: Task = {
      id,
      userId: params.userId,
      title: params.title,
      description: params.description ?? null,
      status: 'PENDING' as any,
      priority: (params.priority ?? 'MEDIUM') as any,
      dueDate: params.dueDate ?? null,
      isRecurring: Boolean(params.isRecurring),
      effort: params.effort ?? null,
      categoryId: params.categoryId ?? null,
      category: null,
      subtasks: [],
      attachments: [],
    };

    const operation = await syncQueue.add('task', id, 'CREATE', payload as any);
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO tasks(
        id, userId, title, description, status, priority, dueDate, isRecurring, effort, categoryId,
        subtasksJson, attachmentsJson, localOnly, dirty, deletedLocally, lastSyncedAt, syncLamportTs, syncVectorClock, updatedAt
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, NULL, ?, ?, ?)`,
      [
        payload.id,
        payload.userId,
        payload.title,
        payload.description,
        payload.status,
        payload.priority,
        payload.dueDate,
        toBoolInt(payload.isRecurring),
        payload.effort,
        payload.categoryId,
        JSON.stringify(payload.subtasks ?? []),
        JSON.stringify(payload.attachments ?? []),
        operation.lamportTs,
        JSON.stringify(operation.vectorClock),
        new Date().toISOString(),
      ],
    );

    emitTasksChanged();
    return id;
  },

  async update(id: string, userId: string, changes: Partial<Task>): Promise<void> {
    const operation = await syncQueue.add('task', id, 'UPDATE', changes as any);
    const db = await getDb();

    await db.runAsync(
      `UPDATE tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           dueDate = COALESCE(?, dueDate),
           isRecurring = COALESCE(?, isRecurring),
           effort = COALESCE(?, effort),
           categoryId = COALESCE(?, categoryId),
           dirty = 1,
           syncLamportTs = ?,
           syncVectorClock = ?,
           updatedAt = ?
       WHERE id = ? AND userId = ?`,
      [
        (changes.title ?? null) as any,
        (changes.description ?? null) as any,
        (changes.status ?? null) as any,
        (changes.priority ?? null) as any,
        (changes.dueDate ?? null) as any,
        changes.isRecurring === undefined ? null : toBoolInt(Boolean(changes.isRecurring)),
        (changes.effort ?? null) as any,
        (changes.categoryId ?? null) as any,
        operation.lamportTs,
        JSON.stringify(operation.vectorClock),
        new Date().toISOString(),
        id,
        userId,
      ],
    );

    emitTasksChanged();
  },

  async toggle(id: string, userId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const nextStatus =
      existing.status === 'PENDING' ? 'IN_PROGRESS' : existing.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING';

    const operation = await syncQueue.add('task', id, 'TOGGLE', { status: nextStatus } as any);
    const db = await getDb();
    await db.runAsync(
      `UPDATE tasks
       SET status = ?,
           dirty = 1,
           syncLamportTs = ?,
           syncVectorClock = ?,
           updatedAt = ?
       WHERE id = ? AND userId = ?`,
      [nextStatus, operation.lamportTs, JSON.stringify(operation.vectorClock), new Date().toISOString(), id, userId],
    );
    emitTasksChanged();
  },

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.getById(id);
    const db = await getDb();

    if ((existing as any)?._localOnly) {
      await db.runAsync('DELETE FROM tasks WHERE id = ? AND userId = ?', [id, userId]);
      await syncQueue.removeByEntity('task', id);
      emitTasksChanged();
      return;
    }

    const operation = await syncQueue.add('task', id, 'DELETE', {});
    await db.runAsync(
      `UPDATE tasks
       SET deletedLocally = 1,
           dirty = 1,
           syncLamportTs = ?,
           syncVectorClock = ?,
           updatedAt = ?
       WHERE id = ? AND userId = ?`,
      [operation.lamportTs, JSON.stringify(operation.vectorClock), new Date().toISOString(), id, userId],
    );
    emitTasksChanged();
  },

  async hydrate(tasks: Array<Task & any>): Promise<void> {
    const db = await getDb();
    for (const task of tasks) {
      await db.runAsync(
        `INSERT INTO tasks(
          id, userId, title, description, status, priority, dueDate, isRecurring, effort, categoryId,
          subtasksJson, attachmentsJson, localOnly, dirty, deletedLocally, lastSyncedAt, syncLamportTs, syncVectorClock, updatedAt
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          userId = excluded.userId,
          title = excluded.title,
          description = excluded.description,
          status = excluded.status,
          priority = excluded.priority,
          dueDate = excluded.dueDate,
          isRecurring = excluded.isRecurring,
          effort = excluded.effort,
          categoryId = excluded.categoryId,
          subtasksJson = excluded.subtasksJson,
          attachmentsJson = excluded.attachmentsJson,
          localOnly = 0,
          dirty = 0,
          deletedLocally = 0,
          lastSyncedAt = excluded.lastSyncedAt,
          syncLamportTs = MAX(syncLamportTs, excluded.syncLamportTs),
          syncVectorClock = excluded.syncVectorClock,
          updatedAt = excluded.updatedAt`,
        [
          task.id,
          task.userId,
          task.title ?? 'Untitled Task',
          (task.description ?? null) as any,
          (task.status ?? 'PENDING') as any,
          (task.priority ?? 'MEDIUM') as any,
          (task.dueDate ?? null) as any,
          toBoolInt(Boolean(task.isRecurring)),
          (task.effort ?? null) as any,
          (task.categoryId ?? null) as any,
          JSON.stringify(task.subtasks ?? []),
          JSON.stringify(task.attachments ?? []),
          (task as any)._lastSyncedAt ?? null,
          Number((task as any)._syncLamportTs ?? (task as any).syncLamportTs ?? 0) || 0,
          JSON.stringify((task as any)._syncVectorClock ?? null),
          new Date().toISOString(),
        ],
      );
    }
    emitTasksChanged();
  },

  async updateFromServerSnapshot(task: Task): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE tasks
       SET title = ?,
           description = ?,
           status = ?,
           priority = ?,
           dueDate = ?,
           isRecurring = ?,
           effort = ?,
           categoryId = ?,
           subtasksJson = ?,
           attachmentsJson = ?,
           updatedAt = ?
       WHERE id = ? AND userId = ?`,
      [
        task.title ?? 'Untitled Task',
        (task.description ?? null) as any,
        task.status as any,
        task.priority as any,
        (task.dueDate ?? null) as any,
        toBoolInt(Boolean(task.isRecurring)),
        (task.effort ?? null) as any,
        (task.categoryId ?? null) as any,
        JSON.stringify(task.subtasks ?? []),
        JSON.stringify(task.attachments ?? []),
        new Date().toISOString(),
        task.id,
        task.userId,
      ],
    );
    emitTasksChanged();
  },
};

// ─── Remote operation apply ────────────────────────────────────────────────

function normalizeTaskFromRemote(params: {
  existing: any | null;
  payload: Record<string, unknown> | null;
  entityId: string;
  lamportTs: number;
  vectorClock: VectorClock | null;
  createdAt: string;
}): Partial<Task> & { id: string; userId: string } | null {
  const source = params.payload ?? {};
  const id = typeof source.id === 'string' ? source.id : params.entityId;
  const userId = typeof source.userId === 'string' ? source.userId : (params.existing?.userId as string | undefined);
  if (!id || !userId) return null;

  return {
    id,
    userId,
    title: typeof source.title === 'string' ? source.title : params.existing?.title ?? 'Untitled Task',
    description:
      typeof source.description === 'string'
        ? source.description
        : source.description === null
          ? null
          : params.existing?.description ?? null,
    status: (typeof source.status === 'string' ? source.status : params.existing?.status ?? 'PENDING') as any,
    priority: (typeof source.priority === 'string' ? source.priority : params.existing?.priority ?? 'MEDIUM') as any,
    dueDate:
      typeof source.dueDate === 'string'
        ? source.dueDate
        : source.dueDate === null
          ? null
          : params.existing?.dueDate ?? null,
    isRecurring: typeof source.isRecurring === 'boolean' ? source.isRecurring : Boolean(params.existing?.isRecurring ?? false),
    effort:
      typeof source.effort === 'string'
        ? source.effort
        : source.effort === null
          ? null
          : params.existing?.effort ?? null,
    categoryId:
      typeof source.categoryId === 'string'
        ? source.categoryId
        : source.categoryId === null
          ? null
          : params.existing?.categoryId ?? null,
  };
}

function normalizeCategoryFromRemote(params: {
  existing: any | null;
  payload: Record<string, unknown> | null;
  entityId: string;
  lamportTs: number;
  vectorClock: VectorClock | null;
}): Partial<Category> & { id: string; userId: string } | null {
  const source = params.payload ?? {};
  const id = typeof source.id === 'string' ? source.id : params.entityId;
  const userId = typeof source.userId === 'string' ? source.userId : (params.existing?.userId as string | undefined);
  if (!id || !userId) return null;

  return {
    id,
    userId,
    name: typeof source.name === 'string' && source.name.trim().length > 0 ? source.name.trim() : params.existing?.name ?? `Category ${id.slice(0, 6)}`,
    colorCode: typeof source.colorCode === 'string' && source.colorCode.trim().length > 0 ? source.colorCode : params.existing?.colorCode ?? '#3B82F6',
    icon: typeof source.icon === 'string' ? source.icon : source.icon === null ? null : params.existing?.icon ?? null,
  };
}

export async function applyRemoteSyncOperation(operation: RemoteSyncOperation): Promise<void> {
  await observeRemoteClock(operation.lamportTs, operation.vectorClock);
  const db = await getDb();

  if (operation.entityType === 'task') {
    const existing = await db.getFirstAsync<any>('SELECT * FROM tasks WHERE id = ? LIMIT 1', [operation.entityId]);
    const localLamport = Number(existing?.syncLamportTs) || 0;
    const isDirty = parseBool(existing?.dirty);

    if (isDirty && localLamport > operation.lamportTs) {
      return;
    }

    if (operation.action === 'DELETE' || operation.tombstone) {
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [operation.entityId]);
      emitTasksChanged();
      return;
    }

    const incomingSubtasks =
      operation.payload && Array.isArray((operation.payload as any).subtasks)
        ? (operation.payload as any).subtasks
        : null;
    const incomingAttachments =
      operation.payload && Array.isArray((operation.payload as any).attachments)
        ? (operation.payload as any).attachments
        : null;

    const subtasksJson =
      incomingSubtasks !== null
        ? JSON.stringify(incomingSubtasks)
        : typeof existing?.subtasksJson === 'string'
          ? existing.subtasksJson
          : JSON.stringify([]);

    const attachmentsJson =
      incomingAttachments !== null
        ? JSON.stringify(incomingAttachments)
        : typeof existing?.attachmentsJson === 'string'
          ? existing.attachmentsJson
          : JSON.stringify([]);

    const normalized = normalizeTaskFromRemote({
      existing,
      payload: operation.payload,
      entityId: operation.entityId,
      lamportTs: operation.lamportTs,
      vectorClock: operation.vectorClock,
      createdAt: operation.createdAt,
    });
    if (!normalized) return;

    await db.runAsync(
      `INSERT INTO tasks(
        id, userId, title, description, status, priority, dueDate, isRecurring, effort, categoryId,
        subtasksJson, attachmentsJson, localOnly, dirty, deletedLocally, lastSyncedAt, syncLamportTs, syncVectorClock, updatedAt
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        userId = excluded.userId,
        title = excluded.title,
        description = excluded.description,
        status = excluded.status,
        priority = excluded.priority,
        dueDate = excluded.dueDate,
        isRecurring = excluded.isRecurring,
        effort = excluded.effort,
        categoryId = excluded.categoryId,
        localOnly = 0,
        dirty = 0,
        deletedLocally = 0,
        lastSyncedAt = excluded.lastSyncedAt,
        syncLamportTs = excluded.syncLamportTs,
        syncVectorClock = excluded.syncVectorClock,
        updatedAt = excluded.updatedAt`,
      [
        normalized.id,
        normalized.userId,
        normalized.title ?? 'Untitled Task',
        (normalized.description ?? null) as any,
        (normalized.status ?? 'PENDING') as any,
        (normalized.priority ?? 'MEDIUM') as any,
        (normalized.dueDate ?? null) as any,
        toBoolInt(Boolean(normalized.isRecurring)),
        (normalized.effort ?? null) as any,
        (normalized.categoryId ?? null) as any,
        subtasksJson,
        attachmentsJson,
        operation.createdAt,
        operation.lamportTs,
        JSON.stringify(operation.vectorClock ?? null),
        new Date().toISOString(),
      ],
    );
    emitTasksChanged();
    return;
  }

  const existing = await db.getFirstAsync<any>('SELECT * FROM categories WHERE id = ? LIMIT 1', [operation.entityId]);
  const localLamport = Number(existing?.syncLamportTs) || 0;
  const isDirty = parseBool(existing?.dirty);

  if (isDirty && localLamport > operation.lamportTs) {
    return;
  }

  if (operation.action === 'DELETE' || operation.tombstone) {
    await db.runAsync('DELETE FROM categories WHERE id = ?', [operation.entityId]);
    emitCategoriesChanged();
    return;
  }

  const normalized = normalizeCategoryFromRemote({
    existing,
    payload: operation.payload,
    entityId: operation.entityId,
    lamportTs: operation.lamportTs,
    vectorClock: operation.vectorClock,
  });
  if (!normalized) return;

  await db.runAsync(
    `INSERT INTO categories(
      id, userId, name, colorCode, icon, localOnly, dirty, syncLamportTs, syncVectorClock, updatedAt
    ) VALUES(?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      userId = excluded.userId,
      name = excluded.name,
      colorCode = excluded.colorCode,
      icon = excluded.icon,
      localOnly = 0,
      dirty = 0,
      syncLamportTs = excluded.syncLamportTs,
      syncVectorClock = excluded.syncVectorClock,
      updatedAt = excluded.updatedAt`,
    [
      normalized.id,
      normalized.userId,
      normalized.name ?? `Category ${normalized.id.slice(0, 6)}`,
      normalized.colorCode ?? '#3B82F6',
      (normalized.icon ?? null) as any,
      operation.lamportTs,
      JSON.stringify(operation.vectorClock ?? null),
      new Date().toISOString(),
    ],
  );
  emitCategoriesChanged();
}

// ─── Maintenance ────────────────────────────────────────────────────────────

export async function clearLocalData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM tasks;
    DELETE FROM categories;
    DELETE FROM sync_queue;
    DELETE FROM sync_meta;
  `);
  emitTasksChanged();
  emitCategoriesChanged();
}
