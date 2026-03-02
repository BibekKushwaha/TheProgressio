"use client";

import React from "react";
import dynamic from "next/dynamic";
import { TrendingUp, Clock, Target, Award } from "lucide-react";

import { useGetWeeklyTrendsQuery, useGetDashboardSummaryQuery } from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";
import { getDebugRefetchOptions } from "@/lib/refetchDebug";

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
    const { data: dashboardData, isLoading: isDashLoading } = useGetDashboardSummaryQuery(
        { leakageDays: 7, peakDays: 30 },
        getDebugRefetchOptions('reports.dashboardSummary', 60000)
    );
    const { data: trendsData, isLoading: isTrendsLoading } = useGetWeeklyTrendsQuery(
        undefined,
        getDebugRefetchOptions('reports.weeklyTrends', 60000)
    );

    const weeklyData = trendsData?.data || [];

    const categoryData = dashboardData?.focus?.breakdown ? [
        { category: "Consistency", value: dashboardData.focus.breakdown.consistency * 2.5 },
        { category: "Intensity", value: dashboardData.focus.breakdown.intensity * 3.3 },
        { category: "Depth", value: dashboardData.focus.breakdown.depth * 3.3 },
        { category: "Efficiency", value: dashboardData.focus.score },
        { category: "Balance", value: 75 },
    ] : [];

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Weekly Progress Analytics Report</h1>
                <p className="text-slate-400">Detailed insights into your productivity this week.</p>
            </div>

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
            <ReportsCharts weeklyData={weeklyData} categoryData={categoryData} />

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
