import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '@repo/store';
import { isOnline, localCategories } from '../native/localDbAdapter';
import { syncEngine } from '../native/syncEngine';

export function useLocalCategories() {
  const userId = useAppSelector((state: any) => state.auth?.user?.id) as string | undefined;
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      if (isOnline()) {
        await syncEngine.forceSync();
      }
      const data = await localCategories.getAll(userId);
      setCategories(data);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    if (!userId) return;
    const unsubscribe = localCategories.onChange(() => {
      void localCategories.getAll(userId).then(setCategories).catch(() => undefined);
    });
    return () => unsubscribe();
  }, [refresh, userId]);

  return { categories, isLoading, refresh, userId };
}
