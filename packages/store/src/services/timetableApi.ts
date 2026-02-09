
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export type Rotation = "A" | "B" | string | null;

export interface Subject {
    id: string;
    name: string;
    code?: string | null;
    teacher?: string | null;
    room?: string | null;
    color: string;
}

export interface TimetableEntry {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectId: string;
    subject: Subject;
    rotation?: string | null;
}

export interface DailySchedule {
    date: string;
    dayOfWeek: number;
    rotation: Rotation;
    entries: TimetableEntry[];
}

export const timetableApi = createApi({
    reducerPath: 'timetableApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${PLANNER_SERVICE_URL}/api/timetable`,
        credentials: 'include',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Timetable'],
    endpoints: (builder) => ({
        getDailySchedule: builder.query<DailySchedule, { date?: string } | void>({
            query: (params) => ({
                url: '/daily',
                method: 'GET',
                params: params || {},
            }),
            providesTags: ['Timetable'],
        }),
    }),
});

export const {
    useGetDailyScheduleQuery,
} = timetableApi;
