import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  role?: string; // "USER" | "ADMIN"
}

/** Tracks whether the session hydration fetch is pending, done, or failed. */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** Single source of truth for session hydration lifecycle. */
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Signal that a profile fetch is in-flight, blocking duplicate fetches. */
    setAuthLoading: (state) => {
      state.status = 'loading';
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: User }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.status = 'authenticated';
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'unauthenticated';
    },
    hydrateAuth: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.status = 'authenticated';
    },
  },
});

export const { setAuthLoading, setCredentials, logout, hydrateAuth } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectIsAdmin = (state: RootState) => state.auth.user?.role === 'ADMIN';

export default authSlice.reducer;
