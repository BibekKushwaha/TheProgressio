import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export interface MonthlyEvents {
    [date: string]: {
        taskCount: number;
        examCount: number;
    }
}

export interface ScheduleItem {
    id: string;
    type: 'class' | 'task' | 'exam' | 'event';
    title: string;
    subtitle?: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    color?: string;
    subject?: string;
    category?: string;
    location?: string;
    priority?: string;
    status?: string;
    isCompleted?: boolean;
    isRecurring?: boolean;
}

export interface DailyScheduleResponse {
    date: string;
    dayOfWeek: number;
    items: ScheduleItem[];
}

export const calendarApi = createApi({
    reducerPath: 'calendarApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${PLANNER_SERVICE_URL}/api/calendar`,
        credentials: 'include',
    }),
    tagTypes: ['Calendar'],
    endpoints: (builder) => ({
        getMonthlyEvents: builder.query<MonthlyEvents, { month: number; year: number }>({
            query: ({ month, year }) => ({
                url: '/month',
                params: { month, year }
            }),
            providesTags: ['Calendar', { type: 'Calendar', id: 'LIST' }]
        }),
        getCalendarDailySchedule: builder.query<DailyScheduleResponse, { date: string }>({
            query: ({ date }) => ({
                url: '/day',
                params: { date }
            }),
            providesTags: (_result, _error, { date }) => [{ type: 'Calendar', id: date }, { type: 'Calendar', id: 'LIST' }]
        })
    })
});

export const {
    useGetMonthlyEventsQuery,
    useGetCalendarDailyScheduleQuery
} = calendarApi;
