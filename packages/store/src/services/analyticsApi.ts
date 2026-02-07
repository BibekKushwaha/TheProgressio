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
    dailyGoalHours: number;
    remainingHours: number;
    breakdown: Array<{
        type: SessionType;
        minutes: number;
        percentage: number;
    }>;
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
        getWeeklyTrends: builder.query<{ message: string; data: any[] }, void>({
            query: () => '/stats/weekly',
            providesTags: ['Stats'],
        }),
        getTaskEfficiency: builder.query<any, string>({
            query: (taskId) => `/stats/task/${taskId}`,
            providesTags: ['Stats'],
        }),
        getFocusScore: builder.query<any, void>({
            query: () => '/stats/focus',
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
} = analyticsApi;
