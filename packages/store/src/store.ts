import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authApi } from './services/authApi';
import { tasksApi } from './services/tasksApi';
import { categoriesApi } from './services/categoriesApi';
import { habitsApi } from './services/habitsApi';
import { analyticsApi } from './services/analyticsApi';
import { timetableApi } from './services/timetableApi';
import { calendarApi } from './services/calendarApi';
import { rotationsApi } from './services/rotationsApi';
import { paymentApi } from './services/paymentApi';
import { mentorshipApi } from './services/mentorshipApi';
import { syllabusApi } from './services/syllabusApi';
import authReducer from './slices/authSlice';
import tasksReducer from './slices/tasksSlice';
import categoriesReducer from './slices/categoriesSlice';
import habitsReducer from './slices/habitsSlice';
import analyticsReducer from './slices/analyticsSlice';
import { loadRtkCache, scheduleSaveRtkCache } from './cache-persist';

// Define the root reducer once so we can derive the state type for
// typed preloadedState — required for correct generic inference in configureStore.
const rootReducer = combineReducers({
  auth: authReducer,
  tasks: tasksReducer,
  categories: categoriesReducer,
  habits: habitsReducer,
  analytics: analyticsReducer,
  [authApi.reducerPath]: authApi.reducer,
  [tasksApi.reducerPath]: tasksApi.reducer,
  [categoriesApi.reducerPath]: categoriesApi.reducer,
  [habitsApi.reducerPath]: habitsApi.reducer,
  [analyticsApi.reducerPath]: analyticsApi.reducer,
  [timetableApi.reducerPath]: timetableApi.reducer,
  [calendarApi.reducerPath]: calendarApi.reducer,
  [rotationsApi.reducerPath]: rotationsApi.reducer,
  [paymentApi.reducerPath]: paymentApi.reducer,
  [mentorshipApi.reducerPath]: mentorshipApi.reducer,
  [syllabusApi.reducerPath]: syllabusApi.reducer,
});

type PersistedRootState = ReturnType<typeof rootReducer>;

export const makeStore = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Load any previously persisted RTK Query cache from localStorage.
  // On the browser this lets RTK Query serve cached data immediately after
  // a hard refresh without firing network requests (data < 5 min old).
  // Returns undefined on SSR or when there is no valid cache.
  const preloadedState = loadRtkCache() as Partial<PersistedRootState> | undefined;

  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: isDevelopment ? { warnAfter: 96 } : false,
        serializableCheck: isDevelopment ? { warnAfter: 96 } : false,
      }).concat(
        authApi.middleware,
        tasksApi.middleware,
        categoriesApi.middleware,
        habitsApi.middleware,
        analyticsApi.middleware,
        timetableApi.middleware,
        calendarApi.middleware,
        rotationsApi.middleware,
        paymentApi.middleware,
        mentorshipApi.middleware,
        syllabusApi.middleware
      ),
  });

  // Persist the RTK Query cache to localStorage on every store change (client only).
  // Debounced 1.5 s to avoid thrashing on rapid mutations.
  if (typeof window !== 'undefined') {
    store.subscribe(() => {
      scheduleSaveRtkCache(store.getState() as Record<string, unknown>);
    });
  }

  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
