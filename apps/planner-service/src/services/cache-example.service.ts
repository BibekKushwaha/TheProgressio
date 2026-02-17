import {
  consumeRateLimit,
  getPlannerTaskCache,
  setPlannerTaskCache,
  type PlannerTaskCacheValue,
} from '@repo/cache';

export interface PlannerTaskRecord {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  updatedAt: string;
}

export interface CachedTaskResult {
  source: 'cache' | 'database';
  task: PlannerTaskRecord | null;
}

export async function getPlannerTaskWithCache(
  taskId: string,
  readFromDatabase: (id: string) => Promise<PlannerTaskRecord | null>
): Promise<CachedTaskResult> {
  const cached = await getPlannerTaskCache(taskId);
  if (cached) {
    return { source: 'cache', task: cached };
  }

  const task = await readFromDatabase(taskId);
  if (!task) {
    return { source: 'database', task: null };
  }

  const cachePayload: PlannerTaskCacheValue = {
    id: task.id,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
  };

  await setPlannerTaskCache(task.id, cachePayload, 300);
  return { source: 'database', task };
}

export async function enforcePlannerApiRateLimit(userId: string): Promise<void> {
  const result = await consumeRateLimit({
    key: userId,
    prefix: 'planner-service:api',
    limit: 120,
    windowSeconds: 60,
  });

  if (!result.allowed) {
    throw new Error('Too many requests. Please retry later.');
  }
}
