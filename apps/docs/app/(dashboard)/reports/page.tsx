"use client";

import React from "react";
import { TrendingUp, Clock, Target, Award } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

import { useGetDailySummaryQuery, useGetWeeklyTrendsQuery, useGetFocusScoreQuery, useGetUserStreakQuery } from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
    const { data: summaryData, isLoading: isSummaryLoading } = useGetDailySummaryQuery('7');
    const { data: trendsData, isLoading: isTrendsLoading } = useGetWeeklyTrendsQuery();
    const { data: focusScoreData, isLoading: isFocusLoading } = useGetFocusScoreQuery();
    const { data: streakData, isLoading: isStreakLoading } = useGetUserStreakQuery();

    const weeklyData = trendsData?.data || [];

    const categoryData = focusScoreData?.stats?.breakdown ? [
        { category: "Consistency", value: focusScoreData.stats.breakdown.consistency * 2.5 }, // Normalize to 100-ish if needed, or just use raw points
        { category: "Intensity", value: focusScoreData.stats.breakdown.intensity * 3.3 },
        { category: "Depth", value: focusScoreData.stats.breakdown.depth * 3.3 },
        { category: "Efficiency", value: focusScoreData.stats.score },
        { category: "Balance", value: 75 }, // Mocked as not available in current API
    ] : [];

    if (isSummaryLoading || isTrendsLoading || isFocusLoading || isStreakLoading) {
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

    const stats = {
        totalHours: summaryData?.stats?.totalHours || 0,
        tasksCompleted: summaryData?.stats?.totalTasksCompleted || 0,
        avgFocus: focusScoreData?.stats?.avgHoursPerDay || 0,
        streak: streakData?.streak || 0
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
                    <div className="text-xs text-green-400 mt-1">+12% from last week</div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="w-5 h-5 text-violet-400" />
                        <div className="text-sm text-slate-400">Tasks Completed</div>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.tasksCompleted}</div>
                    <div className="text-xs text-green-400 mt-1">+8% from last week</div>
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Hours Trend */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Daily Hours Trend</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tasks Completed */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Tasks Completed</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="tasks" fill="url(#taskGradient)" radius={[8, 8, 0, 0]} />
                                <defs>
                                    <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#a855f7" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Performance Radar */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">Performance Overview</h2>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={categoryData}>
                            <PolarGrid stroke="#ffffff20" />
                            <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
                            <PolarRadiusAxis stroke="#94a3b8" fontSize={12} />
                            <Radar name="Performance" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insights */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">Key Insights</h2>
                <div className="space-y-3">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-green-400 font-bold mb-1">
                            <TrendingUp className="w-4 h-4" />
                            Good Work!
                        </div>
                        <p className="text-sm text-slate-300">You've logged {stats.totalHours} hours of focused work this week. Keep maintaining your momentum!</p>
                    </div>
                    {stats.tasksCompleted > 0 && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                                <Target className="w-4 h-4" />
                                Peak Productivity
                            </div>
                            <p className="text-sm text-slate-300">You've completed {stats.tasksCompleted} tasks successfully. Great job on finishing your goals!</p>
                        </div>
                    )}
                    {stats.streak > 0 && (
                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                                <Award className="w-4 h-4" />
                                Consistency is Key
                            </div>
                            <p className="text-sm text-slate-300">You've maintained a {stats.streak}-day streak. Consistency is the secret to success!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
