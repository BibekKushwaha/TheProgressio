'use client';

import { useRef, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from './store';
import { useGetProfileQuery } from './services/authApi';
import { useAppDispatch, useAppSelector } from './hooks';
import { hydrateAuth, logout, selectIsAuthenticated } from './slices/authSlice';
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
    const hasSession = getLocalStorageItem('auth:hasSession') === '1';
    setShouldFetch(!isAuthenticated && hasSession && !isAuthRoute());
  }, [isAuthenticated]);

  useEffect(() => {
    if (isSuccess && data?.user) {
      setLocalStorageItem('auth:hasSession', '1');
      dispatch(hydrateAuth({ user: data.user }));
    }
  }, [isSuccess, data, dispatch]);

  useEffect(() => {
    if (!error) return;
    const status = 'status' in error ? error.status : undefined;
    if (status === 401 || status === 404) {
      removeLocalStorageItem('auth:hasSession');
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
