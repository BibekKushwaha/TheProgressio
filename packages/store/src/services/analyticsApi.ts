import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const ANALYTICS_SERVICE_URL = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:4003';

export enum SessionType {
    DEEP_WORK = 'DEEP_WORK',
    POMODORO = 'POMODORO',
    BREAK = 'BREAK',
}

export interface ActivityLog {
    id: string;
    startTime: string;
    endTime?: string | null;
    durationMinutes: number;
    sessionType: SessionType;
    taskId: string;
}

export interface LogSessionRequest {
    taskId: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    sessionType?: SessionType;
}

export type FocusLiveStatus = 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface FocusLiveSession {
    sessionId: string;
    userId: string;
    taskId: string;
    taskTitle: string;
    sessionType: SessionType;
    status: FocusLiveStatus;
    plannedDurationMinutes: number;
    elapsedSeconds: number;
    remainingSeconds: number;
    startedAt: string;
    pausedAt?: string;
    resumedAt?: string;
    endedAt?: string;
    lastHeartbeatAt: string;
    deviceId?: string;
    source?: string;
    recommendedStart?: string;
    recommendedEnd?: string;
}

export interface StartLiveSessionRequest {
    taskId: string;
    taskTitle?: string;
    plannedDurationMinutes: number;
    sessionType?: SessionType;
    deviceId?: string;
    source?: string;
    recommendedStart?: string;
    recommendedEnd?: string;
}

export interface LiveSessionSignalRequest {
    sessionId: string;
    deviceId?: string;
}

export interface HeartbeatLiveSessionRequest extends LiveSessionSignalRequest {
    remainingSeconds?: number;
}

export interface StopLiveSessionRequest extends LiveSessionSignalRequest {
    outcome?: 'COMPLETED' | 'CANCELLED';
}

export interface DailyStats {
    totalMinutes: number;
    totalHours: number;
    totalTasksCompleted: number;
    dailyGoalHours: number;
    remainingHours: number;
    breakdown: Array<{
        type: SessionType;
        minutes: number;
        percentage: number;
    }>;
}

export interface FocusScoreBreakdown {
    consistency: number;
    intensity: number;
    depth: number;
}

export interface FocusScoreStats {
    score: number;
    breakdown: FocusScoreBreakdown;
    totalSessions: number;
    totalMinutes: number;
    activeDays: number;
    avgHoursPerDay: number;
}

export interface Achievement {
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    type: string;
    goalValue: number;
    unlocked: boolean;
    progress: number;
    unlockedAt?: string;
}

// ── Phase 3 Types ──────────────────────────────────────────────────────

export interface DurationPrediction {
    optimistic: number;
    probable: number;
    pessimistic: number;
    expected: number;
    standardDeviation: number;
    confidence: string;
    sampleSize: number;
}

export interface CycleTimeData {
    p50: number;
    p85: number;
    p95: number;
    scatterData: Array<{ completedAt: string; durationMinutes: number }>;
}

export interface SWOTSubject {
    subject: string;
    strengths: Array<{ chapter: string; score: number }>;
    weaknesses: Array<{ chapter: string; score: number }>;
    opportunities: Array<{ chapter: string; score: number; reason: string }>;
    threats: Array<{ chapter: string; score: number; reason: string }>;
}

export interface FullSWOT {
    examType: string;
    subjects: SWOTSubject[];
    overallReadiness: number;
    topPriorityChapters: string[];
}

export interface CGPAResult {
    cgpa: number;
    totalCredits: number;
    semesterBreakdown: Array<{ semester: number; gpa: number; credits: number }>;
    courses: Array<{ courseName: string; credits: number; gradePoint: number; grade?: string; semester?: number }>;
}

export interface WhatIfResult {
    currentCGPA: number;
    targetCGPA: number;
    requiredGPA: number;
    achievable: boolean;
    strategy: string;
}

export interface TimeLeakageReport {
    periodDays: number;
    totalPlannedMinutes: number;
    totalActualMinutes: number;
    totalLeakageMinutes: number;
    leakagePercentage: number;
    dailyBreakdown: Array<{ date: string; plannedMinutes: number; actualMinutes: number; leakageMinutes: number; leakagePercent: number }>;
    worstDays: Array<{ date: string; leakagePercent: number }>;
    suggestion: string;
}

