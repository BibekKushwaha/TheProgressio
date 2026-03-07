import { prisma, Priority, Status } from '@repo/db';
import { postJsonRequest } from './internal-http.service.js';
import { emitTaskEvent, TaskEventType } from './queue.service.js';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4003';

const notifyAnalyticsSyncEvent = async (body: Record<string, unknown>): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;

  const result = await postJsonRequest({
    url: `${ANALYTICS_SERVICE_URL}/api/stats/events/task-completed`,
    body,
    logContext: {
      service: 'planner-service',
      subsystem: 'sync',
      dependency: 'analytics-service',
      operation: 'sync_task_event',
    },
  });

  if (!result.ok) {
    const detail = result.status > 0
      ? `${result.status}: ${result.bodyText || 'Unknown error'}`
      : result.reason;
    console.warn(`Failed to notify analytics from sync service (${detail})`);
  }
};

export type SyncEntityType = 'task' | 'category';
export type SyncAction = 'UPSERT' | 'DELETE';

export interface IncomingSyncOperation {
  opId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: string;
  lamportTs: number;
  vectorClock?: Record<string, number> | null;
  payload?: Record<string, unknown> | null;
  tombstone?: boolean;
}

export interface SyncPushInput {
  clientId: string;
  operations: IncomingSyncOperation[];
}

export interface MergeHint {
  opId: string;
  entityType: SyncEntityType;
  entityId: string;
  resolution: 'applied' | 'rejected';
  reason?: string;
  serverLamport?: number;
  clientLamport?: number;
}

export interface SyncPushResult {
  cursor: number;
  appliedOps: string[];
  rejectedOps: Array<{ opId: string; reason: string }>;
  mergeHints: MergeHint[];
}

export interface SyncPullOperation {
  id: number;
  clientId: string;
  opId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown> | null;
  lamportTs: number;
  vectorClock: Record<string, number> | null;
  tombstone: boolean;
  createdAt: string;
}

export interface SyncPullResult {
  cursor: number;
  operations: SyncPullOperation[];
}

const MAX_PUSH_OPERATIONS = 500;
const MAX_PULL_OPERATIONS = 500;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeEntityType = (value: string): SyncEntityType | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'task') return 'task';
  if (normalized === 'category') return 'category';
  return null;
};

const normalizeAction = (value: string, tombstone: boolean): SyncAction | null => {
  if (tombstone) return 'DELETE';

  const normalized = value.trim().toUpperCase();
  if (normalized === 'DELETE') return 'DELETE';
  if (normalized === 'UPSERT') return 'UPSERT';
  if (normalized === 'CREATE') return 'UPSERT';
  if (normalized === 'UPDATE') return 'UPSERT';
  if (normalized === 'TOGGLE') return 'UPSERT';
  return null;
};

const toJsonString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const parseJsonRecord = (value: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseVectorClock = (value: string | null): Record<string, number> | null => {
  const parsed = parseJsonRecord(value);
  if (!parsed) return null;

  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(parsed)) {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
      result[key] = Math.floor(raw);
    }
  }

  return Object.keys(result).length ? result : null;
};

const clampPositiveInt = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : fallback;
};

const isValidStatus = (value: unknown): value is Status =>
  value === Status.PENDING || value === Status.IN_PROGRESS || value === Status.COMPLETED;

const isValidPriority = (value: unknown): value is Priority =>
  value === Priority.LOW || value === Priority.MEDIUM || value === Priority.HIGH;

