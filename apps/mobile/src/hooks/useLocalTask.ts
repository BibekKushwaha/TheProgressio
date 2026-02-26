import { useCallback, useEffect, useState } from 'react';
import type { Task } from '@repo/store';
import { isOnline, localTasks } from '../native/localDbAdapter';
import { syncEngine } from '../native/syncEngine';

export function useLocalTask(taskId: string | null | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setIsLoading(false);
      return;
    }
    const next = await localTasks.getById(taskId);
    setTask(next);
  }, [taskId]);

  const refresh = useCallback(async () => {
    if (!taskId) {
      setTask(null);
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
  }, [load, taskId]);

  useEffect(() => {
    void refresh();
    if (!taskId) return;
    const unsubscribe = localTasks.onChange(() => {
      void load().catch(() => undefined);
    });
    return () => unsubscribe();
  }, [load, refresh, taskId]);

  return { task, isLoading, refresh };
}

