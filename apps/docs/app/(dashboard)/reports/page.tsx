"use client";

import React, { useMemo } from "react";
import {
    Award,
    CalendarDays,
    Clock3,
    Sparkles,
    Target,
    TrendingUp,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    useGetDailySummaryQuery,
    useGetFocusScoreQuery,
    useGetUserStreakQuery,
    useGetWeeklyTrendsQuery,
} from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";

type TrendPoint = {
    day: string;
    date?: string;
    hours?: number;
    tasks?: number;
};

const chartTooltipStyle = {
    backgroundColor: "#0f172a",
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: "12px",
    fontSize: "12px",
};

function MetricCard({
    title,
    value,
    hint,
    icon,
}: {
    title: string;
    value: string;
    hint: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                {icon}
                {title}
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{value}</div>
            <p className="mt-1 text-sm text-slate-400">{hint}</p>
        </div>
    );
}

export default function ReportsPage() {
    const { data: summaryData, isLoading: isSummaryLoading } = useGetDailySummaryQuery("7");
    const { data: trendsData, isLoading: isTrendsLoading } = useGetWeeklyTrendsQuery();
    const { data: focusScoreData, isLoading: isFocusLoading } = useGetFocusScoreQuery();
    const { data: streakData, isLoading: isStreakLoading } = useGetUserStreakQuery();

    const isLoading =
        isSummaryLoading || isTrendsLoading || isFocusLoading || isStreakLoading;

    const weeklyData = useMemo(() => {
        const points = (trendsData?.data ?? []) as TrendPoint[];
        return points.map((point) => ({
            day: point.day || "-",
            hours: Number(point.hours ?? 0),
            tasks: Number(point.tasks ?? 0),
        }));
    }, [trendsData?.data]);

    const thisWeekHours = useMemo(
        () => weeklyData.reduce((sum, item) => sum + item.hours, 0),
        [weeklyData]
    );
    const thisWeekTasks = useMemo(
        () => weeklyData.reduce((sum, item) => sum + item.tasks, 0),
        [weeklyData]
    );

    const bestDay = useMemo(() => {
        if (weeklyData.length === 0) return null;
        return weeklyData.reduce((best, current) => {
            if (!best) return current;
            return current.hours > best.hours ? current : best;
        }, weeklyData[0] as { day: string; hours: number; tasks: number } | null);
    }, [weeklyData]);

    const stats = {
        totalHours: Number(summaryData?.stats?.totalHours ?? thisWeekHours ?? 0),
        tasksCompleted: Number(summaryData?.stats?.totalTasksCompleted ?? thisWeekTasks ?? 0),
        avgFocus: Number(focusScoreData?.stats?.avgHoursPerDay ?? 0),
        streak: Number(streakData?.streak ?? 0),
    };

    const focusBreakdown = focusScoreData?.stats?.breakdown;
    const categoryData = focusBreakdown
        ? [
            { category: "Consistency", value: focusBreakdown.consistency },
            { category: "Intensity", value: focusBreakdown.intensity },
            { category: "Depth", value: focusBreakdown.depth },
            { category: "Efficiency", value: Number(focusScoreData?.stats?.score ?? 0) },
            {
                category: "Balance",
                value: Math.min(
                    100,
                    Math.round(((focusScoreData?.stats?.activeDays ?? 0) / 7) * 100)
                ),
            },
        ]
        : [];

    const weeklyTargetHours = Number(summaryData?.stats?.dailyGoalHours ?? 0);
    const weeklyCompletion = weeklyTargetHours
        ? Math.min(100, Math.round((stats.totalHours / weeklyTargetHours) * 100))
        : 0;

    const insights = useMemo(() => {
        const cards: Array<{ title: string; text: string; tone: string }> = [];

        if (stats.totalHours > 0) {
            cards.push({
                title: "Focus Volume",
                text: `You logged ${stats.totalHours} focused hours this week.`,
                tone: "from-cyan-500/20 to-blue-500/10 border-cyan-400/20",
            });
        }

        if (stats.tasksCompleted > 0) {
            cards.push({
                title: "Execution",
                text: `${stats.tasksCompleted} tasks completed. Keep converting plans into finished work.`,
                tone: "from-violet-500/20 to-fuchsia-500/10 border-violet-400/20",
            });
        }

        if (bestDay) {
            cards.push({
                title: "Peak Day",
                text: `${bestDay.day} was your strongest day (${bestDay.hours.toFixed(1)}h focus).`,
                tone: "from-emerald-500/20 to-cyan-500/10 border-emerald-400/20",
            });
        }

        if (stats.streak > 0) {
            cards.push({
                title: "Consistency",
                text: `Current streak is ${stats.streak} day${stats.streak === 1 ? "" : "s"}.`,
                tone: "from-amber-500/20 to-orange-500/10 border-amber-400/20",
            });
        }

        if (cards.length === 0) {
            cards.push({
                title: "Start Logging",
                text: "As soon as sessions and tasks are logged, you will see trend intelligence here.",
                tone: "from-slate-500/20 to-slate-700/10 border-white/10",
            });
        }

        return cards.slice(0, 4);
    }, [bestDay, stats.streak, stats.tasksCompleted, stats.totalHours]);

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-12 w-1/3 bg-white/5" />
                <Skeleton className="h-6 w-2/3 bg-white/5" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />
                    ))}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-80 rounded-2xl bg-white/5" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/[0.12] via-indigo-500/[0.08] to-fuchsia-500/[0.07] p-6 md:p-8">
                <div className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs text-cyan-100 mb-4">
                        <Sparkles className="w-3.5 h-3.5" />
                        Weekly Analytics Report
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                        Progress Intelligence
                    </h1>
                    <p className="mt-2 text-slate-300 max-w-3xl">
                        Track output, focus quality, and consistency trends to plan your next
                        high-impact week.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                            Weekly Goal Completion: {weeklyCompletion}%
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                            Data Window: Last 7 days
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard
                    title="Focused Hours"
                    value={`${stats.totalHours.toFixed(1)}h`}
                    hint={weeklyTargetHours ? `${weeklyCompletion}% of weekly goal` : "Set a weekly goal to track progress"}
                    icon={<Clock3 className="w-4 h-4 text-cyan-300" />}
                />
                <MetricCard
                    title="Tasks Completed"
                    value={`${stats.tasksCompleted}`}
                    hint="Execution velocity this week"
                    icon={<Target className="w-4 h-4 text-violet-300" />}
                />
                <MetricCard
                    title="Avg Daily Focus"
                    value={`${stats.avgFocus.toFixed(1)}h`}
                    hint="Average across active days"
                    icon={<TrendingUp className="w-4 h-4 text-emerald-300" />}
                />
                <MetricCard
                    title="Current Streak"
                    value={`${stats.streak}`}
                    hint="Consecutive active days"
                    icon={<Award className="w-4 h-4 text-amber-300" />}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <h2 className="text-lg font-bold text-white mb-4">Daily Focus Hours</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" vertical={false} />
                                <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Line
                                    type="monotone"
                                    dataKey="hours"
                                    stroke="#22d3ee"
                                    strokeWidth={3}
                                    dot={{ fill: "#22d3ee", r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <h2 className="text-lg font-bold text-white mb-4">Task Throughput</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" vertical={false} />
                                <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Bar dataKey="tasks" fill="url(#tasksGradient)" radius={[8, 8, 0, 0]} />
                                <defs>
                                    <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#a855f7" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <h2 className="text-lg font-bold text-white mb-4">Performance Radar</h2>
                    <div className="h-72">
                        {categoryData.length === 0 ? (
                            <div className="h-full rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center text-sm text-slate-400">
                                Focus score data will appear after a few logged sessions.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={categoryData}>
                                    <PolarGrid stroke="#ffffff20" />
                                    <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
                                    <PolarRadiusAxis stroke="#94a3b8" fontSize={11} />
                                    <Radar
                                        name="Score"
                                        dataKey="value"
                                        stroke="#22d3ee"
                                        fill="#22d3ee"
                                        fillOpacity={0.25}
                                    />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-cyan-300" />
                        Insight Feed
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {insights.map((insight) => (
                            <div
                                key={insight.title}
                                className={`rounded-xl border p-4 bg-gradient-to-br ${insight.tone}`}
                            >
                                <p className="text-sm font-semibold text-white">{insight.title}</p>
                                <p className="mt-1 text-sm text-slate-200">{insight.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
