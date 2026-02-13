import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './services/authApi';
import { tasksApi } from './services/tasksApi';
import { categoriesApi } from './services/categoriesApi';
import { habitsApi } from './services/habitsApi';
import { analyticsApi } from './services/analyticsApi';
import { timetableApi } from './services/timetableApi';
import { calendarApi } from './services/calendarApi';
import { rotationsApi } from './services/rotationsApi';
import { paymentApi } from './services/paymentApi';
import authReducer from './slices/authSlice';
import tasksReducer from './slices/tasksSlice';
import categoriesReducer from './slices/categoriesSlice';
import habitsReducer from './slices/habitsSlice';
import analyticsReducer from './slices/analyticsSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
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
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authApi.middleware,
        tasksApi.middleware,
        categoriesApi.middleware,
        habitsApi.middleware,
        analyticsApi.middleware,
        timetableApi.middleware,
        calendarApi.middleware,
        rotationsApi.middleware,
        paymentApi.middleware
      ),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
