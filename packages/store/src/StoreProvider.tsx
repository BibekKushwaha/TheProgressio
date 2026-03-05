'use client';

import { useRef, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from './store';
import { useGetProfileQuery, authApi } from './services/authApi';
import { useAppDispatch, useAppSelector } from './hooks';
import { setAuthLoading, hydrateAuth, logout, selectIsAuthenticated } from './slices/authSlice';
import { AUTH_SESSION_KEY } from './runtime';
import { clearRtkCache } from './cache-persist';
import { syncEngine } from './sync-engine';
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
  supportsIndexedDb,
} from './runtime';

const STORE_BUILD_VERSION = '2026-02-19-calendar-fix';

function isAuthRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location?.pathname ?? '';
  return (
    path === '/login' ||
    path === '/signup' ||
    path === '/forgot-password' ||
    path.startsWith('/reset-password')
  );
}

function AuthHydrator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [shouldFetch, setShouldFetch] = useState(false);
  const { data, isSuccess, error } = useGetProfileQuery(undefined, {
    skip: !shouldFetch,
  });

  useEffect(() => {
    const hasSession = getLocalStorageItem(AUTH_SESSION_KEY) === '1';
    if (!isAuthenticated && hasSession && !isAuthRoute()) {
      dispatch(setAuthLoading());
      setShouldFetch(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isSuccess && data?.user) {
      setLocalStorageItem(AUTH_SESSION_KEY, '1');
      dispatch(hydrateAuth({ user: data.user }));
    }
  }, [isSuccess, data, dispatch]);

  useEffect(() => {
    if (!error) return;
    const status = 'status' in error ? error.status : undefined;
    if (status === 401 || status === 404) {
      removeLocalStorageItem(AUTH_SESSION_KEY);
      // Reset the RTK Query API state BEFORE clearing the persist cache so
      // the debounced localStorage save (triggered by the dispatch below)
      // writes a clean empty-queries state rather than the 401 error.  Without
      // this, a stale rejected-query entry could survive in localStorage and
      // cause an immediate logout on the *next* page load (e.g. after Google
      // OAuth) when makeStore() pre-loads that error as initial RTK state.
      dispatch(authApi.util.resetApiState());
      clearRtkCache();
      dispatch(logout());
      setShouldFetch(false);
    }
  }, [error, dispatch]);

  return null;
}

function SyncBootstrap() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!supportsIndexedDb()) {
      return;
    }

    if (!isAuthenticated) {
      syncEngine.stop();
      return;
    }

    syncEngine.start();

    return () => {
      syncEngine.stop();
    };
  }, [isAuthenticated]);

  return null;
}

export function StoreProvider({
  children,
  disableAuthHydrator,
}: {
  children: React.ReactNode;
  disableAuthHydrator?: boolean;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current || (storeRef.current as AppStore & { __storeBuildVersion?: string }).__storeBuildVersion !== STORE_BUILD_VERSION) {
    const store = makeStore() as AppStore & { __storeBuildVersion?: string };
    store.__storeBuildVersion = STORE_BUILD_VERSION;
    storeRef.current = store;
  }

  return (
    <Provider store={storeRef.current!}>
      <>
        {children}
        <SyncBootstrap />
        {disableAuthHydrator ? null : <AuthHydrator />}
      </>
    </Provider>
  );
}
