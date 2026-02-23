import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { resolveServiceUrl } from '../runtime';

const PLANNER_SERVICE_URL = resolveServiceUrl(
    process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL ?? process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL,
    'http://localhost:4001'
);

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
    rotation?: string | null;
}

export interface DailyScheduleResponse {
    date: string;
    dayOfWeek: number;
    isHoliday?: boolean;
    holidayName?: string | null;
    pauseNotifications?: boolean;
    conflicts?: Array<{
        id: string;
        type: 'CLASS_OVERLAP' | 'EXAM_OVERLAP';
        severity: 'warning' | 'high';
        message: string;
        startsAt: string;
        endsAt: string;
        classEntryIds?: string[];
        examId?: string;
    }>;
    items: ScheduleItem[];
}

export const calendarApi = createApi({
    reducerPath: 'calendarApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${PLANNER_SERVICE_URL}/api/calendar`,
        credentials: 'include',
    }),
    tagTypes: ['Calendar'] as const,
    endpoints: (builder) => ({
        getMonthlyEvents: builder.query<MonthlyEvents, { month: number; year: number }>({
            query: ({ month, year }) => ({
                url: '/month',
                params: { month, year }
            }),
            providesTags: [{ type: 'Calendar', id: 'LIST' }]
        }),
        getCalendarDailySchedule: builder.query<DailyScheduleResponse, { date: string }>({
            query: ({ date }) => ({
                url: '/day',
                params: { date }
            }),
            providesTags: (_result, _error, { date }) => [
                { type: 'Calendar' as const, id: date },
                { type: 'Calendar' as const, id: 'LIST' }
            ]
        }),
        createExam: builder.mutation<{ message: string; exam: any }, any>({
            query: (body) => ({
                url: '/exam',
                method: 'POST',
                body
            }),
            invalidatesTags: [{ type: 'Calendar', id: 'LIST' }]
        })
    })
});

export const {
    useGetMonthlyEventsQuery,
    useGetCalendarDailyScheduleQuery,
    useCreateExamMutation
} = calendarApi;
