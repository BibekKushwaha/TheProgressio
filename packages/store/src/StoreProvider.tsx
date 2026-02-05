'use client';

import { useRef, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from './store';
import { useGetProfileQuery, useLogoutMutation } from './services/authApi';
import { useAppDispatch } from './hooks';
import { hydrateAuth, logout } from './slices/authSlice';

function AuthHydrator() {
  const dispatch = useAppDispatch();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [logoutApi] = useLogoutMutation();
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
      logoutApi();
    }
  }, [error, dispatch, logoutApi]);

  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current!}>
      <>
        {children}
        <AuthHydrator />
      </>
    </Provider>
  );
}
