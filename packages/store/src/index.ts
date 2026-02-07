// Store exports
export { makeStore } from './store';
export type { AppStore, RootState, AppDispatch } from './store';
export { StoreProvider } from './StoreProvider';

// Hooks
export { useAppDispatch, useAppSelector, useAppStore } from './hooks';

// Auth slice
export type { AuthState } from './slices/authSlice';
export {
  setCredentials,
  logout,
  hydrateAuth,
  selectCurrentUser,
  selectIsAuthenticated,
} from './slices/authSlice';
export type { User } from './slices/authSlice';

// Tasks slice
export type { TasksState } from './slices/tasksSlice';
export {
  setTasks,
  addTask,
  removeTask,
  updateTask,
  setTasksLoading,
  setTasksError,
  selectTasks,
  selectTasksLoading,
  selectTasksError,
} from './slices/tasksSlice';

// Auth API
export {
  authApi,
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
} from './services/authApi';
export type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
} from './services/authApi';

// Tasks API
export {
  tasksApi,
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useToggleTaskMutation,
  useCreateSubTaskMutation,
  useUpdateSubTaskMutation,
  useDeleteSubTaskMutation,
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
} from './services/tasksApi';
export type {
  Task,
  SubTask,
  Attachment,
  CreateTaskRequest,
  UpdateTaskRequest,
} from './services/tasksApi';
export type { Status, Priority } from './services/tasksApi';
export { TaskStatus, PriorityEnum } from './services/tasksApi';

// Categories API
export {
  categoriesApi,
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from './services/categoriesApi';
export type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './services/categoriesApi';

// Categories slice
export type { CategoriesState } from './slices/categoriesSlice';
export {
  setCategories,
  addCategory,
  removeCategory,
  updateCategory,
  setCategoriesLoading,
  setCategoriesError,
  selectCategories,
  selectCategoriesLoading,
  selectCategoriesError,
} from './slices/categoriesSlice';

// Habits API
export { Frequency } from './services/habitsApi';
export {
  habitsApi,
  useGetHabitsQuery,
  useGetHabitStatsQuery,
  useCreateHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
  useLogHabitMutation,
  useResetHabitMutation,
} from './services/habitsApi';
export type {
  Habit,
  HabitLog,
  HabitStats,
  CreateHabitRequest,
  UpdateHabitRequest,
} from './services/habitsApi';

// Analytics API
export {
  analyticsApi,
  useLogSessionMutation,
  useGetDailySummaryQuery,
  useGetWeeklyTrendsQuery,
  useGetTaskEfficiencyQuery,
  useGetFocusScoreQuery,
} from './services/analyticsApi';
export type {
  ActivityLog,
  LogSessionRequest,
  DailyStats,
} from './services/analyticsApi';
export { SessionType } from './services/analyticsApi';

