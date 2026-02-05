import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './services/authApi';
import { tasksApi } from './services/tasksApi';
import { categoriesApi } from './services/categoriesApi';
import authReducer from './slices/authSlice';
import tasksReducer from './slices/tasksSlice';
import categoriesReducer from './slices/categoriesSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      tasks: tasksReducer,
      categories: categoriesReducer,
      [authApi.reducerPath]: authApi.reducer,
      [tasksApi.reducerPath]: tasksApi.reducer,
      [categoriesApi.reducerPath]: categoriesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware, tasksApi.middleware, categoriesApi.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
