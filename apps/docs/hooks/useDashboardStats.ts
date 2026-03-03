/**
 * useDashboardStats — extracted from TopStats.tsx
 *
 * Centralises all dashboard data-fetching and derived value computation that
 * was previously embedded inline inside <TopStats />.  Moving it here means:
 *
 *  1. TopStats becomes a pure UI component that cannot accidentally re-derive
 *     data, making renders cheaper and easier to profile.
 *  2. Other dashboard components (e.g. a future DailyProgressRing) can import
 *     the same hook without duplicating API calls — RTK Query deduplicates the
 *     underlying network requests anyway, but sharing the hook keeps the
 *     derivation logic in one place.
 *  3. Unit tests can exercise streak / date logic without mounting a component.
 */

import { useMemo } from 'react';
import {
    useGetDailySummaryQuery,
    useGetDashboardSummaryQuery,
    useGetActiveLiveSessionQuery,
} from '@repo/store';
import { toLocalDateKey, normalizeDateInput } from '@/lib/date';

function toSafeNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface FocusStatusInfo {
    label: string;
    color: string;
    bg: string;
    border: string;
}

export interface ScoreBreakdownItem {
    label: string;
    value: number;
    max: number;
    textColor: string;
    barColor: string;
}

export interface HistoryDot {
    isActive: boolean;
    dateKey: string;
    label: string;
}

export interface DashboardStats {
    // Loading / error state
    isSummaryLoading: boolean;
    isFocusLoading: boolean;
    hasCardError: boolean;

    // Daily Goal card
    totalHours: number;
    dailyGoalHours: number;
    progress: number;

    // Focus Score card
    displayFocusScore: string;
    focusScoreNumeric: number;
    focusStatus: FocusStatusInfo;
    scoreBreakdown: ScoreBreakdownItem[];

    // Streak / history card
    currentStreak: number;
    historyDots: HistoryDot[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardStats(): DashboardStats {
    const {
        data: summaryData,
        isLoading: isSummaryLoading,
        isError: isSummaryError,
    } = useGetDailySummaryQuery('1');

    const {
        data: dashboardData,
        isLoading: isFocusLoading,
        isError: isDashboardError,
    } = useGetDashboardSummaryQuery({ leakageDays: 1, peakDays: 7 });

    const { data: activeLive } = useGetActiveLiveSessionQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });

    // ── Daily Goal ────────────────────────────────────────────────────────

    const stats = summaryData?.stats;
    const activeElapsedMinutes = Math.max(
        0,
        Math.floor(toSafeNumber(activeLive?.session?.elapsedSeconds) / 60),
    );
    const totalMinutes = toSafeNumber(stats?.totalMinutes) + activeElapsedMinutes;
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const dailyGoalHours = Math.max(0.1, toSafeNumber(stats?.dailyGoalHours, 4));
    const progress = Math.max(
        0,
        Math.min(100, Math.round((totalHours / dailyGoalHours) * 100)),
    );

    // ── Focus Score ───────────────────────────────────────────────────────

    const focusScoreStats = dashboardData?.focus;
    const rawFocusScore = toSafeNumber(focusScoreStats?.score);
    const focusScoreNumeric = Math.max(0, Math.min(100, rawFocusScore));
    const displayFocusScore = isFocusLoading ? '—' : focusScoreNumeric.toFixed(1);

    const focusStatus = useMemo((): FocusStatusInfo => {
        if (focusScoreNumeric >= 80)
            return { label: 'Excellent', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
        if (focusScoreNumeric >= 60)
            return { label: 'Good', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
        return { label: 'Keep going', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30' };
    }, [focusScoreNumeric]);

    const scoreBreakdown = useMemo((): ScoreBreakdownItem[] => [
        {
            label: 'Consistency',
            value: toSafeNumber(focusScoreStats?.breakdown?.consistency),
            max: 40,
            textColor: 'text-indigo-400',
            barColor: 'bg-indigo-500',
        },
        {
            label: 'Intensity',
            value: toSafeNumber(focusScoreStats?.breakdown?.intensity),
            max: 30,
            textColor: 'text-pink-400',
            barColor: 'bg-pink-500',
        },
        {
            label: 'Depth',
            value: toSafeNumber(focusScoreStats?.breakdown?.depth),
            max: 30,
            textColor: 'text-purple-400',
            barColor: 'bg-purple-500',
        },
    ], [focusScoreStats]);

    // ── Streak & History ──────────────────────────────────────────────────

    const activeDateSet = useMemo(() => {
        const dates = dashboardData?.activeDates || [];
        const set = new Set<string>();
        for (const d of dates) {
            if (!d) continue;
            if (typeof d === 'string') {
                const norm = normalizeDateInput(d) || toLocalDateKey(new Date(d));
                if (norm) set.add(norm);
            } else if (typeof d === 'number' || (d as unknown) instanceof Date) {
                const norm = toLocalDateKey(new Date(d as number | Date));
                if (norm) set.add(norm);
            } else if (typeof d === 'object' && d !== null) {
                const obj = d as Record<string, unknown>;
                const val = obj.date || obj.day || obj.value;
                if (val) {
                    const norm =
                        normalizeDateInput(String(val)) || toLocalDateKey(new Date(String(val)));
                    if (norm) set.add(norm);
                }
            }
        }
        return set;
    }, [dashboardData?.activeDates]);

    const fallbackStreakFromDates = useMemo(() => {
        if (activeDateSet.size === 0) return 0;
        const cursor = new Date();
        const todayKey = toLocalDateKey(cursor);
        if (!activeDateSet.has(todayKey)) {
            cursor.setDate(cursor.getDate() - 1);
            if (!activeDateSet.has(toLocalDateKey(cursor))) return 0;
        }
        let streak = 0;
        while (activeDateSet.has(toLocalDateKey(cursor))) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        }
        return streak;
    }, [activeDateSet]);

    const apiStreak = Math.max(0, Math.floor(toSafeNumber(dashboardData?.streak)));
    const currentStreak = Math.max(apiStreak, fallbackStreakFromDates);

    const historyDots = useMemo((): HistoryDot[] => {
        return Array.from({ length: 14 }).map((_, i) => {
            const daysAgo = 13 - i;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const key = toLocalDateKey(date);
            const isToday = daysAgo === 0;
            return {
                isActive: activeDateSet.has(key),
                dateKey: key,
                label: isToday
                    ? 'Today'
                    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            };
        });
    }, [activeDateSet]);

    return {
        isSummaryLoading,
        isFocusLoading,
        hasCardError: isSummaryError || isDashboardError,
        totalHours,
        dailyGoalHours,
        progress,
        displayFocusScore,
        focusScoreNumeric,
        focusStatus,
        scoreBreakdown,
        currentStreak,
        historyDots,
    };
}
