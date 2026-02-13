'use client';

import { useRef, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from './store';
import { useGetProfileQuery } from './services/authApi';
import { useAppDispatch } from './hooks';
import { hydrateAuth, logout } from './slices/authSlice';
import { syncEngine } from './sync-engine';

const STORE_BUILD_VERSION = '2026-02-13-payment-api';

function AuthHydrator() {
  const dispatch = useAppDispatch();
  const [shouldFetch, setShouldFetch] = useState(false);
  const { data, isSuccess, error } = useGetProfileQuery(undefined, {
    skip: !shouldFetch,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasSession = localStorage.getItem('auth:hasSession') === '1';
    setShouldFetch(hasSession);
  }, []);

  useEffect(() => {
    if (isSuccess && data?.user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth:hasSession', '1');
      }
      dispatch(hydrateAuth({ user: data.user }));
    }
  }, [isSuccess, data, dispatch]);

  useEffect(() => {
    if (!error) return;
    const status = 'status' in error ? error.status : undefined;
    if (status === 401 || status === 404) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth:hasSession');
      }
      dispatch(logout());
      setShouldFetch(false);
    }
  }, [error, dispatch]);

  return null;
}

function SyncBootstrap() {
  useEffect(() => {
    syncEngine.start();

    return () => {
      syncEngine.stop();
    };
  }, []);

  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
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
        <AuthHydrator />
      </>
    </Provider>
  );
}
