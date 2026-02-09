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
            query: (name) => `/stats/subject/${encodeURIComponent(name)}`,
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
        getPredictivePerformance: builder.query<{ message: string; data: LearningPace[] }, string>({
            query: (examType) => `/stats/performance/${examType}`,
            providesTags: ['Stats'],
        }),
    }),
});

export const {
    useLogSessionMutation,
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
    useAddGradeEntryMutation,
    useGetGradeEntriesQuery,
    useDeleteGradeEntryMutation,
    useGetTimeLeakageQuery,
    useGetPeakWindowQuery,
    useGetPredictivePerformanceQuery,
} = analyticsApi;