export interface PeakProductivityResult {
    peakWindow: { startHour: number; endHour: number; label: string };
    efficiencyByHour: Array<{ hour: number; avgMinutes: number; sessionCount: number; avgFocusRatio: number }>;
    recommendation: string;
    efficiencyBoostPercent: number;
}

export interface GradeEntry {
    id: string;
    subjectName: string;
    chapter?: string;
    totalMarks: number;
    obtainedMarks: number;
    examType: string;
    timeTakenMins?: number;
    createdAt: string;
}

export interface CourseGrade {
    id: string;
    courseName: string;
    credits: number;
    gradePoint: number;
    grade?: string;
    semester?: number;
}

export interface LearningPace {
    subjectName: string;
    recentScoreAvg: number;
    historicalScoreAvg: number;
    improvementRate: number;
    pace: "accelerating" | "steady" | "declining";
    estimatedExamScore: number;
    estimatedPercentile: number;
    simulationRuns: number;
    scoreDistribution: Array<{ score: number; probability: number; count: number }>;
    rankBands: Array<{ label: string; probability: number; minPercentile: number; maxPercentile: number }>;
    confidenceInterval: { lower: number; upper: number; level: number };
    assumptions: string[];
    confidence: "low" | "medium" | "high";
    modelVersion: string;
    dataQuality: "low" | "medium" | "high";
}

export interface PredictiveDataQuality {
    label: 'low' | 'medium' | 'high';
}

export interface GPAComponentInput {
    name: string;
    weight: number;
    obtainedMarks: number;
    totalMarks: number;
}

export interface GPAComponentPreview {
    weightedPercentage: number;
    weightedGradePoint: number;
    scale: 'INDIA_10' | 'US_4' | 'PERCENTAGE';
}

export interface NotificationIntelligence {
    bestSendHourLocal: number;
    bestSendWindow: string;
    topActiveWeekday: number;
    expectedOpenRateLiftPct: number;
    confidence: 'low' | 'medium' | 'high';
    sampleSize: number;
}

export interface NotificationContextSignals {
    userId: string;
    screenActive: boolean;
    suppressNonUrgent: boolean;
    motionState: string;
    brightness: number | null;
    locationTag: string | null;
    geoRecommendation: string | null;
}

