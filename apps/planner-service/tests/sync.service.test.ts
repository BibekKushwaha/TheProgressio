import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockState, mockPrisma } = vi.hoisted(() => {
  type SyncOperationRecord = {
    id: number;
    userId: string;
    clientId: string;
    opId: string;
    entityType: string;
    entityId: string;
    action: string;
    payload: string | null;
    lamportTs: number;
    vectorClock: string | null;
    tombstone: boolean;
    createdAt: Date;
  };

  type TaskRecord = {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate: Date | null;
    isRecurring: boolean;
    categoryId: string | null;
    syncLamportTs: number;
    syncVectorClock: string | null;
  };

  type CategoryRecord = {
    id: string;
    userId: string;
    name: string;
    colorCode: string;
    icon: string | null;
    syncLamportTs: number;
    syncVectorClock: string | null;
  };

  const state = {
    syncOperations: [] as SyncOperationRecord[],
    tasks: [] as TaskRecord[],
    categories: [] as CategoryRecord[],
    syncOperationId: 1,
  };

  const prisma = {
    syncOperation: {
      findUnique: vi.fn(async ({ where }: any) => {
        const key = where.userId_opId;
        return state.syncOperations.find((operation) => operation.userId === key.userId && operation.opId === key.opId) ?? null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        if (where?.entityType) {
          const filtered = state.syncOperations
            .filter((operation) =>
              operation.userId === where.userId
              && operation.entityType === where.entityType
              && operation.entityId === where.entityId
            )
            .sort((a, b) => {
              if (a.lamportTs !== b.lamportTs) return b.lamportTs - a.lamportTs;
              return b.id - a.id;
            });
          return filtered[0] ?? null;
        }

        const filtered = state.syncOperations
          .filter((operation) => operation.userId === where.userId)
          .sort((a, b) => b.id - a.id);

        return filtered[0] ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const row: SyncOperationRecord = {
          id: state.syncOperationId++,
          userId: data.userId,
          clientId: data.clientId,
          opId: data.opId,
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          payload: data.payload ?? null,
          lamportTs: data.lamportTs,
          vectorClock: data.vectorClock ?? null,
          tombstone: Boolean(data.tombstone),
          createdAt: new Date(),
        };
        state.syncOperations.push(row);
        return row;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const since = where?.id?.gt ?? 0;
        return state.syncOperations
          .filter((operation) => operation.userId === where.userId && operation.id > since)
          .sort((a, b) => a.id - b.id);
      }),
    },
    task: {
      findUnique: vi.fn(async ({ where }: any) => {
        return state.tasks.find((task) => task.id === where.id) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const task: TaskRecord = {
          id: data.id,
          userId: data.userId,
          title: data.title,
          description: data.description ?? null,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate ?? null,
          isRecurring: Boolean(data.isRecurring),
          categoryId: data.categoryId ?? null,
          syncLamportTs: data.syncLamportTs,
          syncVectorClock: data.syncVectorClock ?? null,
        };
        state.tasks.push(task);
        return task;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const task = state.tasks.find((item) => item.id === where.id);
        if (!task) throw new Error('task_not_found');

        Object.assign(task, {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate,
          isRecurring: data.isRecurring,
          categoryId: data.categoryId,
          syncLamportTs: data.syncLamportTs,
          syncVectorClock: data.syncVectorClock,
        });

        return task;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const before = state.tasks.length;
        state.tasks = state.tasks.filter((task) => !(task.id === where.id && task.userId === where.userId));
        return { count: before - state.tasks.length };
      }),
    },
    category: {
      findFirst: vi.fn(async ({ where }: any) => {
        return state.categories.find((category) => category.id === where.id && category.userId === where.userId) ?? null;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return state.categories.find((category) => category.id === where.id) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const category: CategoryRecord = {
          id: data.id,
          userId: data.userId,
          name: data.name,
          colorCode: data.colorCode,
          icon: data.icon ?? null,
          syncLamportTs: data.syncLamportTs,
          syncVectorClock: data.syncVectorClock ?? null,
        };
        state.categories.push(category);
        return category;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const category = state.categories.find((item) => item.id === where.id);
        if (!category) throw new Error('category_not_found');

        Object.assign(category, {
          name: data.name,
          colorCode: data.colorCode,
          icon: data.icon,
          syncLamportTs: data.syncLamportTs,
          syncVectorClock: data.syncVectorClock,
        });

        return category;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const before = state.categories.length;
        state.categories = state.categories.filter((category) => !(category.id === where.id && category.userId === where.userId));
        return { count: before - state.categories.length };
      }),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return { mockState: state, mockPrisma: prisma };
});

vi.mock('@repo/db', () => ({
  prisma: mockPrisma,
  Status: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
  Priority: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
  },
  AttendanceStatus: { PRESENT: 'PRESENT', ABSENT: 'ABSENT', LATE: 'LATE' },
  AttendanceMethod: { QR: 'QR', MANUAL: 'MANUAL', GEOFENCE: 'GEOFENCE' },
}));

import { processSyncPull, processSyncPush } from '../src/services/sync.service.js';

describe('sync.service', () => {
  beforeEach(() => {
    mockState.syncOperations = [];
    mockState.tasks = [];
    mockState.categories = [];
    mockState.syncOperationId = 1;
    vi.clearAllMocks();
  });

  it('applies UPSERT task operation and returns applied op with cursor', async () => {
    const result = await processSyncPush('user-1', {
      clientId: 'client-1',
      operations: [
        {
          opId: 'client-1:1:a',
          entityType: 'task',
          entityId: 'task-1',
          action: 'UPSERT',
          lamportTs: 1,
          vectorClock: { 'client-1': 1 },
          payload: {
            title: 'Biology worksheet',
            status: 'PENDING',
            priority: 'HIGH',
            userId: 'user-1',
          },
        },
      ],
    });

    expect(result.appliedOps).toEqual(['client-1:1:a']);
    expect(result.rejectedOps).toHaveLength(0);
    expect(result.cursor).toBe(1);
    expect(mockState.tasks).toHaveLength(1);
    expect(mockState.tasks[0]).toMatchObject({
      id: 'task-1',
      userId: 'user-1',
      title: 'Biology worksheet',
      syncLamportTs: 1,
    });
  });

  it('rejects stale lamport operation for same entity', async () => {
    await processSyncPush('user-1', {
      clientId: 'client-1',
      operations: [
        {
          opId: 'client-1:10:a',
          entityType: 'task',
          entityId: 'task-1',
          action: 'UPSERT',
          lamportTs: 10,
          vectorClock: { 'client-1': 10 },
          payload: {
            title: 'New title',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            userId: 'user-1',
          },
        },
      ],
    });

    const stale = await processSyncPush('user-1', {
      clientId: 'client-2',
      operations: [
        {
          opId: 'client-2:5:b',
          entityType: 'task',
          entityId: 'task-1',
          action: 'UPSERT',
          lamportTs: 5,
          vectorClock: { 'client-2': 5 },
          payload: {
            title: 'Stale update',
            status: 'COMPLETED',
            priority: 'LOW',
            userId: 'user-1',
          },
        },
      ],
    });

    expect(stale.appliedOps).toEqual([]);
    expect(stale.rejectedOps).toHaveLength(1);
    expect(stale.rejectedOps[0]).toMatchObject({ opId: 'client-2:5:b', reason: 'stale_lamport' });
    expect(mockState.tasks[0]?.title).toBe('New title');
  });

  it('pulls operations after cursor', async () => {
    await processSyncPush('user-1', {
      clientId: 'client-1',
      operations: [
        {
          opId: 'client-1:1:category',
          entityType: 'category',
          entityId: 'cat-1',
          action: 'UPSERT',
          lamportTs: 1,
          vectorClock: { 'client-1': 1 },
          payload: {
            name: 'Math',
            colorCode: '#0000ff',
            userId: 'user-1',
          },
        },
        {
          opId: 'client-1:2:task',
          entityType: 'task',
          entityId: 'task-1',
          action: 'UPSERT',
          lamportTs: 2,
          vectorClock: { 'client-1': 2 },
          payload: {
            title: 'Solve chapter set',
            status: 'PENDING',
            priority: 'MEDIUM',
            categoryId: 'cat-1',
            userId: 'user-1',
          },
        },
      ],
    });

    const pulled = await processSyncPull('user-1', 1);

    expect(pulled.cursor).toBe(2);
    expect(pulled.operations).toHaveLength(1);
    expect(pulled.operations[0]).toMatchObject({
      id: 2,
      opId: 'client-1:2:task',
      entityType: 'task',
      entityId: 'task-1',
      action: 'UPSERT',
    });
  });
});
