"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from 'react';
import { TrendingUp, Clock, Target, Award, AlertTriangle, RefreshCcw } from "lucide-react";

import { useGetWeeklyTrendsQuery, useGetDashboardSummaryQuery } from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";
import { getDebugRefetchOptions } from "@/lib/refetchDebug";
import { getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';

// Lazily load recharts — splits the heavy chart bundle into its own chunk
// so it doesn't block the initial route paint.
const ReportsCharts = dynamic(() => import("./ReportsCharts"), {
    ssr: false,
    loading: () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
                <Skeleton key={i} className="h-80 rounded-xl bg-white/5" />
            ))}
        </div>
    ),
});

export default function ReportsPage() {
    // Single BFF call — replaces useGetDailySummaryQuery + useGetFocusScoreQuery
    // + useGetUserStreakQuery. All three data sets are inside dashboardData.
    const {
        data: dashboardData,
        isLoading: isDashLoading,
        isError: isDashError,
        error: dashboardError,
        refetch: refetchDashboard,
    } = useGetDashboardSummaryQuery(
        { leakageDays: 7, peakDays: 30 },
        getDebugRefetchOptions('reports.dashboardSummary', 60000)
    );
    const {
        data: trendsData,
        isLoading: isTrendsLoading,
        isError: isTrendsError,
        error: trendsError,
        refetch: refetchTrends,
    } = useGetWeeklyTrendsQuery(
        undefined,
        getDebugRefetchOptions('reports.weeklyTrends', 60000)
    );

    useEffect(() => {
        if (dashboardError) {
            reportApiError(getApiErrorReportStatus(dashboardError), 'getDashboardSummary', dashboardError);
        }
    }, [dashboardError]);

    useEffect(() => {
        if (trendsError) {
            reportApiError(getApiErrorReportStatus(trendsError), 'getWeeklyTrends', trendsError);
        }
    }, [trendsError]);

    const weeklyData = Array.isArray(trendsData?.data)
        ? trendsData.data.map((item: { day?: string; date?: string; hours?: number; tasks?: number }) => ({
            day: item.day ?? item.date ?? "N/A",
            hours: Number(item.hours ?? 0),
            tasks: Number(item.tasks ?? 0),
        }))
        : [];

    const categoryData = dashboardData?.focus?.breakdown ? [
        { category: "Consistency", value: dashboardData.focus.breakdown.consistency * 2.5 },
        { category: "Intensity", value: dashboardData.focus.breakdown.intensity * 3.3 },
        { category: "Depth", value: dashboardData.focus.breakdown.depth * 3.3 },
        { category: "Efficiency", value: dashboardData.focus.score },
        { category: "Balance", value: 75 },
    ] : [];
    const failedPanels = [
        isDashError && !dashboardData ? 'dashboard summary' : null,
        isTrendsError && !trendsData ? 'weekly trends' : null,
    ].filter((value): value is string => Boolean(value));

    if (isDashLoading || isTrendsLoading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-10 w-1/3 bg-white/5" />
                <Skeleton className="h-6 w-1/2 bg-white/5" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {[1, 2].map(i => <Skeleton key={i} className="h-80 rounded-xl bg-white/5" />)}
                </div>
            </div>
        );
    }

    const weeklyTasksCompleted = weeklyData.reduce(
        (sum: number, day: { tasks?: number }) => sum + (day.tasks || 0),
        0
    );

    const stats = {
        totalHours: Math.round((dashboardData?.focus?.totalMinutes ?? 0) / 60 * 10) / 10,
        tasksCompleted: weeklyTasksCompleted,
        avgFocus: dashboardData?.focus?.avgHoursPerDay ?? 0,
        streak: dashboardData?.streak ?? 0,
    };

    const retryAll = () => {
        void Promise.allSettled([refetchDashboard(), refetchTrends()]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Weekly Progress Analytics Report</h1>
                <p className="text-slate-400">A compact weekly summary you can review quickly or share with someone supporting your progress.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                        href="/analytics/overview"
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                    >
                        Open full analytics
                    </Link>
                    <Link
                        href="/analytics/weekly-review"
                        className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
                    >
                        Continue to weekly review
                    </Link>
                </div>
            </div>

            {failedPanels.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                            <p>
                                This report is using partial data because {failedPanels.join(' and ')} {failedPanels.length === 1 ? 'is' : 'are'} temporarily unavailable.
                            </p>
                        </div>
                        <button
                            onClick={retryAll}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                        >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Retry report
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        <div className="text-sm text-slate-400">Total Hours</div>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalHours}h</div>
                    <div className="text-xs text-slate-400 mt-1">This week</div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="w-5 h-5 text-violet-400" />
                        <div className="text-sm text-slate-400">Tasks Completed</div>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.tasksCompleted}</div>
                    <div className="text-xs text-slate-400 mt-1">This week</div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <div className="text-sm text-slate-400">Avg Daily Focus</div>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.avgFocus}h</div>
                    <div className="text-xs text-slate-400 mt-1">Per day</div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Award className="w-5 h-5 text-orange-400" />
                        <div className="text-sm text-slate-400">Streak Maintained</div>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.streak} Days</div>
                    <div className="text-xs text-orange-400 mt-1">{stats.streak > 0 ? 'Keep it up!' : 'Start your streak today!'}</div>
                </div>
            </div>

            {/* Charts — dynamically loaded to keep recharts out of the initial chunk */}
            {weeklyData.length > 0 || categoryData.length > 0 ? (
                <ReportsCharts weeklyData={weeklyData} categoryData={categoryData} />
            ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-200 backdrop-blur-xl">
                    <h2 className="text-lg font-semibold text-white">Report data is temporarily unavailable</h2>
                    <p className="mt-2 text-sm text-slate-300">
                        We could not load enough weekly data to build the charts right now. Retry the report in a moment.
                    </p>
                </div>
            )}

            {/* Insights */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">Key Insights</h2>
                <div className="space-y-3">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-green-400 font-bold mb-1">
                            <TrendingUp className="w-4 h-4" />
                            Good Work!
                        </div>
                        <p className="text-sm text-slate-300">You&apos;ve logged {stats.totalHours} hours of focused work this week. Keep maintaining your momentum!</p>
                    </div>
                    {stats.tasksCompleted > 0 && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                                <Target className="w-4 h-4" />
                                Peak Productivity
                            </div>
                            <p className="text-sm text-slate-300">You&apos;ve completed {stats.tasksCompleted} tasks successfully. Great job on finishing your goals!</p>
                        </div>
                    )}
                    {stats.streak > 0 && (
                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <Award className="w-4 h-4" />
                                Consistency is Key
                            </div>
                            <p className="text-sm text-slate-300">You&apos;ve maintained a {stats.streak}-day streak. Consistency is the secret to success!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
