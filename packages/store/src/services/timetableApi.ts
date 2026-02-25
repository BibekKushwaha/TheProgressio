
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withAuthRefresh, withRetry } from '../baseQuery';
import { resolveServiceUrl } from '../runtime';

const PLANNER_SERVICE_URL = resolveServiceUrl(
    process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL ?? process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL,
    'http://localhost:4001'
);

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

export interface TimetableConflict {
    id: string;
    type: 'CLASS_OVERLAP' | 'EXAM_OVERLAP';
    severity: 'warning' | 'high';
    message: string;
    startsAt: string;
    endsAt: string;
    classEntryIds?: string[];
    examId?: string;
}

export interface SchoolHoliday {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    pauseNotifications: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DailySchedule {
    date: string;
    dayOfWeek: number;
    rotation: Rotation;
    isHoliday: boolean;
    holidayName: string | null;
    pauseNotifications: boolean;
    conflicts: TimetableConflict[];
    entries: TimetableEntry[];
}

export const timetableApi = createApi({
    reducerPath: 'timetableApi',
    baseQuery: withAuthRefresh(withRetry(fetchBaseQuery({
        baseUrl: `${PLANNER_SERVICE_URL}/api/timetable`,
        credentials: 'include',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }))),
    tagTypes: ['Timetable', 'Subjects'],
    endpoints: (builder) => ({
        getDailySchedule: builder.query<DailySchedule, { date?: string } | void>({
            query: (params) => ({
                url: '/daily',
                method: 'GET',
                params: params || {},
            }),
            providesTags: ['Timetable'],
        }),
        // Timetable Entry CRUD
        createTimetableEntry: builder.mutation<TimetableEntry, { dayOfWeek: number; startTime: string; endTime: string; subjectId: string; rotation?: string | null }>({
            query: (body) => ({
                url: '/entries',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Timetable'],
        }),
        updateTimetableEntry: builder.mutation<TimetableEntry, { id: string; dayOfWeek?: number; startTime?: string; endTime?: string; subjectId?: string; rotation?: string | null }>({
            query: ({ id, ...body }) => ({
                url: `/entries/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Timetable'],
        }),
        deleteTimetableEntry: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/entries/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Timetable'],
        }),

        // Subject CRUD
        getSubjects: builder.query<Subject[], void>({
            query: () => ({
                url: '/subjects',
                method: 'GET',
            }),
            providesTags: ['Subjects'],
        }),
        createSubject: builder.mutation<Subject, { name: string; color?: string; room?: string; teacher?: string }>({
            query: (body) => ({
                url: '/subjects',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Subjects'],
        }),
        deleteSubject: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/subjects/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Subjects'],
        }),

        getHolidays: builder.query<{ holidays: SchoolHoliday[] }, void>({
            query: () => ({
                url: '/holidays',
                method: 'GET',
            }),
            providesTags: ['Timetable'],
        }),
        createHoliday: builder.mutation<{ holiday: SchoolHoliday }, { name: string; startDate: string; endDate: string; pauseNotifications?: boolean }>({
            query: (body) => ({
                url: '/holidays',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Timetable'],
        }),
        updateHoliday: builder.mutation<{ message: string }, { id: string; name?: string; startDate?: string; endDate?: string; pauseNotifications?: boolean }>({
            query: ({ id, ...body }) => ({
                url: `/holidays/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Timetable'],
        }),
        deleteHoliday: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/holidays/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Timetable'],
        }),
    }),
});

export const {
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
} = timetableApi;
