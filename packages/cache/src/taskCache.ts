import { deleteCache, getCache, setCache } from './cache.js';

const TASK_CACHE_PREFIX = 'planner:task';
const DEFAULT_TASK_CACHE_TTL_SECONDS = 300;

export interface PlannerTaskCacheValue {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  updatedAt: string;
}

export function getPlannerTaskCacheKey(taskId: string): string {
  if (!taskId) {
    throw new Error('taskId is required to build planner task cache key.');
  }
  return `${TASK_CACHE_PREFIX}:${taskId}`;
}

export async function getPlannerTaskCache(taskId: string): Promise<PlannerTaskCacheValue | null> {
  return getCache<PlannerTaskCacheValue>(getPlannerTaskCacheKey(taskId));
}

export async function setPlannerTaskCache(
  taskId: string,
  payload: PlannerTaskCacheValue,
  ttlSeconds: number = DEFAULT_TASK_CACHE_TTL_SECONDS
): Promise<void> {
  await setCache<PlannerTaskCacheValue>(getPlannerTaskCacheKey(taskId), payload, { ttlSeconds });
}

export async function deletePlannerTaskCache(taskId: string): Promise<boolean> {
  return deleteCache(getPlannerTaskCacheKey(taskId));
}