export const analyticsApi = createApi({
    reducerPath: 'analyticsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${ANALYTICS_SERVICE_URL}/api`,
        credentials: 'include',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Activity', 'Stats'],
    endpoints: (builder) => ({
        logSession: builder.mutation<{ message: string; log: ActivityLog }, LogSessionRequest>({
            query: (body) => ({
                url: '/activity/log',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Activity', 'Stats'],
        }),
        getActiveLiveSession: builder.query<{ message: string; session: FocusLiveSession | null }, void>({
            query: () => '/activity/live/active',
            providesTags: ['Activity'],
        }),
        startLiveSession: builder.mutation<{ message: string; session: FocusLiveSession }, StartLiveSessionRequest>({
            query: (body) => ({
                url: '/activity/live/start',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Activity', 'Stats'],
        }),
        pauseLiveSession: builder.mutation<{ message: string; session: FocusLiveSession }, LiveSessionSignalRequest>({
            query: (body) => ({
                url: '/activity/live/pause',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Activity', 'Stats'],
        }),
        resumeLiveSession: builder.mutation<{ message: string; session: FocusLiveSession }, LiveSessionSignalRequest>({
            query: (body) => ({
                url: '/activity/live/resume',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Activity', 'Stats'],
        }),
        heartbeatLiveSession: builder.mutation<{ message: string; session: FocusLiveSession }, HeartbeatLiveSessionRequest>({
            query: (body) => ({
                url: '/activity/live/heartbeat',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Activity'],
        }),
        stopLiveSession: builder.mutation<{ message: string; session: FocusLiveSession; log?: ActivityLog }, StopLiveSessionRequest>({
            query: (body) => ({
                url: '/activity/live/stop',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Activity', 'Stats'],
        }),
        getDailySummary: builder.query<{ message: string; stats: DailyStats }, string | void>({
            query: (days) => ({
                url: '/stats/daily',
                params: { days: days || '1' }
            }),
            providesTags: ['Stats'],
        }),
        getWeeklyTrends: builder.query<{ message: string; data: any[] }, string | void>({
            query: (taskId) => ({
                url: '/stats/weekly',
                params: taskId ? { taskId } : {},
            }),
            providesTags: ['Stats'],
        }),
        getTaskEfficiency: builder.query<any, string>({
            query: (taskId) => `/stats/task/${taskId}`,
            providesTags: ['Stats'],
        }),
        getFocusScore: builder.query<{ message: string; stats: FocusScoreStats }, void>({
            query: () => '/stats/focus',
            providesTags: ['Stats'],
        }),
        getUserStreak: builder.query<{ streak: number; activeDates: string[] }, void>({
            query: () => '/stats/streak',
            providesTags: ['Stats'],
        }),
        getAchievements: builder.query<{ message: string; achievements: Achievement[] }, void>({
            query: () => '/stats/achievements',
            providesTags: ['Stats'],
        }),

        // ── Phase 3: Duration Prediction (PERT) ───────────────────────────
        getPrediction: builder.query<{ message: string; prediction: DurationPrediction }, { categoryId?: string; subject?: string; taskId?: string } | void>({
            query: (params) => ({
                url: '/stats/predict',
                params: params || {},
            }),
            providesTags: ['Stats'],
        }),
        getCycleTime: builder.query<{ message: string; data: CycleTimeData }, { categoryId?: string; subject?: string } | void>({
            query: (params) => ({
                url: '/stats/cycle-time',
                params: params || {},
            }),
            providesTags: ['Stats'],
        }),

        // ── Phase 3: SWOT Analysis ────────────────────────────────────────
        getSWOTAnalysis: builder.query<{ message: string; swot: FullSWOT }, string>({
            query: (examType) => `/stats/swot/${examType}`,
            providesTags: ['Stats'],
        }),
        getSubjectPerformance: builder.query<{ message: string; data: any }, string>({
            query: (name) => {
                const safeName = name?.trim() || 'Mathematics';
                return `/stats/subject/${encodeURIComponent(safeName)}`;
            },
            providesTags: ['Stats'],
        }),

        // ── Phase 3: GPA Calculator ───────────────────────────────────────
        getGPA: builder.query<{ message: string; result: CGPAResult }, string | void>({
            query: (scale) => ({
                url: '/stats/gpa',
                params: scale ? { scale } : {},
            }),
            providesTags: ['Stats'],
        }),
        whatIfGPA: builder.mutation<{ message: string; result: WhatIfResult }, { targetCGPA: number; remainingCredits: number; scale?: string }>({
            query: (body) => ({
                url: '/stats/gpa/what-if',
                method: 'POST',
                body,
            }),
        }),
        previewGPAComponents: builder.mutation<
            { message: string; result: GPAComponentPreview },
            { scale: 'INDIA_10' | 'US_4' | 'PERCENTAGE'; components: GPAComponentInput[] }
        >({
            queryFn: async ({ scale, components }) => {
                const normalized = components
                    .map((component) => ({
                        name: component.name,
                        weight: Number.isFinite(component.weight) ? component.weight : 0,
                        obtainedMarks: Number.isFinite(component.obtainedMarks) ? component.obtainedMarks : 0,
                        totalMarks: Number.isFinite(component.totalMarks) ? component.totalMarks : 0,
                    }))
                    .filter((component) => component.totalMarks > 0 && component.weight > 0);

                if (normalized.length === 0) {
                    return {
                        data: {
                            message: 'No valid components provided',
                            result: {
                                weightedPercentage: 0,
                                weightedGradePoint: 0,
                                scale,
                            },
                        },
                    };
                }

                const totalWeight = normalized.reduce((sum, component) => sum + component.weight, 0);
                const weightedPercentage = normalized.reduce((sum, component) => {
                    const percentage = Math.max(0, Math.min(100, (component.obtainedMarks / component.totalMarks) * 100));
                    return sum + percentage * (component.weight / totalWeight);
                }, 0);

                const weightedGradePoint =
                    scale === 'US_4'
                        ? (weightedPercentage / 100) * 4
                        : scale === 'PERCENTAGE'
                            ? weightedPercentage
                            : (weightedPercentage / 100) * 10;

                return {
                    data: {
                        message: 'Weighted GPA preview generated',
                        result: {
                            weightedPercentage,
                            weightedGradePoint,
                            scale,
                        },
                    },
                };
            },
        }),
        addCourseGrade: builder.mutation<{ message: string; course: CourseGrade }, Partial<CourseGrade>>({
            query: (body) => ({
                url: '/stats/gpa/course',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Stats'],
        }),
        updateCourseGrade: builder.mutation<{ message: string; course: CourseGrade }, { id: string } & Partial<CourseGrade>>({
            query: ({ id, ...body }) => ({
                url: `/stats/gpa/course/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Stats'],
        }),
        deleteCourseGrade: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/stats/gpa/course/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Stats'],
        }),

        // ── Phase 3: Grade Entries ─────────────────────────────────────────
        addGradeEntry: builder.mutation<{ message: string; entry: GradeEntry }, Partial<GradeEntry>>({
            query: (body) => ({
                url: '/stats/grade-entry',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Stats'],
        }),
        getGradeEntries: builder.query<{ message: string; entries: GradeEntry[] }, { examType?: string; subject?: string } | void>({
            query: (params) => ({
                url: '/stats/grade-entries',
                params: params || {},
            }),
            providesTags: ['Stats'],
        }),
        deleteGradeEntry: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/stats/grade-entry/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Stats'],
        }),

        // ── Phase 3: Focus & Time Leakage ─────────────────────────────────
        getTimeLeakage: builder.query<{ message: string; report: TimeLeakageReport }, number | void>({
            query: (days) => ({
                url: '/stats/focus/leakage',
                params: days ? { days: String(days) } : {},
            }),
            providesTags: ['Stats'],
        }),
        getPeakWindow: builder.query<{ message: string; data: PeakProductivityResult }, number | void>({
            query: (days) => ({
                url: '/stats/focus/peak-window',
                params: days ? { days: String(days) } : {},
            }),
            providesTags: ['Stats'],
        }),
        getPredictivePerformance: builder.query<
            { message: string; modelVersion?: string; data: LearningPace[] },
            string | { examType: string; runs?: number; seed?: number }
        >({
            query: (arg) => {
                const examType = typeof arg === 'string' ? arg : arg.examType;
                const safeExamType = examType?.trim() || 'midterm';
                const queryArg = typeof arg === 'string' ? undefined : arg;

                return {
                    url: `/stats/performance/${encodeURIComponent(safeExamType)}`,
                    params: queryArg
                        ? {
                            ...(queryArg.runs ? { runs: String(queryArg.runs) } : {}),
                            ...(queryArg.seed !== undefined ? { seed: String(queryArg.seed) } : {}),
                        }
                        : {},
                };
            },
            providesTags: ['Stats'],
        }),
        getNotificationIntelligence: builder.query<{ message: string; intelligence: NotificationIntelligence }, void>({
            query: () => '/stats/notifications/intelligence',
            providesTags: ['Stats'],
        }),
        getNotificationContextSignals: builder.query<
            { message: string; context: NotificationContextSignals },
            { brightness?: number; motionState?: 'STATIONARY' | 'WALKING' | 'IN_TRANSIT'; locationTag?: 'LIBRARY' | 'CAMPUS' | 'HOME' | 'COACHING_CENTER' } | void
        >({
            query: (params) => ({
                url: '/stats/notifications/context',
                params: params || {},
            }),
            providesTags: ['Stats'],
        }),
    }),
});

export const {
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
    // Phase 3
    useGetPredictionQuery,
    useGetCycleTimeQuery,
    useGetSWOTAnalysisQuery,
    useGetSubjectPerformanceQuery,
    useGetGPAQuery,
    useWhatIfGPAMutation,
    useAddCourseGradeMutation,
    useUpdateCourseGradeMutation,
    useDeleteCourseGradeMutation,
    usePreviewGPAComponentsMutation,
    useAddGradeEntryMutation,
    useGetGradeEntriesQuery,
    useDeleteGradeEntryMutation,
    useGetTimeLeakageQuery,
    useGetPeakWindowQuery,
    useGetPredictivePerformanceQuery,
    useGetNotificationIntelligenceQuery,
    useGetNotificationContextSignalsQuery,
} = analyticsApi;
