"use client";

import { useId, useMemo } from 'react';
import { Target, Flame } from 'lucide-react';
import {
    useGetDailySummaryQuery,
    useGetDashboardSummaryQuery,
    useGetActiveLiveSessionQuery
} from '@repo/store';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { Skeleton } from '@/components/ui/skeleton';
import { toLocalDateKey, normalizeDateInput } from '@/lib/date';

export function TopStats() {
    const toSafeNumber = (value: unknown, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const isVisible = usePageVisibility();
    const gradientId = useId().replace(/:/g, '');
    const pollMs = isVisible ? 60000 : 0;

    // Enable polling and refetch-on-focus to keep stats fresh
    const {
        data: summaryData,
        isLoading: isSummaryLoading,
        isError: isSummaryError,
    } = useGetDailySummaryQuery("1", {
        pollingInterval: pollMs,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    // BFF replaces useGetFocusScoreQuery: delivers score+breakdown in one call
    // that the dashboard-summary cache (2-min TTL) already has warm.
    // v2 of the BFF also includes activeDates[], eliminating useGetUserStreakQuery.
    const {
        data: dashboardData,
        isLoading: isFocusLoading,
        isError: isDashboardError,
    } = useGetDashboardSummaryQuery(
        { leakageDays: 1, peakDays: 7 },
        {
            pollingInterval: pollMs,
            refetchOnFocus: true,
            refetchOnReconnect: true,
        }
    );

    const { data: activeLive } = useGetActiveLiveSessionQuery(undefined, {
        pollingInterval: isVisible ? 10000 : 0, // fast when visible, pause in background
        refetchOnFocus: true,
    });

    // 1. Calculate Daily Progress
    const stats = summaryData?.stats;
    const activeElapsedMinutes = Math.max(
        0,
        Math.floor(toSafeNumber(activeLive?.session?.elapsedSeconds) / 60)
    );

    const totalMinutes = toSafeNumber(stats?.totalMinutes) + activeElapsedMinutes;
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const dailyGoalHours = Math.max(0.1, toSafeNumber(stats?.dailyGoalHours, 4));
    const progress = Math.max(0, Math.min(100, Math.round((totalHours / dailyGoalHours) * 100)));

    // 2. Focus Score Logic
    const focusScoreStats = dashboardData?.focus;
    const rawFocusScore = toSafeNumber(focusScoreStats?.score);
    const focusScoreNumeric = Math.max(0, Math.min(100, rawFocusScore));
    const displayFocusScore = isFocusLoading ? '—' : focusScoreNumeric.toFixed(1);

    const focusStatus = useMemo(() => {
        if (focusScoreNumeric >= 80) return { label: "Excellent", color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" };
        if (focusScoreNumeric >= 60) return { label: "Good", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" };
        return { label: "Keep going", color: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/30" };
    }, [focusScoreNumeric]);

    const scoreBreakdown = [
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
    ];

    // 3. Streak and History Logic — sourced from BFF (no separate round-trip)
    const currentStreak = Math.max(0, Math.floor(toSafeNumber(dashboardData?.streak)));
    const hasCardError = isSummaryError || isDashboardError;

    const activeDateSet = useMemo(() => {
        const dates = dashboardData?.activeDates || [];
        const set = new Set<string>();
        dates.forEach((d) => {
            if (!d) return;
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
                    const norm = normalizeDateInput(String(val)) || toLocalDateKey(new Date(String(val)));
                    if (norm) set.add(norm);
                }
            }
        });
        return set;
    }, [dashboardData?.activeDates]);

    const historyDots = useMemo(() => {
        return Array.from({ length: 14 }).map((_, i) => {
            const daysAgo = 13 - i; // 0 = 13 days ago, 13 = today
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const key = toLocalDateKey(date);
            const isToday = daysAgo === 0;
            return {
                isActive: activeDateSet.has(key),
                dateKey: key,
                label: isToday ? "Today" : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            };
        });
    }, [activeDateSet]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Goal Card */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Daily Goal</div>
                        <div className="text-3xl font-bold">
                            {isSummaryLoading ? (
                                <Skeleton className="h-9 w-24" />
                            ) : (
                                `${totalHours}h / ${dailyGoalHours}h`
                            )}
                        </div>
                    </div>
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="6"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke={`url(#${gradientId})`}
                                strokeWidth="6"
                                strokeDasharray={`${(progress / 100) * 175.9} 175.9`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                                    <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Target className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </div>
                <div className="text-sm font-semibold text-purple-400">
                    {isSummaryLoading ? <Skeleton className="h-4 w-20" /> : `${progress}% Complete`}
                </div>
                {hasCardError ? <div className="mt-2 text-xs text-amber-300">Some stats are temporarily unavailable.</div> : null}
            </div>

            {/* Focus Score Card */}
            <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Focus Score</div>
                        <div className="text-3xl font-bold">
                            {isFocusLoading ? <Skeleton className="h-9 w-12" /> : displayFocusScore}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-sm text-slate-400">Current Level</div>
                        <span className={`px-3 py-1 ${focusStatus.bg} border ${focusStatus.border} rounded-full text-xs font-semibold ${focusStatus.color}`}>
                            {isFocusLoading ? <Skeleton className="h-4 w-16" /> : focusStatus.label}
                        </span>
                    </div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${focusScoreNumeric}%` }}
                    ></div>
                </div>

                {/* Score Breakdown Overlay */}
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col justify-center gap-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Performance Details</div>
                    <div className="space-y-3">
                        {scoreBreakdown.map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="text-slate-300">{item.label}</span>
                                    <span className={`font-mono ${item.textColor} font-bold`}>{item.value}/{item.max}</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.barColor} transition-all duration-700 delay-100`}
                                        style={{ width: `${item.max > 0 ? Math.min(100, (item.value / item.max) * 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Streak Card */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Active Streak</div>
                        <div className="text-3xl font-bold">
                            {isFocusLoading ? <Skeleton className="h-9 w-12" /> : currentStreak}
                        </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br transition-all duration-500 ${currentStreak > 0 ? "from-orange-500 to-red-500 shadow-lg shadow-orange-500/20" : "from-slate-700 to-slate-800"}`}>
                        <Flame className={`w-6 h-6 ${currentStreak > 0 ? "text-white" : "text-slate-500"}`} />
                    </div>
                </div>
                <div className="text-sm text-slate-400 mb-3">Activity History (14d)</div>
                <div className="flex gap-1.5">
                    {historyDots.map((dot) => (
                        <div
                            key={dot.dateKey}
                            className={`flex-1 h-3 rounded-sm transition-all duration-500 ${dot.isActive
                                ? 'bg-gradient-to-t from-orange-500 to-yellow-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                                : 'bg-white/5'
                                }`}
                            title={`${dot.label}: ${dot.isActive ? 'Active' : 'No activity'}`}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
