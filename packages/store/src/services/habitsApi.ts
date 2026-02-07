import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const HABIT_SERVICE_URL = process.env.NEXT_PUBLIC_HABIT_SERVICE_URL || 'http://localhost:4002';

export enum Frequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
}

export interface Habit {
    id: string;
    name: string;
    frequency: Frequency;
    icon?: string;
    color?: string;
    targetValue: number;
    currentStreak: number;
    longestStreak: number;
    lastLogDate: string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
    streakStatus: 'inactive' | 'active' | 'broken';
    logs?: HabitLog[];
}

export interface HabitLog {
    id: string;
    habitId: string;
    completedValue: number;
    loggedAt: string;
}

export interface CreateHabitRequest {
    name: string;
    frequency?: Frequency;
    icon?: string;
    color?: string;
    targetValue?: number;
}

export interface UpdateHabitRequest {
    id: string;
    name?: string;
    frequency?: Frequency;
    icon?: string;
    color?: string;
    targetValue?: number;
}

export interface HabitStats {
    habit: {
        id: string;
        name: string;
        frequency: Frequency;
        targetValue: number;
    };
    currentStreak: number;
    longestStreak: number;
    totalCompletions: number;
    completionRate: number;
    lastLogDate: string | null;
    streakStatus: string;
    heatmapData: { date: string; value: number }[];
}

export const habitsApi = createApi({
    reducerPath: 'habitsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${HABIT_SERVICE_URL}/api/habits`,
        credentials: 'include',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Habits'],
    endpoints: (builder) => ({
        getHabits: builder.query<{ message: string; habits: Habit[] }, void>({
            query: () => ({
                url: '/',
                method: 'GET',
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.habits.map(({ id }) => ({ type: 'Habits' as const, id })),
                        { type: 'Habits', id: 'LIST' },
                    ]
                    : [{ type: 'Habits', id: 'LIST' }],
        }),
        getHabitStats: builder.query<{ message: string; stats: HabitStats }, string>({
            query: (id) => `/${id}/stats`,
            providesTags: (_result, _error, id) => [{ type: 'Habits' as const, id }],
        }),
        createHabit: builder.mutation<{ message: string; habit: Habit }, CreateHabitRequest>({
            query: (body) => ({
                url: '/',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Habits', id: 'LIST' }],
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        habitsApi.util.updateQueryData('getHabits', undefined, (draft) => {
                            // Add the new habit to the beginning of the list
                            draft.habits.unshift(data.habit);
                        })
                    );
                } catch { }
            },
        }),
        updateHabit: builder.mutation<{ message: string; habit: Habit }, UpdateHabitRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Habits', id }],
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    habitsApi.util.updateQueryData('getHabits', undefined, (draft) => {
                        const habit = draft.habits.find((h) => h.id === id);
                        if (habit) {
                            Object.assign(habit, patch);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        deleteHabit: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Habits', id }, { type: 'Habits', id: 'LIST' }],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    habitsApi.util.updateQueryData('getHabits', undefined, (draft) => {
                        draft.habits = draft.habits.filter((h) => h.id !== id);
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        logHabit: builder.mutation<{ message: string; log: HabitLog; habit: Habit; streakStatus: string }, { id: string; completedValue?: number }>({
            query: ({ id, ...body }) => ({
                url: `/${id}/log`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Habits', id }],
            async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        habitsApi.util.updateQueryData('getHabits', undefined, (draft) => {
                            const habitIndex = draft.habits.findIndex((h) => h.id === id);
                            if (habitIndex !== -1) {
                                draft.habits[habitIndex] = data.habit;
                                (draft.habits[habitIndex] as any).streakStatus = data.streakStatus;
                            }
                        })
                    );
                } catch { }
            },
        }),
        resetHabit: builder.mutation<{ message: string; habit: Habit }, string>({
            query: (id) => ({
                url: `/${id}/reset`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Habits', id }],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        habitsApi.util.updateQueryData('getHabits', undefined, (draft) => {
                            const habitIndex = draft.habits.findIndex((h) => h.id === id);
                            if (habitIndex !== -1) {
                                draft.habits[habitIndex] = data.habit;
                                // After reset, status should be updated
                                draft.habits[habitIndex].streakStatus = 'inactive';
                            }
                        })
                    );
                } catch { }
            },
        }),
    }),
});

export const {
    useGetHabitsQuery,
    useGetHabitStatsQuery,
    useCreateHabitMutation,
    useUpdateHabitMutation,
    useDeleteHabitMutation,
    useLogHabitMutation,
    useResetHabitMutation,
} = habitsApi;
