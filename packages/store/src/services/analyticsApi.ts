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
} = analyticsApi;
