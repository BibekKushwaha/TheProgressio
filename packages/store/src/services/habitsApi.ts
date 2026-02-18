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
    mercyDaysAllowed?: number;
    mercyDaysUsed?: number;
    streakHealth?: 'strong' | 'at_risk' | 'recovering' | 'broken';
    isMercyActive?: boolean;
    linkedCategoryId?: string | null;
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
    mercyDaysAllowed?: number;
    linkedCategoryId?: string | null;
}

export interface UpdateHabitRequest {
    id: string;
    name?: string;
    frequency?: Frequency;
    icon?: string;
    color?: string;
    targetValue?: number;
    mercyDaysAllowed?: number;
    linkedCategoryId?: string | null;
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
    streakHealth?: string;
    mercyDaysUsed?: number;
    isMercyActive?: boolean;
    heatmapData: { date: string; value: number }[];
}

export interface UserXP {
    xp: number;
    level: number;
    levelName: string;
    xpToNextLevel: number;
    progress: number;
    currentLevelXP?: number;
    nextLevelXP?: number;
}

export interface HeatmapDay {
    date: string;
    count: number;
    intensity: 0 | 1 | 2 | 3 | 4;
}

export interface Nudge {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    isRead: boolean;
    scheduledAt: string;
    expiresAt?: string;
    metadata?: Record<string, unknown> | string;
    deepLink?: string;
    progress?: {
        current: number;
        total: number;
        label?: string;
    };
    actions?: Array<{
        id: string;
        label: string;
        actionType: string;
    }>;
    directReplyEnabled?: boolean;
    richMedia?: {
        type: 'IMAGE' | 'GIF' | 'VIDEO';
        url: string;
        sizeMb?: number;
        platform?: 'ANDROID' | 'IOS' | 'WEB';
    };
    createdAt: string;
}

export interface NotificationSettings {
    enabledBuckets: {
        URGENCY_DRIVEN: boolean;
        MORNING_BRIEFING: boolean;
        BEHAVIORAL_NUDGE: boolean;
        ADVANCE_ALERT_3WEEK: boolean;
        TRANSACTION_SYSTEM: boolean;
    };
    quietHours: Array<{ start: string; end: string }>;
    focusProfiles: Array<{ label: string; enabled: boolean; muteNonUrgent: boolean }>;
    groupedSummaries: boolean;
    positiveTone: boolean;
}

export interface MorningBriefing {
    dueTasks: number;
    habitsToComplete: number;
    upcomingExams: Array<{ title: string; daysUntil: number }>;
    streaksAtRisk: Array<{ name: string; currentStreak: number }>;
    conflicts: string[];
}

export const habitsApi = createApi({
    reducerPath: 'habitsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${HABIT_SERVICE_URL}/api/habits`,
        credentials: 'include',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            const shareToken = typeof window !== 'undefined' ? localStorage.getItem('family_share_token') : null;
            if (shareToken) {
                headers.set('x-family-share-token', shareToken);
            }
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
            invalidatesTags: [{ type: 'Habits', id: 'LIST' }, { type: 'Habits', id: 'XP' }],
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        habitsApi.util.updateQueryData('getHabits', undefined, (draft) => {
                            // Add the new habit to the beginning of the list
                            draft.habits.unshift(data.habit);
                        })
                    );
                } catch {
                    /* ignore */
                }
            },
        }),
        updateHabit: builder.mutation<{ message: string; habit: Habit }, UpdateHabitRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Habits', id }, { type: 'Habits', id: 'XP' }],
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
        logHabit: builder.mutation<{ message: string; log?: HabitLog; habit: Habit; streakStatus: string; alreadyLogged?: boolean }, { id: string; completedValue?: number }>({
            query: ({ id, ...body }) => {
                const payload = Object.keys(body).length > 0 ? body : undefined;
                return {
                    url: `/${id}/log`,
                    method: 'POST',
                    ...(payload ? { body: payload } : {}),
                };
            },
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Habits', id }, { type: 'Habits', id: 'XP' }],
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
                } catch {
                    /* ignore */
                }
            },
        }),
        resetHabit: builder.mutation<{ message: string; habit: Habit }, string>({
            query: (id) => ({
                url: `/${id}/reset`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Habits', id }, { type: 'Habits', id: 'XP' }],
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
                } catch {
                    /* ignore */
                }
            },
        }),

        // ── Phase 2: XP & Gamification ─────────────────────────────────────
        getUserXP: builder.query<{ message: string; xp: UserXP }, void>({
            query: () => '/xp',
            providesTags: [{ type: 'Habits', id: 'XP' }],
        }),

        // ── Phase 2: 365-Day Contribution Heatmap ─────────────────────────
        getContributionHeatmap: builder.query<{ message: string; heatmap: HeatmapDay[]; summary: { totalContributions: number; activeDays: number; totalDays: number; consistencyRate: number } }, void>({
            query: () => '/heatmap',
            providesTags: [{ type: 'Habits', id: 'HEATMAP' }],
        }),

        // ── Phase 2: Nudges ────────────────────────────────────────────────
        getNudges: builder.query<{ message: string; nudges: Nudge[] }, boolean | void>({
            query: (unreadOnly) => ({
                url: '/nudges',
                params: unreadOnly ? { unread: 'true' } : {},
            }),
            providesTags: [{ type: 'Habits', id: 'NUDGES' }],
        }),
        markNudgeAsRead: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/nudges/${id}/read`,
                method: 'POST',
            }),
            invalidatesTags: [{ type: 'Habits', id: 'NUDGES' }],
        }),
        markAllNudgesAsRead: builder.mutation<{ message: string }, void>({
            query: () => ({
                url: '/nudges/read-all',
                method: 'POST',
            }),
            invalidatesTags: [{ type: 'Habits', id: 'NUDGES' }],
        }),
        getNudgeSettings: builder.query<{ message: string; settings: NotificationSettings }, void>({
            query: () => '/nudges/settings',
            providesTags: [{ type: 'Habits', id: 'NUDGE_SETTINGS' }],
        }),
        updateNudgeSettings: builder.mutation<
            { message: string; settings: NotificationSettings },
            Partial<NotificationSettings>
        >({
            query: (body) => ({
                url: '/nudges/settings',
                method: 'PUT',
                body,
            }),
            invalidatesTags: [{ type: 'Habits', id: 'NUDGE_SETTINGS' }, { type: 'Habits', id: 'NUDGES' }],
        }),

        // ── Phase 2: Morning Briefing ──────────────────────────────────────
        getMorningBriefing: builder.query<{ message: string; briefing: MorningBriefing }, void>({
            query: () => '/briefing',
            providesTags: [{ type: 'Habits', id: 'BRIEFING' }],
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
    // Phase 2
    useGetUserXPQuery,
    useGetContributionHeatmapQuery,
    useGetNudgesQuery,
    useMarkNudgeAsReadMutation,
    useMarkAllNudgesAsReadMutation,
    useGetNudgeSettingsQuery,
    useUpdateNudgeSettingsMutation,
    useGetMorningBriefingQuery,
} = habitsApi;
