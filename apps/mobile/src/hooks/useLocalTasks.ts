import { useCallback, useEffect, useState } from 'react';
import type { Task } from '@repo/store';
import { useAppSelector } from '@repo/store';
import { isOnline, localTasks } from '../native/localDbAdapter';
import { syncEngine } from '../native/syncEngine';

export type LocalTaskFilters = {
  status?: string;
  priority?: string;
  categoryId?: string;
  search?: string;
};

export function useLocalTasks(filters?: LocalTaskFilters) {
  const userId = useAppSelector((state: any) => state.auth?.user?.id) as string | undefined;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    const data = await localTasks.getAll({
      userId,
      status: filters?.status,
      priority: filters?.priority,
      categoryId: filters?.categoryId,
      search: filters?.search,
    });
    setTasks(data);
  }, [userId, filters?.status, filters?.priority, filters?.categoryId, filters?.search]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      if (isOnline()) {
        await syncEngine.forceSync();
      }
      await load();
    } finally {
      setIsLoading(false);
    }
  }, [load, userId]);

  useEffect(() => {
    void refresh();
    if (!userId) return;
    const unsubscribe = localTasks.onChange(() => {
      void load().catch(() => undefined);
    });
    return () => unsubscribe();
  }, [load, refresh, userId]);

  return { tasks, isLoading, refresh, userId };
}

