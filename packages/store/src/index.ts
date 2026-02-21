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
  useGetProfileQuery,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useMobileLoginMutation,
  useMobileRefreshMutation,
  useMobileLogoutMutation,
  useMobileMeQuery,
  useCreateFamilyLinkMutation,
  useGetFamilyLinksQuery,
  useRevokeFamilyLinkMutation,
  useResolveFamilyLinkQuery,
  useGetWhatsAppPairingCodeQuery,
  useUnpairWhatsAppMutation,
} from './services/authApi';
export type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  MobileAuthResponse,
  FamilyShareLink,
} from './services/authApi';

// Tasks API
export {
  tasksApi,
  useGetTasksQuery,
  useGetTaskMetricsQuery,
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
  useSmartCreateTaskMutation,
  useGenerateSubtasksMutation,
  usePreviewSubtasksMutation,
  useParseTaskMutation,
  useScanSyllabusMutation,
  usePreviewRecoveryPlanMutation,
  useApplyRecoveryPlanMutation,
  useComposeNotificationMutation,
  usePostNotificationDirectReplyMutation,
  useCreateRevisionDripCampaignMutation,
  useTriggerGeofencePingMutation,
  useMarkAttendanceMutation,
  useGetAttendanceHistoryQuery,
  useGetNotificationDeepLinkQuery,
  useGetNotesQuery,
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useGetAuditLogsQuery,
  useSubscribeToPushMutation,
  useUnsubscribeFromPushMutation,
} from './services/tasksApi';
export type {
  Task,
  TaskMetrics,
  SubTask,
  Attachment,
  CreateTaskRequest,
  UpdateTaskRequest,
  SyllabusScanItem,
  RecoveryPlan,
  RecoveryPlanItem,
  ComposeNotificationRequest,
  PlannerNotification,
  Note,
  AuditLog,
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
  useGetUserXPQuery,
  useCreateHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
  useLogHabitMutation,
  useResetHabitMutation,
  // Phase 2: Heatmap & Gamification
  useGetContributionHeatmapQuery,
  // Nudges & Notifications
  useGetNudgesQuery,
  useMarkNudgeAsReadMutation,
  useMarkAllNudgesAsReadMutation,
  useGetNudgeSettingsQuery,
  useUpdateNudgeSettingsMutation,
  useGetMorningBriefingQuery,
} from './services/habitsApi';
export type {
  Habit,
  HabitLog,
  HabitStats,
  UserXP,
  HeatmapDay,
  Nudge,
  NotificationSettings,
  MorningBriefing,
  CreateHabitRequest,
  UpdateHabitRequest,
} from './services/habitsApi';

// Analytics API
export {
  analyticsApi,
  useLogSessionMutation,
  useGetActiveLiveSessionQuery,
  useStartLiveSessionMutation,
  usePauseLiveSessionMutation,
  useResumeLiveSessionMutation,
  useHeartbeatLiveSessionMutation,
  useStopLiveSessionMutation,
  useGetDailySummaryQuery,
  useGetWeeklyTrendsQuery,
  useGetTaskEfficiencyQuery,
  useGetFocusScoreQuery,
  useGetUserStreakQuery,
  useGetAchievementsQuery,
  // Phase 3: Advanced Analytics
  useGetPredictionQuery,
  usePredictGradeMutation,
  useGetCycleTimeQuery,
  useGetSWOTReportQuery,
  useGetSubjectPerformanceQuery,
  useGetAllSubjectPerformanceQuery,
  useGetGPAQuery,
  useAddCourseGradeMutation,
  useUpdateCourseGradeMutation,
  useDeleteCourseGradeMutation,
  useWhatIfGPAMutation,
  usePreviewGPAComponentsMutation,
  useGetGradeEntriesQuery,
  useAddGradeEntryMutation,
  useDeleteGradeEntryMutation,
  useGetTimeLeakageQuery,
  useGetPeakWindowQuery,
  useGetPredictivePerformanceQuery,
  useGetNotificationIntelligenceQuery,
  useGetNotificationContextSignalsQuery,
  useGetRevisionScheduleQuery,
  useGetDashboardSummaryQuery,
  useGetStrategicSummaryQuery,
} from './services/analyticsApi';
export type {
  ActivityLog,
  LogSessionRequest,
  FocusLiveStatus,
  FocusLiveSession,
  StartLiveSessionRequest,
  LiveSessionSignalRequest,
  HeartbeatLiveSessionRequest,
  StopLiveSessionRequest,
  DailyStats,
  SubjectPerformance,
  Achievement,
  // Phase 3 Types
  CGPAResult,
  WhatIfResult,
  PredictiveDataQuality,
  FullSWOT,
  DurationPrediction,
  TimeLeakageReport,
  PeakProductivityResult,
  LearningPace,
  CycleTimeData,
  CourseGrade,
  GradeEntry,
  GPAComponentInput,
  GPAComponentPreview,
  NotificationIntelligence,
  NotificationContextSignals,
  RevisionScheduleResponse,
  DashboardSummaryResponse,
  DashboardFocusStats,
  StrategicSummaryResponse,
} from './services/analyticsApi';
export { SessionType } from './services/analyticsApi';