const parseDateOrNull = (value: unknown): Date | null => {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const cycleTaskStatus = (current: Status): Status => {
  if (current === Status.PENDING) return Status.IN_PROGRESS;
  if (current === Status.IN_PROGRESS) return Status.COMPLETED;
  return Status.PENDING;
};

const sanitizeTaskPayload = async (params: {
  userId: string;
  payload: Record<string, unknown> | null;
  action: string;
  existingStatus?: Status;
}): Promise<{
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  dueDate: Date | null;
  isRecurring: boolean;
  categoryId: string | null;
}> => {
  const payload = params.payload ?? {};

  const title = typeof payload.title === 'string' && payload.title.trim().length > 0
    ? payload.title.trim()
    : 'Untitled Task';

  const description = typeof payload.description === 'string'
    ? payload.description
    : payload.description === null
      ? null
      : null;

  let status: Status;
  if (isValidStatus(payload.status)) {
    status = payload.status;
  } else if (params.action.trim().toUpperCase() === 'TOGGLE' && params.existingStatus) {
    status = cycleTaskStatus(params.existingStatus);
  } else {
    status = params.existingStatus ?? Status.PENDING;
  }

  const priority = isValidPriority(payload.priority) ? payload.priority : Priority.MEDIUM;
  const dueDate = parseDateOrNull(payload.dueDate);
  const isRecurring = typeof payload.isRecurring === 'boolean' ? payload.isRecurring : false;

  const rawCategoryId = typeof payload.categoryId === 'string' && payload.categoryId.trim().length > 0
    ? payload.categoryId.trim()
    : null;

  if (!rawCategoryId) {
    return { title, description, status, priority, dueDate, isRecurring, categoryId: null };
  }

  const category = await prisma.category.findFirst({
    where: {
      id: rawCategoryId,
      userId: params.userId,
    },
    select: { id: true },
  });

  return {
    title,
    description,
    status,
    priority,
    dueDate,
    isRecurring,
    categoryId: category?.id ?? null,
  };
};

const sanitizeCategoryPayload = (
  payload: Record<string, unknown> | null,
  fallbackName: string
): { name: string; colorCode: string; icon: string | null } => {
  const source = payload ?? {};

  const name = typeof source.name === 'string' && source.name.trim().length > 0
    ? source.name.trim()
    : fallbackName;

  const colorCode = typeof source.colorCode === 'string' && source.colorCode.trim().length > 0
    ? source.colorCode
    : '#3B82F6';

  const icon = typeof source.icon === 'string'
    ? source.icon
    : source.icon === null
      ? null
      : null;

  return { name, colorCode, icon };
};

const getLatestEntityOperation = async (
  userId: string,
  entityType: SyncEntityType,
  entityId: string
) => {
  return prisma.syncOperation.findFirst({
    where: {
      userId,
      entityType,
      entityId,
    },
    orderBy: [
      { lamportTs: 'desc' },
      { id: 'desc' },
    ],
  });
};

const applyTaskOperation = async (params: {
  userId: string;
  entityId: string;
  action: SyncAction;
  originalAction: string;
  payload: Record<string, unknown> | null;
  lamportTs: number;
  vectorClock: Record<string, number> | null;
}) => {
  if (params.action === 'DELETE') {
    // Emit deletion event and notify analytics (HTTP fallback)
    try {
      await emitTaskEvent(TaskEventType.TASK_DELETED, params.entityId, params.userId, {
        title: params.payload?.title ?? null,
        previousStatus: params.payload?.status ?? null,
      });
    } catch (err) {
      // non-blocking
      console.warn('Failed to emit task.deleted event from sync service', err);
    }

    try {
      await notifyAnalyticsSyncEvent({ type: 'TASK_DELETED', taskId: params.entityId, userId: params.userId });
    } catch (_err) {
      // swallow errors for robustness
    }

    await prisma.task.deleteMany({
      where: {
        id: params.entityId,
        userId: params.userId,
      },
    });
    return;
  }

  const existing = await prisma.task.findUnique({
    where: { id: params.entityId },
    select: { id: true, userId: true, status: true },
  });

  if (existing && existing.userId !== params.userId) {
    throw new Error('forbidden_entity_owner');
  }

  const normalized = await sanitizeTaskPayload({
    userId: params.userId,
    payload: params.payload,
    action: params.originalAction,
    ...(existing ? { existingStatus: existing.status } : {}),
  });

  const syncVectorClock = toJsonString(params.vectorClock);

  if (existing) {
    await prisma.task.update({
      where: { id: params.entityId },
      data: {
        title: normalized.title,
        description: normalized.description,
        status: normalized.status,
        priority: normalized.priority,
        dueDate: normalized.dueDate,
        isRecurring: normalized.isRecurring,
        categoryId: normalized.categoryId,
        syncLamportTs: params.lamportTs,
        syncVectorClock,
      },
    });
    // If status changed, emit status change event and notify analytics fallback
    if (normalized.status !== existing.status) {
      try {
        await emitTaskEvent(TaskEventType.TASK_STATUS_CHANGED, params.entityId, params.userId, {
          previousStatus: existing.status,
          newStatus: normalized.status,
          title: normalized.title,
        });
      } catch (err) {
        console.warn('Failed to emit task.status_changed event from sync service', err);
      }

      try {
        await notifyAnalyticsSyncEvent({
          type: 'TASK_STATUS_CHANGED',
          taskId: params.entityId,
          userId: params.userId,
          previousStatus: existing.status,
          newStatus: normalized.status,
        });
      } catch (_err) {
        // ignore
      }
    }
    return;
  }

  await prisma.task.create({
    data: {
      id: params.entityId,
      title: normalized.title,
      description: normalized.description,
      status: normalized.status,
      priority: normalized.priority,
      dueDate: normalized.dueDate,
      isRecurring: normalized.isRecurring,
      userId: params.userId,
      categoryId: normalized.categoryId,
      syncLamportTs: params.lamportTs,
      syncVectorClock,
    },
  });
  // Emit created event (helps downstream consumers stay in sync)
  try {
    await emitTaskEvent(TaskEventType.TASK_CREATED, params.entityId, params.userId, {
      title: normalized.title,
      priority: normalized.priority,
      dueDate: normalized.dueDate,
    });
  } catch (_err) {
    // non-blocking
  }
};

const applyCategoryOperation = async (params: {
  userId: string;
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown> | null;
  lamportTs: number;
  vectorClock: Record<string, number> | null;
}) => {
  if (params.action === 'DELETE') {
    await prisma.category.deleteMany({
      where: {
        id: params.entityId,
        userId: params.userId,
      },
    });
    return;
  }

  const existing = await prisma.category.findUnique({
    where: { id: params.entityId },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== params.userId) {
    throw new Error('forbidden_entity_owner');
  }

  const normalized = sanitizeCategoryPayload(params.payload, `Category ${params.entityId.slice(0, 6)}`);
  const syncVectorClock = toJsonString(params.vectorClock);

  if (existing) {
    await prisma.category.update({
      where: { id: params.entityId },
      data: {
        name: normalized.name,
        colorCode: normalized.colorCode,
        icon: normalized.icon,
        syncLamportTs: params.lamportTs,
        syncVectorClock,
      },
    });
    return;
  }

  await prisma.category.create({
    data: {
      id: params.entityId,
      userId: params.userId,
      name: normalized.name,
      colorCode: normalized.colorCode,
      icon: normalized.icon,
      syncLamportTs: params.lamportTs,
      syncVectorClock,
    },
  });
};

const applyEntityOperation = async (params: {
  userId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  originalAction: string;
  payload: Record<string, unknown> | null;
  lamportTs: number;
  vectorClock: Record<string, number> | null;
}) => {
  if (params.entityType === 'task') {
    await applyTaskOperation({
      userId: params.userId,
      entityId: params.entityId,
      action: params.action,
      originalAction: params.originalAction,
      payload: params.payload,
      lamportTs: params.lamportTs,
      vectorClock: params.vectorClock,
    });
    return;
  }

  await applyCategoryOperation({
    userId: params.userId,
    entityId: params.entityId,
    action: params.action,
    payload: params.payload,
    lamportTs: params.lamportTs,
    vectorClock: params.vectorClock,
  });
};

const getCurrentCursor = async (userId: string): Promise<number> => {
  const latest = await prisma.syncOperation.findFirst({
    where: { userId },
    orderBy: [{ id: 'desc' }],
    select: { id: true },
  });
  return latest?.id ?? 0;
};

export async function processSyncPush(userId: string, input: SyncPushInput): Promise<SyncPushResult> {
  const operations = input.operations.slice(0, MAX_PUSH_OPERATIONS);

  const appliedOps: string[] = [];
  const rejectedOps: Array<{ opId: string; reason: string }> = [];
  const mergeHints: MergeHint[] = [];

  const ordered = [...operations].sort((a, b) => {
    if (a.lamportTs !== b.lamportTs) return a.lamportTs - b.lamportTs;
    return a.opId.localeCompare(b.opId);
  });

  for (const op of ordered) {
    const opId = typeof op.opId === 'string' ? op.opId.trim() : '';
    const entityId = typeof op.entityId === 'string' ? op.entityId.trim() : '';
    const rawEntityType = typeof op.entityType === 'string' ? op.entityType : '';
    const rawAction = typeof op.action === 'string' ? op.action : '';
    const vectorClock = isObject(op.vectorClock) ? op.vectorClock as Record<string, number> : null;
    const payload = isObject(op.payload) ? op.payload : null;
    const tombstone = Boolean(op.tombstone);
    const lamportTs = clampPositiveInt(op.lamportTs, 1);

    if (!opId || !entityId) {
      rejectedOps.push({ opId: opId || '(missing)', reason: 'invalid_operation_shape' });
      mergeHints.push({
        opId: opId || '(missing)',
        entityType: 'task',
        entityId: entityId || '(missing)',
        resolution: 'rejected',
        reason: 'invalid_operation_shape',
      });
      continue;
    }

    const entityType = normalizeEntityType(rawEntityType);
    if (!entityType) {
      rejectedOps.push({ opId, reason: 'unsupported_entity_type' });
      mergeHints.push({
        opId,
        entityType: 'task',
        entityId,
        resolution: 'rejected',
        reason: 'unsupported_entity_type',
      });
      continue;
    }

    const action = normalizeAction(rawAction, tombstone);
    if (!action) {
      rejectedOps.push({ opId, reason: 'unsupported_action' });
      mergeHints.push({
        opId,
        entityType,
        entityId,
        resolution: 'rejected',
        reason: 'unsupported_action',
      });
      continue;
    }

    const existingByOpId = await prisma.syncOperation.findUnique({
      where: {
        userId_opId: {
          userId,
          opId,
        },
      },
      select: { id: true },
    });

    if (existingByOpId) {
      rejectedOps.push({ opId, reason: 'duplicate_op' });
      mergeHints.push({
        opId,
        entityType,
        entityId,
        resolution: 'rejected',
        reason: 'duplicate_op',
      });
      continue;
    }

    const latestOp = await getLatestEntityOperation(userId, entityType, entityId);
    const serverLamport = latestOp?.lamportTs ?? 0;

    if (lamportTs < serverLamport) {
      rejectedOps.push({ opId, reason: 'stale_lamport' });
      mergeHints.push({
        opId,
        entityType,
        entityId,
        resolution: 'rejected',
        reason: 'stale_lamport',
        serverLamport,
        clientLamport: lamportTs,
      });
      continue;
    }

    if (lamportTs === serverLamport && latestOp) {
      if (opId.localeCompare(latestOp.opId) <= 0) {
        rejectedOps.push({ opId, reason: 'tie_break_lost' });
        mergeHints.push({
          opId,
          entityType,
          entityId,
          resolution: 'rejected',
          reason: 'tie_break_lost',
          serverLamport,
          clientLamport: lamportTs,
        });
        continue;
      }
    }

    try {
      await applyEntityOperation({
        userId,
        entityType,
        entityId,
        action,
        originalAction: rawAction,
        payload,
        lamportTs,
        vectorClock,
      });

      await prisma.syncOperation.create({
        data: {
          userId,
          clientId: input.clientId,
          opId,
          entityType,
          entityId,
          action,
          payload: toJsonString(payload),
          lamportTs,
          vectorClock: toJsonString(vectorClock),
          tombstone: action === 'DELETE',
        },
      });

      appliedOps.push(opId);
      mergeHints.push({
        opId,
        entityType,
        entityId,
        resolution: 'applied',
        serverLamport,
        clientLamport: lamportTs,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'apply_failed';
      rejectedOps.push({ opId, reason });
      mergeHints.push({
        opId,
        entityType,
        entityId,
        resolution: 'rejected',
        reason,
        serverLamport,
        clientLamport: lamportTs,
      });
    }
  }

  const cursor = await getCurrentCursor(userId);

  return {
    cursor,
    appliedOps,
    rejectedOps,
    mergeHints,
  };
}

export async function processSyncPull(userId: string, sinceCursor: number): Promise<SyncPullResult> {
  const since = Math.max(0, Math.floor(sinceCursor));

  const operations = await prisma.syncOperation.findMany({
    where: {
      userId,
      id: { gt: since },
    },
    orderBy: [{ id: 'asc' }],
    take: MAX_PULL_OPERATIONS,
  });

  const mapped: SyncPullOperation[] = operations
    .map((operation) => {
      const normalizedEntityType = normalizeEntityType(operation.entityType);
      if (!normalizedEntityType) return null;

      const action = operation.action === 'DELETE' ? 'DELETE' : 'UPSERT';

      return {
        id: operation.id,
        clientId: operation.clientId,
        opId: operation.opId,
        entityType: normalizedEntityType,
        entityId: operation.entityId,
        action,
        payload: parseJsonRecord(operation.payload),
        lamportTs: operation.lamportTs,
        vectorClock: parseVectorClock(operation.vectorClock),
        tombstone: operation.tombstone,
        createdAt: operation.createdAt.toISOString(),
      };
    })
    .filter((item): item is SyncPullOperation => item !== null);

  const cursor = mapped.length > 0 ? mapped[mapped.length - 1]!.id : since;

  return {
    cursor,
    operations: mapped,
  };
}