// Timetable API
export {
  timetableApi,
  useGetDailyScheduleQuery,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useCreateTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
  useDeleteTimetableEntryMutation,
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
} from './services/timetableApi';
export type {
  TimetableEntry,
  TimetableConflict,
  SchoolHoliday,
  DailySchedule,
  Subject,
} from './services/timetableApi';

// Calendar API
export {
  calendarApi,
  useGetMonthlyEventsQuery,
  useGetCalendarDailyScheduleQuery,
  useCreateExamMutation,
} from './services/calendarApi';
export type {
  MonthlyEvents,
  ScheduleItem,
  DailyScheduleResponse,
} from './services/calendarApi';

// Rotations API
export {
  rotationsApi,
  useGetRotationPatternsQuery,
  useGetRotationPatternByIdQuery,
  useResolveRotationQuery,
  useCreateRotationPatternMutation,
  useUpdateRotationPatternMutation,
  useDeleteRotationPatternMutation,
} from './services/rotationsApi';
export type {
  RotationPattern,
  CreateRotationRequest,
  UpdateRotationRequest,
  ResolvedRotation,
} from './services/rotationsApi';

// Payment API
export {
  paymentApi,
  useGetBillingProfileQuery,
  useCreatePaymentIntentMutation,
  useCreateUpiCollectMutation,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useGetSubscriptionStatusQuery,
  useCancelSubscriptionMutation,
  useGetPaymentHistoryQuery,
} from './services/paymentApi';
export type {
  BillingPlan,
  BillingStatus,
  PaymentProvider,
  BillingProfile,
  PaymentIntent,
  UpiCollectResponse,
  PlanId,
  PaymentMethod,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  SubscriptionStatus,
  PaymentRecord,
} from './services/paymentApi';



// Analytics slice
export type { AnalyticsState } from './slices/analyticsSlice';
export {
  setDailyStats,
  setFocusScore,
  setStreak,
  setAchievements,
  setPastDays,
  setAnalyticsLoading,
  setAnalyticsError,
  selectDailyStats,
  selectFocusScore,
  selectStreak,
  selectAchievements,
  selectPastDays,
  selectAnalyticsLoading,
  selectAnalyticsError,
} from './slices/analyticsSlice';

// ─── Local-First Persistence (IndexedDB) ────────────────────────────────────────
export {
  localDb,
  localTasks,
  localCategories,
  syncQueue,
  clearLocalData,
} from './local-db';
export type {
  LocalTask,
  LocalCategory,
  LocalSubTask,
  LocalAttachment,
  SyncQueueItem,
  SyncAction,
} from './local-db';

export { syncEngine } from './sync-engine';

export {
  useSyncStatus,
  useLocalTasks,
  useLocalCategories,
  useLocalDbHydration,
  usePendingSyncCount,
  useClearLocalData,
} from './use-local-db';
